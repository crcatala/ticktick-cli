---
id: tt-cli-4bk
status: open
deps: []
links: []
created: 2025-12-15T16:16:51.454886804-08:00
type: feature
priority: 3
---
# Interactive task selection with --pick flag

Add interactive selection mode for task commands.

## Use Case
When you can't remember the exact task ID or title, let the CLI show a list:
```bash
tt task done --pick
tt task edit --pick
tt task delete --pick
```

## Behavior
1. Fetch all tasks (or filtered subset)
2. Display numbered list with key info
3. User enters number(s) to select
4. Perform action on selected task(s)

## Example Interaction
```
$ tt task done --pick

Select task(s) to complete:
  1. Buy groceries (Home) - due tomorrow
  2. Fix login bug (Work) - high priority
  3. Call dentist (Personal)
  4. Review PR #123 (Work)

Enter number(s) (e.g., 1 or 1,3,4): 2

Completed: Fix login bug
```

## Filtering Options
```bash
tt task done --pick --project Work      # Only show Work tasks
tt task done --pick --priority high     # Only high priority
tt task done --pick --tag urgent        # Only tasks with tag
```

## Implementation Options
1. **Built-in numbered list** - Simple, works everywhere
2. **fzf integration** - Fuzzy finder if available, fallback to numbered
3. **inquirer/prompts library** - Rich interactive prompts

## Display Format
```
  1. [H] Buy groceries (Home) - tomorrow
     └─ Get milk, bread, eggs
  2. [M] Fix login bug (Work) - overdue!
  3. [ ] Call dentist (Personal)
```
Where [H]=High, [M]=Medium, [ ]=None/Low

## Commands to Support
- `task done --pick`
- `task edit --pick` (then prompts for what to edit)
- `task delete --pick`
- `task abandon --pick`
- `task show --pick`

## Notes
- Should work in non-TTY mode (just error gracefully)
- Consider `--limit N` to cap list size
- Consider `--recent` to show recently modified first


