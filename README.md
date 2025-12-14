# ticktick-cli

A command-line interface for [TickTick](https://ticktick.com) task management, built on the [pyticktick](https://github.com/sebpretzer/pyticktick) library.

## Installation

```bash
pip install ticktick-cli
```

Or install from source:

```bash
git clone https://github.com/crcatala/ticktick-cli.git
cd ticktick-cli
pip install -e .
```

## Quick Start

### 1. Authenticate

```bash
ticktick auth login
```

You'll be prompted for your TickTick username and password. If you have 2FA enabled, provide your TOTP secret:

```bash
ticktick auth login --totp-secret YOUR_TOTP_SECRET
```

By default, your session token is stored securely in your system keyring. If you prefer plaintext storage (not recommended), use:

```bash
ticktick auth login --use-config
```

### 2. List Your Tasks

```bash
ticktick task list
```

### 3. Add a Task

```bash
ticktick task add "Buy groceries" --priority 3 --due 2025-01-20
```

## Common Workflows

### Daily Review

```bash
# See all active tasks
ticktick task list

# See tasks due today (filter by project)
ticktick task list --project PROJECT_ID

# Mark tasks as done
ticktick task done TASK_ID_1 TASK_ID_2
```

### Quick Task Entry

```bash
# Simple task
ticktick task add "Call mom"

# Task with all options
ticktick task add "Prepare presentation" \
  --project PROJECT_ID \
  --priority 5 \
  --due 2025-01-15 \
  --tags "work,urgent" \
  --desc "Q1 sales review slides"
```

### Project Management

```bash
# List all projects
ticktick project list

# Create a new project
ticktick project add "Home Renovation" --color "#FF5733"

# Show inbox ID
ticktick project inbox
```

### Working with Tags

```bash
# List all tags
ticktick tag list

# Create hierarchical tags
ticktick tag add "work"
ticktick tag add "work/urgent" --parent "work"

# Rename a tag
ticktick tag rename "old-name" "new-name"
```

### Data Export

```bash
# Export all data as JSON
ticktick sync --json > ticktick-backup.json

# Export just tasks
ticktick task list --json > tasks.json
```

### Scripting / Automation

All commands support `--json` output for easy parsing:

```bash
# Get task IDs for scripting
ticktick task list --json | jq '.[].id'

# Check auth status in scripts
if ticktick auth status --json | jq -e '.authenticated' > /dev/null; then
  echo "Logged in"
fi
```

## Command Reference

| Command | Description |
|---------|-------------|
| `ticktick auth login` | Log in to TickTick |
| `ticktick auth logout` | Log out and clear credentials |
| `ticktick auth status` | Show authentication status |
| `ticktick task list` | List active tasks |
| `ticktick task show ID` | Show task details |
| `ticktick task add TITLE` | Create a new task |
| `ticktick task edit ID` | Edit an existing task |
| `ticktick task done ID...` | Mark task(s) as complete |
| `ticktick task abandon ID...` | Mark task(s) as abandoned |
| `ticktick task reopen ID...` | Reopen closed task(s) |
| `ticktick task delete ID...` | Delete task(s) |
| `ticktick task closed` | List completed/abandoned tasks |
| `ticktick task subtask add PARENT TITLE` | Create a subtask |
| `ticktick project list` | List all projects |
| `ticktick project show ID` | Show project details |
| `ticktick project add NAME` | Create a new project |
| `ticktick project edit ID` | Edit a project |
| `ticktick project delete ID...` | Delete project(s) |
| `ticktick project inbox` | Show inbox project ID |
| `ticktick group list` | List project groups |
| `ticktick group add NAME` | Create a project group |
| `ticktick tag list` | List all tags |
| `ticktick tag add NAME` | Create a tag |
| `ticktick tag rename OLD NEW` | Rename a tag |
| `ticktick user profile` | Show user profile |
| `ticktick user status` | Show subscription status |
| `ticktick user stats` | Show usage statistics |
| `ticktick sync` | Fetch full state snapshot |
| `ticktick version` | Show version |

Use `ticktick COMMAND --help` for detailed options.

## Configuration

Configuration is stored in `~/.config/ticktick-cli/config.toml`:

```toml
[auth]
username = "your@email.com"
storage = "keyring"  # or "config" for plaintext

[defaults]
project = "inbox"  # Optional default project for new tasks
```

**Security Note:** By default, session tokens are stored in your system keyring (macOS Keychain, Windows Credential Manager, or Linux Secret Service). If you use `--use-config`, the token is stored in plaintext in the config file with 600 permissions.

## Known Limitations

### Single Task Lookup

The TickTick V2 API does not support fetching a single task by ID directly. Commands like `ticktick task show` fetch all tasks and filter client-side. This is efficient for most users but may be slow for accounts with thousands of tasks.

### Rate Limiting

The underlying pyticktick library includes retry logic with exponential backoff for the V1 API. The V2 API (used by this CLI) may encounter rate limits under heavy use. If you see errors, wait a moment and retry.

### API Stability

This CLI uses TickTick's unofficial V2 API (reverse-engineered from the web app). While more feature-complete than the official V1 API, it may change without notice.

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run linting
ruff check .

# Run tests
pytest
```

## License

MIT
