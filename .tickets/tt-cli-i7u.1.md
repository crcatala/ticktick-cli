---
id: tt-cli-i7u.1
status: closed
deps: []
links: []
created: 2025-12-15T07:48:59.232096769-08:00
type: task
priority: 2
parent: tt-cli-i7u
---
# Implement schema snapshot capture script

Create scripts/schema-capture.ts that hits all primary API endpoints and extracts JSON Schema-like structure.

## Requirements
- Extract type information only (no actual values/sensitive data)
- Track nullability (e.g., ["string", "null"])
- Per-endpoint output files in schemas/snapshots/*.schema.json
- Include metadata: $endpoint, $capturedAt, $version

## Endpoints to Capture
**Read endpoints:**
- GET /batch/check/0 → batch-check.schema.json
- GET /project/all → projects.schema.json  
- GET /project/groups → project-groups.schema.json
- GET /tag → tags.schema.json
- GET /user/profile → user-profile.schema.json
- GET /user/status → user-status.schema.json
- GET /user/stats → user-stats.schema.json

**Mutation responses (requires creating test resources):**
- POST /task → task-create.schema.json
- POST /task/:id → task-update.schema.json
- POST /project → project-create.schema.json
- POST /tag → tag-create.schema.json
- POST /project/group → project-group-create.schema.json

## Implementation Notes
- Reuse TestProject helper from live tests for mutation cleanup
- Add package.json script: schema:capture
- Requires TICKTICK_TOKEN env var

## Output Format Example
```json
{
  "$endpoint": "GET /api/v2/batch/check/0",
  "$capturedAt": "2025-12-15T07:30:00Z",
  "$version": "1.0.0",
  "type": "object",
  "properties": {
    "syncTaskBean": {
      "type": "object",
      "properties": {
        "update": { "type": "array", "items": { ... } }
      }
    }
  }
}
```


