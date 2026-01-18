---
id: tt-cli-i7u.3
status: open
deps: [tt-cli-i7u.2]
links: []
created: 2025-12-15T07:49:20.865232365-08:00
type: task
priority: 2
parent: tt-cli-i7u
---
# Implement Zod schema update suggester

Create scripts/schema-suggest.ts that generates Zod schema update suggestions from diff output.

## Requirements
- Take diff output (from schema-diff) as input
- Generate suggested Zod code for each change:
  - New fields → add to appropriate schema
  - Type changes → update existing field
  - Removed fields → comment noting potential deprecation
- Output as copy-pasteable TypeScript code
- Group suggestions by schema (TaskSchema, ProjectSchema, etc.)

## Output Example
```typescript
// ============================================================
// Suggested updates for TaskSchema (src/schemas/v2.ts)
// Based on schema drift detected 2025-12-15
// ============================================================

// ➕ New fields detected in API response:
focusTime: z.number().nullish(),
pomodoroCount: z.number().nullish(),

// ⚠️ Type changes:
// progress: was z.number(), consider z.number().nullish()

// ============================================================
// Suggested updates for ProjectSchema (src/schemas/v2.ts)
// ============================================================

// ➕ New fields detected in API response:
teamId: z.string().nullish(),
isArchived: z.boolean().nullish(),
```

## Future Enhancement
Output could be fed to AI agent for automated PR creation (requires separate setup).

## Package.json
Add script: schema:suggest


