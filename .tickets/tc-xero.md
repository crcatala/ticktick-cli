---
id: tc-xero
status: closed
deps: []
links: []
created: 2026-07-15T01:25:43Z
type: task
priority: 1
assignee: cc-vps
parent: tt-cli-bgj
---
# Modernize npm packaging and manual releases

Publish as @crcatala/ticktick-cli with tt and ttcli executables. Replace automated binary releases with a local release-it workflow, make TypeScript 7 tsc builds reproducible, restrict npm package contents, and validate the packed artifact in CI. Do not publish or bump the version in this task.

## Acceptance Criteria

Package uses scoped public metadata and exposes tt/ttcli; build uses workspace TypeScript 7 tsc; package smoke test installs and exercises packed tarball; CI runs build/package validation; release-it manual workflow and docs replace GitHub binary release workflow; no version bump or npm publication occurs.


## Notes

**2026-07-15T01:28:47Z**

Completed packaging/release modernization without a version bump or publish: scoped public package metadata; tt and ttcli bins; TypeScript 7.0.2 native tsc; explicit package allowlist; tarball install smoke test in CI; manual release-it workflow and documentation; removed binary release/install flow. Verified with bun run verify (380 pass, 39 skipped), package smoke test, and npm pack (39.1 kB / 184.4 kB).
