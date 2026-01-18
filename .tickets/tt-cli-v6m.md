---
id: tt-cli-v6m
status: open
deps: []
links: []
created: 2025-12-15T16:16:38.401163152-08:00
type: feature
priority: 2
---
# Add explicit 'task move' command

Add a dedicated command to move tasks between projects.

## Current Behavior
Moving a task requires using edit with project flag:
```bash
tt task edit abc123 --project def456
```

## Desired Behavior
Explicit move command:
```bash
tt task move abc123 --to 'Work'
tt task move 'Fix bug' --to 'Home'  # With name resolution
tt task move abc123 def456  # Positional: task-id project-id
```

## Command Signature
```
tt task move <task-id|title> --to <project-id|name>
tt task move <task-id|title> <project-id|name>
```

## Implementation
1. Add new subcommand `task move`
2. Accept task by ID or title (depends on tt-cli-48e)
3. Accept target project by ID or name (depends on tt-cli-fsn)
4. Call existing `client.updateTask({ id, projectId })`

## Options
- `--to, -t <project>` - Target project (name or ID)
- `--json` - Output as JSON

## Success Message
```
Moved 'Fix bug' from 'Home' to 'Work'
```

## Dependencies
- tt-cli-fsn (project name resolution) - nice to have
- tt-cli-48e (task title lookup) - nice to have

## Notes
This is mostly syntactic sugar over `task edit --project`, but provides:
- Clearer intent
- Better discoverability
- Cleaner output message showing from/to


