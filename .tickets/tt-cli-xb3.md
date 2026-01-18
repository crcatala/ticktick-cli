---
id: tt-cli-xb3
status: closed
deps: []
links: []
created: 2025-12-14T15:05:32.387256539-08:00
type: task
priority: 2
---
# Add CLI end-to-end tests

Create CLI-focused tests that spawn the ticktick binary/entry point and assert behavior.\n- Use bun test + Bun.spawn (or execa) to run commands in temp dirs, capturing stdout/stderr + exit codes.\n- Point HTTP traffic at the chosen mock layer (likely MSW) so tests stay deterministic.\n- Cover success and failure cases (missing flags, auth errors, API failures).\n- Ensure CLI tests run in CI alongside unit tests.\nOutstanding: finalize tooling choice (pure Bun.spawn vs execa) once first test is written.


