---
id: tt-cli-1f0
status: closed
deps: [tt-cli-3q5]
links: []
created: 2025-12-14T16:02:33.072194325-08:00
type: task
priority: 2
---
# Expand CLI command unit tests

Increase coverage for Commander command handlers beyond initial cases.\n- Add tests for auth/task/project commands covering success + error paths.\n- Use Bun's module mocks for getClient and print helpers.\n- Include edge cases mentioned in code review (network errors, malformed responses).


