#!/bin/bash
# Usage: ./scripts/prep-release.sh [last-tag]
# Gathers commit info since last tag for changelog generation

set -e

LAST_TAG="${1:-$(git describe --tags --abbrev=0 2>/dev/null || echo "")}"

echo "=== Release Prep ==="
echo ""

if [ -z "$LAST_TAG" ]; then
  echo "No previous tag found. Showing all commits."
  echo ""
  RANGE="HEAD"
else
  echo "Changes since: $LAST_TAG"
  echo ""
  RANGE="${LAST_TAG}..HEAD"
fi

echo "=== Commits ==="
echo ""
git log ${RANGE} --pretty=format:"- %s (%h)" --no-merges
echo ""
echo ""

echo "=== Merged PRs (if using GitHub) ==="
echo ""
git log ${RANGE} --pretty=format:"%s" | grep -E "^Merge pull request|#[0-9]+" || echo "(none found)"
echo ""
echo ""

echo "=== Files changed ==="
echo ""
if [ -z "$LAST_TAG" ] || [ "$RANGE" = "HEAD" ]; then
  git diff --stat HEAD~20 2>/dev/null | tail -5 || echo "(showing recent)"
else
  git diff --stat ${RANGE} | tail -10
fi
echo ""
echo ""

echo "=== AI Prompt Template ==="
echo ""
cat << 'EOF'
Review these commits and generate changelog entries in Keep a Changelog format.
Group entries by: Added, Changed, Fixed, Removed (only include sections that have entries).
Be concise. Include PR/issue numbers in parentheses where mentioned.

Format example:
### Added
- New feature description ([#123](https://github.com/USER/REPO/pull/123))

### Fixed
- Bug fix description

Commits to review:
EOF
echo ""
git log ${RANGE} --pretty=format:"- %s" --no-merges
echo ""
