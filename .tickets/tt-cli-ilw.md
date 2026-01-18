---
id: tt-cli-ilw
status: closed
deps: []
links: []
created: 2025-12-14T15:05:30.054871877-08:00
type: task
priority: 2
---
# Implement live TickTick integration test harness

Add an opt-in integration test suite that exercises the real TickTick v2 API.\n- Tests live under tests/integration and are skipped unless RUN_LIVE_TESTS=1 plus required credentials (env vars) are present.\n- Cover create/update/delete task flows, project/group management, and tag ops with automatic cleanup + retry helpers.\n- Share a reusable exponential backoff utility between runtime and tests.\n- Document setup (env vars, rate-limit cautions) in README.\nOutstanding: confirm whether we also want a nightly CI job vs manual trigger.


