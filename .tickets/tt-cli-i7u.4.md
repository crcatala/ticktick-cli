---
id: tt-cli-i7u.4
status: open
deps: [tt-cli-i7u.2]
links: []
created: 2025-12-15T07:49:34.204266408-08:00
type: task
priority: 2
parent: tt-cli-i7u
---
# Implement schema changelog generator

Create changelog generation for schema drift, updating schemas/SCHEMA_CHANGELOG.md.

## Requirements
- Take diff output as input
- Append dated entry to schemas/SCHEMA_CHANGELOG.md
- Group changes by endpoint/schema
- Use consistent format with emoji indicators

## Changelog Format
```markdown
# TickTick API Schema Changelog

This file tracks detected changes in the TickTick API response schemas.
Generated automatically by schema drift detection.

## 2025-12-15

### batch-check
- ➕ Added: `syncTaskBean.update[].focusTime` (number)
- ➕ Added: `syncTaskBean.update[].pomodoroCount` (number)

### projects
- ➕ Added: `teamId` (string|null)
- ⚠️ Type change: `closed` (boolean → boolean|null)

### user-profile
- 🗑️ Possibly removed: `legacyField` (was string)

---

## 2025-12-10

### tags
- ➕ Added: `rawColor` (string|null)
```

## Implementation Notes
- Prepend new entries (newest first)
- Keep separator between date sections
- Can be integrated into schema-diff or as separate utility function
- CI workflow will commit updated changelog in PR


