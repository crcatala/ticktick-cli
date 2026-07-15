---
id: tt-cli-48e
status: closed
deps: []
links: []
created: 2025-12-15T16:16:07.462190958-08:00
type: feature
priority: 1
---
# Add task name/title lookup for done, delete, edit commands

Allow users to reference tasks by title/name instead of requiring IDs.

## Current Behavior
All task operations require the task ID:
```bash
tt task done abc123def456
tt task edit abc123def456 --priority high
tt task delete abc123def456
```

## Desired Behavior
Support task title lookup:
```bash
tt task done 'Buy groceries'
tt task edit 'Meeting prep' --due tomorrow
tt task delete 'Old task'

# With project scope for disambiguation
tt task done 'Fix bug' --project Work
```

## Implementation
1. Extend `findTaskById` to also search by title
2. Search is case-insensitive
3. If multiple tasks match the title, either:
   - Error with list of matches and their IDs
   - Or use --project to narrow scope
4. Exact matches preferred over partial matches
5. Still support IDs (check ID first, then title)

## Commands to Update
- `task done <id|title>`
- `task edit <id|title>`
- `task delete <id|title>`
- `task show <id|title>`
- `task abandon <id|title>`
- `task reopen <id|title>`
- `checklist` commands that take taskId

## Matching Strategy
1. Exact ID match
2. ID prefix match (existing behavior)
3. Exact title match (case-insensitive)
4. Title prefix/contains match (optional, could be confusing)

## Error Messages
```
Multiple tasks match 'Fix bug':
  abc123 - Fix bug (Work)
  def456 - Fix bug in login (Home)
Use --project to narrow scope, or use the full task ID.
```

## Inspiration
tick-tick-cli supports: `complete --task 'Fix bug' --list 'Work'`



## Notes

**2026-07-15T15:22:07Z**

Implemented safe exact task-title resolution with ambiguity errors and project scoping for task lookup commands; verified with bun run verify.
