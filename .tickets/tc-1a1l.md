---
id: tc-1a1l
status: closed
deps: []
links: []
created: 2026-07-15T17:46:23Z
type: bug
priority: 2
assignee: cc-vps
---
# Fix auth whoami command

tt auth whoami delegates to auth status with an extra positional argument, causing Commander to reject it.


## Notes

**2026-07-15T17:46:57Z**

Fixed Commander delegation to pass only status command arguments; added isolated CLI regression test for tt auth whoami. Verified targeted tests, typecheck, and lint.
