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
