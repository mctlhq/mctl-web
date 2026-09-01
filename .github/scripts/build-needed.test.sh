#!/usr/bin/env bash
#
# Tests for build-needed.sh. Run by the build job itself, so the required check
# validates its own decision logic before acting on it.

set -uo pipefail

script="$(dirname "$0")/build-needed.sh"
fails=0

check() {
  local name="$1" want="$2" input="$3"
  local got
  got=$(printf '%s' "$input" | bash "$script")
  if [ "$got" = "$want" ]; then
    printf '  ok    %-52s -> %s\n' "$name" "$got"
  else
    printf '  FAIL  %-52s -> %s (want %s)\n' "$name" "$got" "$want"
    fails=$((fails + 1))
  fi
}

echo "build-needed.sh:"

check "worker only" false 'cloudflare-worker/index.js
cloudflare-worker/turnstile.test.mjs'

check "worker + app" true 'cloudflare-worker/index.js
app/composables/useTeamValidation.ts'

check "app only" true 'app/pages/index.vue'

check "Dockerfile" true 'Dockerfile'

check "workflow only" true '.github/workflows/build.yml'

# An empty list must build, never skip: a failure to produce the list would
# otherwise look exactly like a successful required check.
check "empty list builds" true ''

# ^cloudflare-worker/ requires the separator, matching what the old
# paths-ignore glob did — a sibling directory is not the worker.
check "sibling dir cloudflare-worker-docs" true 'cloudflare-worker-docs/readme.md'

# Regression, agy on #93. With grep -qv under pipefail, grep exits at the first
# match while the producer is still writing; past the pipe buffer the producer
# takes SIGPIPE (141), pipefail propagates it, and the decision inverts to
# "skip" for a PR that changes core files. The out-of-scope entry is first on
# purpose — that is what makes grep exit early.
big=".github/workflows/build.yml"
for i in $(seq 1 4000); do
  big="${big}
cloudflare-worker/some/deeply/nested/path/to/file-number-${i}-with-padding.js"
done
check "300KB list, out-of-scope first (SIGPIPE)" true "$big"

# Same list without the out-of-scope entry must still skip, so the case above
# is proving the inversion rather than just "large lists build".
big_worker_only="${big#*$'\n'}"
check "300KB list, worker only" false "$big_worker_only"

# Regression, agy on #93. git quotes non-ASCII paths by default, turning
# cloudflare-worker/résumé.txt into "cloudflare-worker/r\303\251sum\303\251.txt"
# — leading quote included — which stops matching the prefix. build.yml passes
# core.quotePath=false so the script receives literal paths; this pins that the
# literal form is handled.
check "non-ASCII worker path (literal)" false 'cloudflare-worker/locales/résumé.txt'

# And documents what the quoted form would do, so the reason for
# core.quotePath=false in build.yml is visible here rather than only in a
# comment there.
check "non-ASCII worker path (quoted form builds)" true '"cloudflare-worker/r\303\251sum\303\251.txt"'

if [ "$fails" -ne 0 ]; then
  echo "build-needed.sh: $fails case(s) failed"
  exit 1
fi
echo "build-needed.sh: all cases passed"
