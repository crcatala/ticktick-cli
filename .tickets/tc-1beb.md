---
id: tc-1beb
status: closed
deps: []
links: []
created: 2026-07-15T01:51:21Z
type: task
priority: 2
assignee: cc-vps
parent: tt-cli-bgj
---
# Run live integration tests from approved PR comments

Port the guarded /run-live-tests PR-comment workflow pattern from raindrop-cli. Only repository owners/collaborators may request a run, and forks must be rejected because live-test secrets must never be exposed to fork code.

## Acceptance Criteria

An owner/collaborator comment containing /run-live-tests dispatches the live test workflow on a same-repository PR branch; fork PRs are rejected; the workflow creates a status check and comments pass/fail; TICKTICK_TOKEN remains available only to the dispatched trusted run.


## Notes

**2026-07-15T01:52:31Z**

Implemented the guarded /run-live-tests PR-comment flow in live-tests.yml. It permits only OWNER/COLLABORATOR comments, refuses fork PRs before dispatch, runs the workflow at the same-repository PR SHA, and posts a GitHub Check plus a pass/fail PR comment. Validated YAML parsing and the targeted live-test command (39 skipped without RUN_LIVE_TESTS=1).
