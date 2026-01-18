# Progress Log

## Patterns Learned

- Workflow name was "Tests" in test.yml - renamed to "CI" for clarity
- Project uses `tsgo --noEmit` for typecheck (not tsc)
- Always use `--frozen-lockfile` with bun install in CI
- Use `bun --raw-test` locally to bypass project's test wrapper warning

## Completed Tasks

## [2026-01-17 17:37] - tt-cli-wkc
- Added typecheck job to CI workflow (test.yml)
- Renamed workflow from "Tests" to "CI" for clarity
- Added step names, `--frozen-lockfile` per guardrails
- Files changed: `.github/workflows/test.yml`
- **Learnings:** Project has existing `typecheck` script that uses tsgo
---

## [2026-01-17 17:39] - tc-74b6
- Added lint job to CI workflow using oxlint
- Installed oxlint as devDependency
- Added "lint" script to package.json: `oxlint src/`
- Files changed: `.github/workflows/test.yml`, `package.json`, `bun.lock`
- **Learnings:** oxlint runs fast (~24ms on 37 files), produces warnings only (no errors) - CI job will pass
---

## [2026-01-17 17:39] - tc-af3f
- Pinned all GitHub Actions to SHA commits across all 3 workflow files
- test.yml: pinned checkout (v6.0.1) and setup-bun (v2.1.0) in lint, typecheck, test jobs
- live-tests.yml: pinned checkout (v6.0.1) and setup-bun (v2.1.0), added `--frozen-lockfile`, added step names
- release.yml: pinned checkout (v6.0.1), setup-bun (v2.1.0), setup-node (v6.2.0)
- Files changed: `.github/workflows/test.yml`, `.github/workflows/live-tests.yml`, `.github/workflows/release.yml`
- **Learnings:** Use `gh api repos/{owner}/{repo}/git/refs/tags` to look up SHA for any action version
---

## [2026-01-17 17:42] - tc-6d01
- Created GitGuardian secret scanning workflow
- Uses ubicloud-standard-2 runner per guardrails (not ubuntu-latest)
- Actions pinned to SHA: checkout v6.0.1, ggshield-action v1.46.0
- Includes fetch-depth: 0 for full history scan
- Files changed: `.github/workflows/gitguardian.yml`
- **Learnings:** GitGuardian workflow needs GITGUARDIAN_API_KEY secret configured in repo settings
---

## [2026-01-17 17:43] - tc-f620
- Created CODEOWNERS file for workflow protection
- Requires @crcatala review for `.github/workflows/` changes
- Files changed: `.github/CODEOWNERS`
- **Learnings:** Simple security layer - requires branch protection rules to be effective
---
