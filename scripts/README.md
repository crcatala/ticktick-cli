# Scripts

Utility scripts for the TickTick CLI project.

## schema-capture.ts

Captures JSON schema snapshots from TickTick API endpoints.

### Purpose

This script helps detect API schema drift by capturing the structure of API responses. It extracts type information only (no sensitive data) and saves it to `schemas/snapshots/*.schema.json` files.

### Usage

```bash
# Set your TickTick session token
export TICKTICK_TOKEN=your_token_here

# Run the capture script
bun run schema:capture
```

Or as a one-liner:

```bash
TICKTICK_TOKEN=xxx bun run schema:capture
```

### What it captures

**Read-only endpoints:**
- `GET /batch/check/0` → `batch-check.schema.json`
- `GET /user/profile` → `user-profile.schema.json`
- `GET /user/status` → `user-status.schema.json`
- `GET /user/statistics` → `user-stats.schema.json`
- `GET /project/all/closed` → `closed-tasks.schema.json`

**Mutation endpoints (creates test resources, then cleans up):**
- `POST /batch/task` (create) → `task-create.schema.json`
- `POST /batch/task` (update) → `task-update.schema.json`
- `POST /batch/project` → `project-create.schema.json`
- `POST /batch/tag` → `tag-create.schema.json`
- `POST /batch/projectGroup` → `project-group-create.schema.json`

### Output format

Each schema file includes:
- `$endpoint`: The API endpoint and HTTP method
- `$capturedAt`: ISO timestamp of when the schema was captured
- `$version`: Schema capture version
- Type information for all fields in the response

Example:

```json
{
  "$endpoint": "GET /api/v2/user/profile",
  "$capturedAt": "2025-12-15T12:00:00.000Z",
  "$version": "1.0.0",
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "username": { "type": "string" },
    "email": { "type": "string" }
  }
}
```

### Notes

- The script creates temporary test resources (prefixed with `__tt-cli-test-`) and cleans them up after capture
- Rate limiting protection is built-in (500ms delay between API calls)
- Snapshots are gitignored by default (they're generated files)
