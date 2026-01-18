---
id: tt-cli-9zn
status: closed
deps: []
links: []
created: 2025-12-14T15:05:26.549713137-08:00
type: task
priority: 2
---
# Set up Bun unit test suite with HTTP mocking

Establish a baseline bun test setup for the TickTick API client code.\n- Configure bun test (or Vitest-compatible) to run from src/ with watch + CI modes.\n- Add MSW (node) or undici MockAgent to simulate TickTick endpoints for unit coverage; prefer MSW but leave room if permissions block it.\n- Write sample tests for request builders, response mappers, keytar helpers, and CLI option parsing to prove the harness works.\n- Document how to run tests locally (README snippet).\nOutstanding: confirm final mocking library (MSW vs MockAgent) once we spike it.


