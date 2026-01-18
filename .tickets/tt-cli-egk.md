---
id: tt-cli-egk
status: open
deps: []
links: []
created: 2025-12-15T16:16:59.586933178-08:00
type: feature
priority: 2
---
# Add tag name resolution for task filtering

When filtering tasks by tag, support tag names with proper resolution.

## Current Behavior
```bash
tt task list --tag 'work'  # Works if tag name matches exactly
```

## Improvements Needed
1. Case-insensitive tag matching
2. Support for hierarchical tags (parent/child)
3. Consistent with how project names would be resolved

## Desired Behavior
```bash
tt task list --tag 'Work'      # Case-insensitive
tt task list --tag 'work'      # Same result
tt task list --tag 'work/urgent'  # Hierarchical tag
```

## Implementation
1. Fetch all tags once
2. Match tag name case-insensitively
3. For hierarchical tags, support both:
   - Full path: `work/urgent`
   - Just leaf name: `urgent` (if unambiguous)

## Edge Cases
- Tag 'urgent' exists under both 'work' and 'personal'
- User types 'urgent' - should error with disambiguation
- User types 'work/urgent' - unambiguous match


