---
id: tt-cli-bgj
status: closed
deps: []
links: []
created: 2025-12-15T14:13:04.28091516-08:00
type: epic
priority: 1
---
# Release Readiness

Prepare ticktick-cli for v0.1.0 public release and npm publish.

## Goals
- Complete GitHub repository setup (templates, CI hardening)
- Security best practices (SHA pinning, secret scanning, CODEOWNERS)
- npm publish readiness

## Completed
- ✅ LICENSE file (MIT)
- ✅ package.json npm metadata
- ✅ .npmignore file
- ✅ CONTRIBUTING.md
- ✅ CHANGELOG.md
- ✅ Release workflow (binaries + npm)
- ✅ TypeScript compilation fixes

## Remaining
- GitHub issue templates
- GitHub PR template
- CI: typecheck step
- CI: lint step
- Pin GitHub Actions to SHA commits
- GitGuardian secret scanning
- CODEOWNERS file

## Notes

**2026-07-15T17:28:45Z**

Hardened npm packaging: prepack rebuilds dist, release-it smoke-tests the post-bump tarball, and package tests avoid rerunning lifecycle scripts. Verified with bun run verify and npm pack --dry-run --json.
