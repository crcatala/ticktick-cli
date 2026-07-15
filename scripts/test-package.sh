#!/usr/bin/env bash
# Smoke-test the exact npm tarball users install.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TMP_DIR="$(mktemp -d)"
TARBALL=""
cleanup() {
  rm -rf "$TMP_DIR"
  [[ -z "$TARBALL" || ! -f "$TARBALL" ]] || rm -f "$TARBALL"
}
trap cleanup EXIT

bun run build >/dev/null
# The artifact under test was built above. `prepack` separately guarantees that
# direct npm pack/publish commands rebuild immediately before packaging.
TARBALL="$(npm pack --ignore-scripts --silent | tail -n 1)"
npm install -g --prefix "$TMP_DIR/prefix" --ignore-scripts "./$TARBALL" >/dev/null

EXPECTED_VERSION="$(node -p "require('./package.json').version")"
for command in tt ttcli; do
  BIN="$TMP_DIR/prefix/bin/$command"
  ACTUAL_VERSION="$($BIN --version)"

  if [[ "$ACTUAL_VERSION" != "$EXPECTED_VERSION" ]]; then
    echo "Expected $command --version to output '$EXPECTED_VERSION', got '$ACTUAL_VERSION'" >&2
    exit 1
  fi

  "$BIN" --help >/dev/null
done

echo "Package smoke test passed"
