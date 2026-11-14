#!/usr/bin/env bash
# Validates a deployed Turnstile siteverify Worker end-to-end.
#
# Reads:
#   $CLOUDFLARE_API_TOKEN (required for hostname check)
#
# Args:
#   --worker-url <url>     Deployed Worker URL (from worker-deploy.sh)
#   --account-id <id>      Cloudflare account ID
#   --sitekey <key>        Widget sitekey (from widget-create.sh)
#   --expected-domains <a,b,c>  Comma-separated domains that must appear in the widget's domains array
#
# Env:
#   CF_API_BASE  Cloudflare API base URL (default https://api.cloudflare.com/client/v4);
#                overridden only by tests.
#
# Requires jq. Every JSON check is a jq predicate, never a text grep: the
# template Worker pretty-prints its JSON (`"ok": true`, with a space), and
# jq's `//` treats `false` as missing, so `.success // "missing"` can never
# yield "false".
#
# Outputs JSON. Exit 0 if all three checks pass, 1 otherwise.
#   ok:    {"status":"ok"}
#   fail:  {"status":"error","check":"health|dummy_siteverify|worker_metadata|hostname","detail":"<msg>"}

set -uo pipefail

while [[ $# -gt 0 ]]; do
  case $1 in
    --worker-url)       WORKER_URL="$2"; shift 2 ;;
    --account-id)       ACCOUNT_ID="$2"; shift 2 ;;
    --sitekey)          SITEKEY="$2"; shift 2 ;;
    --expected-domains) EXPECTED_DOMAINS="$2"; shift 2 ;;
    *) echo "validate: unknown arg $1" >&2; exit 2 ;;
  esac
done

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN must be set}"
: "${WORKER_URL:?--worker-url required}"
: "${ACCOUNT_ID:?--account-id required}"
: "${SITEKEY:?--sitekey required}"
: "${EXPECTED_DOMAINS:?--expected-domains required}"
CF_API_BASE="${CF_API_BASE:-https://api.cloudflare.com/client/v4}"

if ! command -v jq >/dev/null 2>&1; then
  echo "validate: jq is required" >&2
  echo '{"status":"error","check":"prerequisites","detail":"jq not found"}'
  exit 1
fi

# Check 1: health endpoint
health=$(curl -sSf "${WORKER_URL}/health" 2>/dev/null || echo "")
if ! printf '%s' "$health" | jq -e '.ok == true' >/dev/null 2>&1; then
  echo "validate: health check failed; $WORKER_URL/health did not return {ok:true,version:...}" >&2
  echo "{\"status\":\"error\",\"check\":\"health\",\"detail\":\"worker /health did not respond ok:true\"}"
  exit 1
fi

# Check 2: dummy siteverify; should return success:false + error-codes array
dummy=$(curl -sS -X POST "${WORKER_URL}/" \
  -H "Content-Type: application/json" \
  -d '{"token":"XXXX.DUMMY.TOKEN.XXXX"}' 2>/dev/null || echo "")

if ! printf '%s' "$dummy" | jq -e \
    '.success == false and (.["error-codes"] | type == "array" and length > 0)' >/dev/null 2>&1; then
  echo "validate: dummy siteverify check failed; expected success:false + error-codes; got: $dummy" >&2
  echo "{\"status\":\"error\",\"check\":\"dummy_siteverify\",\"detail\":\"unexpected response shape\"}"
  exit 1
fi

# Check 2b: confirm the Worker is the managed template (not a customer-written
# replacement) by looking for the _worker metadata field. If absent, the user
# deployed a custom Worker; surface it so the agent can alert them.
if ! printf '%s' "$dummy" | jq -e '._worker.worker_version | type == "string" and length > 0' >/dev/null 2>&1; then
  echo "validate: _worker metadata missing from response; this is not the managed Spin Worker template." >&2
  echo "{\"status\":\"error\",\"check\":\"worker_metadata\",\"detail\":\"_worker field missing; user may have deployed a custom Worker\"}"
  exit 1
fi

# Check 3: hostname / widget domains registered
widget=$(curl -sS \
  "$CF_API_BASE/accounts/$ACCOUNT_ID/challenges/widgets/$SITEKEY" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" 2>/dev/null)
if ! registered=$(printf '%s' "$widget" | jq -r '.result.domains | if type == "array" then .[] else error("no domains") end' 2>/dev/null); then
  echo "validate: could not read the widget's domains; got: $widget" >&2
  echo "{\"status\":\"error\",\"check\":\"hostname\",\"detail\":\"widget domains unreadable\"}"
  exit 1
fi

missing=""
IFS=',' read -ra DOMS <<< "$EXPECTED_DOMAINS"
for d in "${DOMS[@]}"; do
  if ! echo "$registered" | grep -qFx "$d"; then
    missing="${missing}${d} "
  fi
done

if [ -n "$missing" ]; then
  echo "validate: hostname check failed; domains not on widget: $missing" >&2
  echo "{\"status\":\"error\",\"check\":\"hostname\",\"detail\":\"missing domains: ${missing% }\"}"
  exit 1
fi

echo '{"status":"ok"}'
