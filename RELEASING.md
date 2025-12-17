# Releasing

This document describes how to prepare and publish releases for ticktick-cli.

## Overview

Releases are automated via GitHub Actions. When you push a version tag (e.g., `v0.2.0`), the workflow:

1. Builds binaries for all platforms (macOS, Linux, Windows, including Alpine/musl variants)
2. Creates a GitHub Release with the binaries attached
3. Extracts the relevant changelog section for release notes
4. Publishes to npm (if `NPM_TOKEN` secret is configured)

## Release Checklist

### 1. Prepare the Changelog

Run the prep script to gather commits since the last release:

```bash
./scripts/prep-release.sh
```

This outputs:
- List of commits since last tag
- Merged PRs
- An AI prompt template for generating changelog entries

**Option A: Use AI to generate entries**

Copy the script output and paste it to your AI assistant to generate changelog entries in [Keep a Changelog](https://keepachangelog.com/) format.

**Option B: Manual**

Review commits and write entries yourself.

### 2. Update CHANGELOG.md

Add a new version section below `[Unreleased]`:

```markdown
## [Unreleased]

## [0.2.0] - 2024-12-20

### Added
- New feature description ([#123](https://github.com/USER/REPO/pull/123))

### Changed
- Modified behavior description

### Fixed
- Bug fix description

### Removed
- Removed feature description

## [0.1.0] - 2024-12-17
...
```

**Categories** (only include sections that have entries):
- **Added** - New features
- **Changed** - Changes to existing functionality
- **Deprecated** - Features that will be removed
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security fixes

### 3. Bump Version and Tag

Use npm to bump the version, which updates `package.json` and creates a git tag:

```bash
# Patch release (0.1.0 -> 0.1.1)
npm version patch

# Minor release (0.1.0 -> 0.2.0)
npm version minor

# Major release (0.1.0 -> 1.0.0)
npm version major

# Pre-release (for testing)
npm version prerelease --preid=alpha  # 0.1.0 -> 0.1.1-alpha.0
```

Or manually:
```bash
# 1. Edit version in package.json
# 2. Commit and tag
git add package.json CHANGELOG.md
git commit -m "Release v0.2.0"
git tag v0.2.0
```

### 4. Push to Trigger Release

```bash
git push --follow-tags
```

This pushes both the commit and the tag, triggering the release workflow.

### 5. Verify Release

1. Check the [Actions tab](../../actions) for workflow status
2. Check the [Releases page](../../releases) for the new release
3. Verify binaries are attached and release notes look correct

## Testing Releases (Pre-release)

For testing the release process without a "real" release:

```bash
# Create an alpha/beta tag
git tag v0.2.0-alpha.1
git push --tags
```

Or use the manual workflow trigger:
1. Go to Actions → Release workflow
2. Click "Run workflow"
3. Enter the tag (e.g., `v0.2.0-alpha.1`)

## Platform Binaries

Each release includes binaries for:

| Archive | Platform | Use Case |
|---------|----------|----------|
| `ticktick-darwin-arm64.tar.gz` | macOS Apple Silicon | M1/M2/M3 Macs |
| `ticktick-darwin-x64.tar.gz` | macOS Intel | Older Macs |
| `ticktick-linux-x64.tar.gz` | Linux x64 (glibc) | Ubuntu, Debian, Fedora, etc. |
| `ticktick-linux-x64-musl.tar.gz` | Linux x64 (musl) | Alpine Linux, Docker |
| `ticktick-linux-arm64.tar.gz` | Linux ARM64 (glibc) | Raspberry Pi 4, AWS Graviton |
| `ticktick-linux-arm64-musl.tar.gz` | Linux ARM64 (musl) | Alpine on ARM |
| `ticktick-windows-x64.zip` | Windows x64 | Windows 10/11 |

## npm Publishing

To enable npm publishing:

1. Create an npm access token at [npmjs.com](https://www.npmjs.com/) → Access Tokens → Generate New Token (Automation)
2. Add it as a repository secret named `NPM_TOKEN` in GitHub Settings → Secrets → Actions

The workflow will automatically publish to npm when the secret is configured.

## For Contributors

When submitting a PR with user-facing changes, please add an entry to the `## [Unreleased]` section of `CHANGELOG.md`. This helps maintainers prepare releases faster.

Example:
```markdown
## [Unreleased]

### Added
- Add `--verbose` flag for detailed output ([#42](https://github.com/USER/REPO/pull/42))
```

If you forget, no worries—maintainers can add it during release prep.
