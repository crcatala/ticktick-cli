---
id: tt-cli-fsn
status: closed
deps: []
links: []
created: 2025-12-15T16:15:45.845144388-08:00
type: feature
priority: 1
---
# Add project name resolution (use names instead of IDs)

Allow users to specify projects by name instead of requiring the full ID.

## Current Behavior
Users must use project IDs:
```bash
tt task add 'New task' --project abc123def456
tt task list --project abc123def456
```

## Desired Behavior
Allow project names with automatic resolution:
```bash
tt task add 'New task' --project 'Work'
tt task list --project 'Home'
tt task add 'Bug fix' -p Work  # short flag too
```

## Implementation
1. Add a `resolveProject(nameOrId)` helper function
2. First check if input matches an ID (exact or prefix match)
3. If not, search projects by name (case-insensitive)
4. Support fuzzy/prefix matching for names too
5. Error clearly if multiple matches or no match found

## Commands to Update
- `task add --project`
- `task list --project`
- `task edit --project` (when moving tasks)
- Any other command accepting project ID

## Edge Cases
- Multiple projects with similar names: show disambiguation prompt or error
- Project name that looks like an ID: prefer ID match first
- Empty/whitespace names: reject

## Inspiration
The tick-tick-cli bash tool supports this with `--list 'Project Name'` syntax.



## Notes

**2026-07-15T15:22:07Z**

Implemented safe project ID/prefix/name resolution across task, project, and note commands; verified with bun run verify.
