---
id: tt-cli-0im
status: closed
deps: []
links: []
created: 2025-12-14T15:05:35.087739179-08:00
type: task
priority: 2
---
# Introduce Zod schemas for TickTick v2 contracts

Define Zod (or equivalent) schemas for the TickTick v2 responses we consume and enforce validation at the API boundary.\n- Create schemas/types per entity (task, project, tag, batch response) under src/schemas/v2.\n- Update the client to parse responses via schema.parse/safeParse and surface helpful errors when validation fails.\n- Add unit tests to cover happy path + drift scenarios (missing field, new enum value).\n- Document the versioning strategy and how to update schemas when the upstream API changes.\nOutstanding: decide whether to use Zod strict() mode or allow unknown fields by default.


