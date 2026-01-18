---
id: tt-cli-8qe
status: open
deps: []
links: []
created: 2025-12-15T07:49:38.124717366-08:00
type: feature
priority: 3
---
# Add progress/percentage tracking support

Add ability to set and view task progress percentage. The API supports a progress field (0-100) but the CLI doesn't expose it.

## Design

## Current State
The TickTick API has a `progress` field on tasks (integer 0-100) but the CLI doesn't allow setting or displaying it.

## Requirements
1. Set progress when creating/editing tasks
2. View progress in task details
3. Update progress easily
4. Display progress visually in task list (optional)

## Implementation Approach

### Set Progress
```bash
ticktick task add "Write report" --progress 50
ticktick task edit <ID> --progress 75
ticktick task edit <ID> --progress 100  # Might auto-complete?
```

### View Progress
In `task show`:
```
Task: Write report
Progress: 75% [=============>      ]
```

In `task list` (optional column):
```
ID       Title          Progress  Due
abc123   Write report   75%       Today
```

### Quick Update
Consider a dedicated command:
```bash
ticktick task progress <ID> <PERCENTAGE>
ticktick task progress <ID> +10  # Increment by 10%
ticktick task progress <ID> -5   # Decrement by 5%
```

## API Field
- `progress` - Integer 0-100

## Special Behaviors to Research
1. Does setting progress to 100 auto-complete the task?
2. How does progress interact with checklist items?
3. Can progress be calculated automatically from checklist completion?

## Display Options
Progress bar formats:
- Simple: `75%`
- Bar: `[=============>      ] 75%`
- Blocks: `███████▓░░ 75%`

## Testing
- Set progress on task creation
- Update progress on existing task
- Set to 0%, 50%, 100%
- Verify API sync
- Test interaction with checklist items

## Acceptance Criteria

- Can set progress when creating task
- Can update progress on existing task
- Progress displays in task details
- Progress values 0-100 accepted
- Changes sync with TickTick API


