# ticktick-cli

A command-line interface for the [TickTick](https://ticktick.com) task management app, optimized for AI agents.

## Installation

Requires Node.js 20+:

```bash
npm install -g @crcatala/ticktick-cli
```

The package provides two equivalent commands: `tt` and `ttcli`. `tt` is used throughout this guide.

<details>
<summary><strong>Build from Source</strong></summary>

Requires Node.js 20+ and [Bun](https://bun.sh):

```bash
git clone https://github.com/crcatala/ticktick-cli.git
cd ticktick-cli
bun install
bun run build
node dist/index.js --help
```

</details>

## Quick Start

### 1. Authenticate

```bash
tt auth login
```

You'll be prompted for your TickTick username and password. If you have 2FA enabled, provide your TOTP code:

```bash
tt auth login --totp-code 123456
```

By default, your session token is stored securely in your system keyring. If you prefer plaintext storage (not recommended), use:

```bash
tt auth login --use-config
```

### 2. List Your Tasks

```bash
tt task list
```

### 3. Add a Task

```bash
tt task add "Buy groceries" --priority high --due tomorrow
```

## Common Workflows

### Daily Review

```bash
# See all active tasks
tt task list

# See tasks in a specific project
tt task list --project PROJECT_ID

# Mark a task as done
tt task done TASK_ID
```

### Quick Task Entry

```bash
# Simple task
tt task add "Call mom"

# Task with all options
tt task add "Prepare presentation" \
  --project PROJECT_ID \
  --priority high \
  --due 2025-01-15 \
  --tag work \
  --tag urgent \
  --content "Q1 sales review slides"
```

### Project Management

```bash
# List all projects
tt project list

# Create a new project
tt project add "Home Renovation" --color "#FF5733"

# Show inbox ID
tt project inbox
```

### Working with Tags

```bash
# List all tags
tt tag list

# Create a tag
tt tag add "work"

# Create a child tag
tt tag add "urgent" --parent "work"

# Rename a tag
tt tag rename "old-name" "new-name"
```

### Data Export

```bash
# Export all data as JSON
tt sync --json > ticktick-backup.json

# Export just tasks
tt task list --json > tasks.json
```

### Scripting / Automation

All commands support `--json` output for easy parsing:

```bash
# Get task IDs for scripting
tt task list --json | jq '.[].id'

# Check auth status in scripts
if tt auth status --json | jq -e '.authenticated' > /dev/null; then
  echo "Logged in"
fi
```

## Command Reference

| Command | Description |
|---------|-------------|
| `tt auth login` | Log in to TickTick |
| `tt auth logout` | Log out and clear credentials |
| `tt auth status` | Show authentication status |
| `tt auth whoami` | Alias for status |
| `tt task list` | List active tasks |
| `tt task show ID` | Show task details |
| `tt task add TITLE` | Create a new task |
| `tt task edit ID` | Edit an existing task |
| `tt task done ID` | Mark task as complete |
| `tt task abandon ID` | Mark task as abandoned |
| `tt task reopen ID` | Reopen closed task |
| `tt task delete ID` | Delete task |
| `tt task closed` | List completed/abandoned tasks |
| `tt task subtask:add TASK PARENT` | Make task a subtask |
| `tt task subtask:unset TASK` | Remove from parent |
| `tt project list` | List all projects |
| `tt project show ID` | Show project details |
| `tt project add NAME` | Create a new project |
| `tt project edit ID` | Edit a project |
| `tt project delete ID` | Delete project |
| `tt project inbox` | Show inbox project ID |
| `tt group list` | List project groups |
| `tt group add NAME` | Create a project group |
| `tt group edit ID` | Edit a project group |
| `tt group delete ID` | Delete project group |
| `tt tag list` | List all tags |
| `tt tag add NAME` | Create a tag |
| `tt tag rename OLD NEW` | Rename a tag |
| `tt tag edit NAME` | Edit tag color/parent |
| `tt tag delete NAME` | Delete a tag |
| `tt user profile` | Show user profile |
| `tt user status` | Show subscription status |
| `tt user stats` | Show usage statistics |
| `tt sync` | Fetch full state snapshot |
| `tt trash empty` | Permanently delete all trashed items |

Use `tt COMMAND --help` for detailed options.

## Configuration

Configuration is stored in `~/.config/ticktick-cli/config.json`:

```json
{
  "auth": {
    "username": "your@email.com",
    "storage": "keyring"
  },
  "defaults": {
    "project": "inbox_id"
  }
}
```

**Security Note:** By default, session tokens are stored in your system keyring (macOS Keychain, Windows Credential Manager, or Linux Secret Service). If you use `--use-config`, the token is stored in plaintext in the config file with 600 permissions.

### Web API compatibility

This CLI uses TickTick's unofficial web API. If TickTick updates its web-client version before the CLI is updated, set `TICKTICK_WEB_VERSION` temporarily when running a command:

```bash
TICKTICK_WEB_VERSION=8121 tt auth login
```

The built-in default is `8121`. This setting is only a compatibility escape hatch; do not set it unless you have verified the current web client's `X-Device.version`.

## Known Limitations

### Single Task Lookup

The TickTick V2 API does not support fetching a single task by ID directly. Commands like `tt task show` fetch all tasks and filter client-side. This is efficient for most users but may be slow for accounts with thousands of tasks.

### API Stability

This CLI uses TickTick's unofficial V2 API (reverse-engineered from the web app). While more feature-complete than the official V1 API, it may change without notice.

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev [command]

# Type check
bun run typecheck

# Run tests
bun run test

# Build binary
bun run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

When submitting changes that affect users, please add an entry to the `## [Unreleased]` section of [CHANGELOG.md](CHANGELOG.md).

## Releasing

See [RELEASING.md](RELEASING.md) for the release process and how to publish new versions.

## License

MIT
