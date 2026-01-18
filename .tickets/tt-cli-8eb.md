---
id: tt-cli-8eb
status: open
deps: []
links: []
created: 2025-12-15T16:17:15.31177585-08:00
type: feature
priority: 2
---
# Add --all flag for task list to include completed tasks

Simplify viewing all tasks including completed ones.

## Current Behavior
```bash
tt task list                        # Active only
tt task list --status all           # All tasks
tt task list --status completed     # Completed only
```

## Desired Enhancement
```bash
tt task list --all                  # Shorthand for --status all
tt task list -a                     # Even shorter
```

## Implementation
Add `--all, -a` as alias for `--status all`

## Precedence
If both `--all` and `--status` provided, `--status` wins (more specific)


