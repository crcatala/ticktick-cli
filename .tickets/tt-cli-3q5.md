---
id: tt-cli-3q5
status: closed
deps: [tt-cli-9zn]
links: []
created: 2025-12-14T15:27:44.581874706-08:00
type: task
priority: 2
---
# Add Commander unit tests for CLI handlers

Add focused unit tests for the Commander command builders (task/project/tag/etc.).\n- Use bun test with module mocks to stub getClient and process.exit per Bun mock best practices.\n- Cover option parsing, filter logic, and error surfacing for at least the task commands (list/show/add).\n- Ensure print helpers are exercised with snapshot-style assertions (stripping ANSI).\n- Provide guidance on how to extend tests to other command groups.\nBlocked by tt-cli-9zn to reuse the shared test harness + MSW setup.


