---
id: tt-cli-rlg
status: open
deps: []
links: []
created: 2025-12-15T16:17:08.920178347-08:00
type: feature
priority: 3
---
# Add 'quick add' shorthand command

Add a shorthand for quick task creation with minimal typing.

## Desired Behavior
```bash
# Shortest possible task creation
tt add 'Buy milk'

# Equivalent to:
tt task add 'Buy milk'
```

## Implementation Options

### Option 1: Top-level 'add' command
```bash
tt add 'Task title'
tt add 'Task title' --due tomorrow --priority high
```

### Option 2: Alias in shell config (document this)
```bash
alias tta='tt task add'
tta 'Buy milk'
```

### Option 3: Single-letter aliases
```bash
tt a 'Buy milk'    # add
tt d abc123        # done
tt l               # list
```

## Recommendation
Go with Option 1 (top-level 'add' command) as it:
- Works out of the box
- Doesn't require shell config
- Clear and memorable

## Implementation
1. Register `add` as top-level command
2. Accept same options as `task add`
3. Could also add `done` as top-level alias for `task done`

## Related Shortcuts to Consider
```bash
tt add 'Task'           # = tt task add 'Task'
tt done <id>            # = tt task done <id>
tt ls                   # = tt task list
tt projects             # = tt project list
```


