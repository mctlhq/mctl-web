#!/usr/bin/env bash
#
# Decides whether the Nuxt image build is needed for a set of changed files.
# Reads the file list on stdin (one path per line), prints "true" or "false".
#
# Extracted from build.yml so it can be tested. Six lines of shell inside a
# workflow step shipped two defects before this existed — a SIGPIPE inversion
# that silently skipped a required check, and a quoting bug — neither of which
# any test could reach while the logic lived in YAML.
#
# See build-needed.test.sh for the cases this must get right.

set -euo pipefail

changed=$(cat)

# An empty list builds. Treating "no files" as "nothing to do" would turn any
# failure to produce the list into a silent pass on a required check, which is
# indistinguishable from success and therefore worse than a wasted build.
if [ -z "${changed}" ]; then
  echo "true"
  exit 0
fi

# grep -v with output discarded, NOT grep -qv.
#
# Under `set -o pipefail`, -q inverts this decision on exactly the PRs that most
# need building: -q exits at the first match, and when the list exceeds the pipe
# buffer the still-writing producer takes SIGPIPE and returns 141, so the
# pipeline reports failure and the caller reads "nothing outside the worker".
# Measured, not theorised: a 310KB list whose first entry is out of scope
# returns false under -q and true here.
if printf '%s\n' "${changed}" | grep -v '^cloudflare-worker/' >/dev/null; then
  echo "true"
else
  echo "false"
fi
