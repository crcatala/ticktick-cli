---
id: tt-cli-i7u
status: open
deps: []
links: []
created: 2025-12-15T07:48:41.091021896-08:00
type: epic
priority: 2
---
# Schema drift detection for TickTick API

Detect TickTick API schema changes automatically to stay ahead of their undocumented API updates.

## Goal
Capture API response shapes as JSON Schema-like snapshots, diff against baseline, and surface drift via GitHub PR + issue for manual review.

## Components
1. Schema snapshot capture script (per-endpoint, no sensitive data)
2. Schema diff tool (detect new/removed/changed fields)
3. Zod schema update suggester (generate code suggestions)
4. Changelog generator (schemas/SCHEMA_CHANGELOG.md)
5. Nightly CI workflow (capture → diff → PR + issue if drift)

## Endpoints to Cover
- GET /batch/check/0 (tasks, projects, tags)
- GET /project/all, POST /project
- GET /project/groups
- GET /tag, POST /tag
- GET /user/profile, /user/status, /user/stats
- POST /task (create), POST /task/:id (update)
- Other mutation responses

## File Structure
- schemas/snapshots/*.schema.json
- schemas/SCHEMA_CHANGELOG.md
- scripts/schema-*.ts

## Workflow
1. Nightly CI captures fresh snapshots
2. Diffs against committed baseline
3. If drift: opens PR with updates + creates GitHub issue
4. Human reviews and updates Zod schemas as needed


