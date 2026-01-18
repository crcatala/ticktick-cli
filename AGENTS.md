## Issue Tracking with tk (ticket)

**IMPORTANT**: This project uses **tk (ticket)** for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why tk?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Tickets stored as plain markdown in `.tickets/`
- Simple: Minimal CLI with intuitive commands
- Agent-optimized: JSON output via `query`, ready work detection

### Quick Start

**Check for ready work:**
```bash
tk ready
```

**Create new tickets:**
```bash
tk create "Issue title" -t bug|feature|task -p 0-4
tk create "Issue title" -p 1 -d "Description here"
tk create "Subtask" --parent <epic-id>  # Hierarchical subtask
```

**Claim and update:**
```bash
tk start <id>              # Set status to in_progress
tk status <id> open        # Change status
```

**Complete work:**
```bash
tk close <id>
```

**Add dependencies:**
```bash
tk dep <id> <blocker-id>   # id depends on blocker-id
tk undep <id> <blocker-id> # Remove dependency
tk dep tree <id>           # Show dependency tree
```

### Ticket Types

- `bug` - Something broken
- `feature` - New functionality
- `task` - Work item (tests, docs, refactoring)
- `epic` - Large feature with subtasks
- `chore` - Maintenance (dependencies, tooling)

### Priorities

- `0` - Critical (security, data loss, broken builds)
- `1` - High (major features, important bugs)
- `2` - Medium (default, nice-to-have)
- `3` - Low (polish, optimization)
- `4` - Backlog (future ideas)

### Workflow for AI Agents

1. **Check ready work**: `tk ready` shows unblocked issues
2. **Claim your task**: `tk start <id>`
3. **Work on it**: Implement, test, document
4. **Discover new work?** Create linked ticket:
   ```bash
   new_id=$(tk create "Found bug" -p 1)
   tk dep $new_id <parent-id>  # New issue depends on parent
   ```
5. **Complete**: `tk close <id>`
6. **Commit together**: Always commit `.tickets/` changes with your code

### Useful Commands

```bash
tk ls                      # List all tickets
tk ls --status open        # Filter by status
tk ready                   # Unblocked open/in_progress tickets
tk blocked                 # Tickets waiting on dependencies
tk closed                  # Recently closed tickets
tk show <id>               # Show ticket details
tk edit <id>               # Edit in $EDITOR
tk add-note <id> "note"    # Add timestamped note
tk query                   # JSON output for all tickets
tk query '.[] | select(.status == "open")'  # jq filter
```

### Partial ID Matching

tk supports partial ID matching:
```bash
tk show 5c4     # Matches tt-cli-5c46
tk start bgj    # Matches tt-cli-bgj
```

### Managing AI-Generated Planning Documents

AI assistants often create planning and design documents during development:
- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

**Best Practice: Use a dedicated directory for these ephemeral files**

**Recommended approach:**
- Create a `history/` directory in the project root
- Store ALL AI-generated planning/design docs in `history/`
- Keep the repository root clean and focused on permanent project files
- Only access `history/` when explicitly asked to review past planning

### Important Rules

- ✅ Use tk for ALL task tracking
- ✅ Check `tk ready` before asking "what should I work on?"
- ✅ Store AI planning docs in `history/` directory
- ✅ Commit `.tickets/` together with code changes
- ❌ Do NOT create markdown TODO lists
- ❌ Do NOT use external issue trackers
- ❌ Do NOT duplicate tracking systems
- ❌ Do NOT clutter repo root with planning documents
