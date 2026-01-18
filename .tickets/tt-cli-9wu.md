---
id: tt-cli-9wu
status: open
deps: []
links: []
created: 2025-12-15T16:16:15.927018231-08:00
type: feature
priority: 1
---
# Default to inbox when no project specified for task add

When creating a task without specifying a project, default to the user's inbox.

## Current Behavior
```bash
tt task add 'Quick note'
# Error or requires --project
```

## Desired Behavior
```bash
tt task add 'Quick note'
# Created in Inbox automatically

tt task add 'Work task' --project Work
# Created in Work project (explicit override)
```

## Implementation
1. In `task add` command, if no `--project` specified:
   - Fetch inbox ID via `client.getInbox()`
   - Use inbox as default projectId
2. Could also check config for a default project preference
3. Show which project the task was added to in success message

## Config Option (Optional Enhancement)
```json
{
  "defaults": {
    "project": "inbox"  // or a specific project ID/name
  }
}
```

## Success Message
```
Created task: Quick note
ID: abc123
Project: Inbox (default)
```

## Inspiration
tick-tick-cli allows: `task 'Remember to call mom'` which goes to inbox automatically


