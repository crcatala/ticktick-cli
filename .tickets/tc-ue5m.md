---
id: tc-ue5m
status: closed
deps: []
links: []
created: 2026-07-15T17:10:45Z
type: bug
priority: 2
assignee: cc-vps
---
# Make release dry run non-mutating

Disable npm publishing and GitHub release integration in release:dry so previews cannot publish or open the GitHub release form; document the behavior in release instructions.

## Notes

**2026-07-15T17:10:47Z**

Started implementation based on the release safety fix from raindrop-cli PR #22.

**2026-07-15T17:11:36Z**

Implemented the non-mutating dry-run flags and documented the local-only behavior. `bun run verify` passed (421 tests, 42 live tests skipped).
