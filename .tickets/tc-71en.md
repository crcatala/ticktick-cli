---
id: tc-71en
status: closed
deps: []
links: []
created: 2026-07-15T03:37:00Z
type: task
priority: 3
assignee: cc-vps
---
# Document Linux keyring fallback

Document that keytar-based credential storage needs a graphical D-Bus/Secret Service session on Linux and explain the explicit --use-config fallback.

## Acceptance Criteria

README documents the Linux headless/SSH keyring limitation, the exact --use-config workaround, its plaintext/permission tradeoff, and status verification.


## Notes

**2026-07-15T03:37:29Z**

Documented the Linux headless/SSH Secret Service limitation, the explicit tt auth login --use-config fallback, config location and 0600 permission/security tradeoff, and auth status verification.
