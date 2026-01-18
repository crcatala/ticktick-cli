---
id: tt-cli-i7u.2
status: open
deps: [tt-cli-i7u.1]
links: []
created: 2025-12-15T07:49:10.975097699-08:00
type: task
priority: 2
parent: tt-cli-i7u
---
# Implement schema diff tool

Create scripts/schema-diff.ts that compares captured snapshots against baseline.

## Requirements
- Load current snapshots from schemas/snapshots/
- Compare against previous committed versions (or specified baseline)
- Detect changes:
  - ➕ New fields (field in API but not in baseline)
  - 🗑️ Removed fields (field in baseline but not in API)
  - ⚠️ Type changes (field type differs)
  - 📝 Nullability changes
- Run Zod validation on captured data (strict mode) to surface validation errors
- Output structured diff (JSON) + human-readable report

## Output Format
```json
{
  "capturedAt": "2025-12-15T07:30:00Z",
  "endpoints": {
    "batch-check": {
      "status": "changed",
      "changes": [
        { "type": "added", "path": "syncTaskBean.update[].focusTime", "schemaType": "number" },
        { "type": "typeChange", "path": "projectProfiles[].closed", "was": "boolean", "now": ["boolean", "null"] }
      ],
      "zodErrors": []
    },
    "projects": {
      "status": "unchanged",
      "changes": [],
      "zodErrors": []
    }
  },
  "summary": {
    "totalEndpoints": 12,
    "changed": 2,
    "unchanged": 10,
    "totalNewFields": 3,
    "totalRemovedFields": 0,
    "totalTypeChanges": 1,
    "totalZodErrors": 0
  }
}
```

## Human-Readable Output
Markdown table format suitable for GitHub issue/PR description.

## Package.json
Add script: schema:diff


