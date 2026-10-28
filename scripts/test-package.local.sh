#!/usr/bin/env bash
# release-standard: project-specific additions to scripts/test-package.sh
#
# Sourced by scripts/test-package.sh with $consumer set to the install prefix, so every
# check runs against the installed tarball, exactly as a user gets it.
set -euo pipefail

# Both commands (`tt` and `ttcli`) must ship and report the package.json version exactly:
# the standard --version line is "tt X.Y.Z (sha7 YYYY-MM-DD)", so only the version field is
# compared here (the canonical script already checks the whole line's shape).
expected_version="$(node -p "require('./package.json').version")"

for bin in $bins; do
  if [[ ! -x "$consumer/node_modules/.bin/$bin" ]]; then
    echo "Error: '$bin' is declared in package.json \"bin\" but was not installed." >&2
    exit 1
  fi

  line="$("$consumer/node_modules/.bin/$bin" --version)"
  actual="${line#* }"
  actual="${actual%% *}"

  if [[ "$actual" != "$expected_version" ]]; then
    echo "Error: '$bin --version' reported version '$actual', expected '$expected_version' from package.json." >&2
    exit 1
  fi

  "$consumer/node_modules/.bin/$bin" --help >/dev/null
done

echo "Local package checks passed (tt and ttcli report $expected_version)."
