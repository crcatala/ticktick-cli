---
id: tt-cli-e69
status: closed
deps: []
links: []
created: 2025-12-14T13:11:42.633300395-08:00
type: bug
priority: 2
---
# Login endpoint returns 500 username_password_not_match

The `auth login` command fails with "Invalid username or password" even though the same credentials work with the Python version using httpx.

Debug output shows headers match Python version exactly, but TickTick API returns HTTP 500 with errorCode "username_password_not_match".

Possible causes:
- Something in Bun's fetch implementation differs from Python's httpx
- Missing or different header that's not visible in debug output
- Some request signing/encoding difference

Workaround: Users migrating from Python can use existing token via TOML config fallback.


