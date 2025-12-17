# ticktick-cli

A command-line interface for [TickTick](https://ticktick.com) task management, built with TypeScript and Bun.

## Installation

### Quick Install (Recommended)

**npm** (requires Node.js 20+):
```bash
npm install -g ticktick-cli
```

**Homebrew** (coming soon):
```bash
# brew install crcatala/tap/ticktick-cli
```

**Shell script** (downloads binary):
```bash
curl -fsSL https://raw.githubusercontent.com/crcatala/ticktick-cli/main/scripts/install.sh | bash
```

Options for the shell installer:
```bash
# Install specific version
curl -fsSL https://raw.githubusercontent.com/crcatala/ticktick-cli/main/scripts/install.sh | VERSION=v0.1.0 bash

# Install to custom directory
curl -fsSL https://raw.githubusercontent.com/crcatala/ticktick-cli/main/scripts/install.sh | INSTALL_DIR=/opt/bin bash
```

### Manual Download

Download the pre-built binary for your platform from the [releases page](https://github.com/crcatala/ticktick-cli/releases):

| Platform | Archive |
|----------|---------|
| macOS (Apple Silicon) | `ticktick-darwin-arm64.tar.gz` |
| macOS (Intel) | `ticktick-darwin-x64.tar.gz` |
| Linux x64 | `ticktick-linux-x64.tar.gz` |
| Linux x64 (Alpine/musl) | `ticktick-linux-x64-musl.tar.gz` |
| Linux ARM64 | `ticktick-linux-arm64.tar.gz` |
| Linux ARM64 (Alpine/musl) | `ticktick-linux-arm64-musl.tar.gz` |
| Windows x64 | `ticktick-windows-x64.zip` |

Extract and move the binary to a directory in your PATH:
```bash
tar -xzf ticktick-*.tar.gz
mv ticktick ~/.local/bin/  # or /usr/local/bin/
```

### Build from Source

Requires [Bun](https://bun.sh) v1.0+

```bash
git clone https://github.com/crcatala/ticktick-cli.git
cd ticktick-cli
bun install
bun run build
```

The compiled binary will be at `./dist/ticktick`.

### Development

```bash
# Run directly with Bun
bun run dev [command]

# Or use the source entry point
bun run src/index.ts [command]
```

## Quick Start

### 1. Authenticate

```bash
ticktick auth login
```

You'll be prompted for your TickTick username and password. If you have 2FA enabled, provide your TOTP code:

```bash
ticktick auth login --totp-code 123456
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
ticktick task add "Buy groceries" --priority high --due tomorrow
```

## Common Workflows

### Daily Review

```bash
# See all active tasks
ticktick task list

# See tasks in a specific project
ticktick task list --project PROJECT_ID

# Mark a task as done
ticktick task done TASK_ID
```

### Quick Task Entry

```bash
# Simple task
ticktick task add "Call mom"

# Task with all options
ticktick task add "Prepare presentation" \
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

# Create a tag
ticktick tag add "work"

# Create a child tag
ticktick tag add "urgent" --parent "work"

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
| `ticktick auth whoami` | Alias for status |
| `ticktick task list` | List active tasks |
| `ticktick task show ID` | Show task details |
| `ticktick task add TITLE` | Create a new task |
| `ticktick task edit ID` | Edit an existing task |
| `ticktick task done ID` | Mark task as complete |
| `ticktick task abandon ID` | Mark task as abandoned |
| `ticktick task reopen ID` | Reopen closed task |
| `ticktick task delete ID` | Delete task |
| `ticktick task closed` | List completed/abandoned tasks |
| `ticktick task subtask:add TASK PARENT` | Make task a subtask |
| `ticktick task subtask:unset TASK` | Remove from parent |
| `ticktick project list` | List all projects |
| `ticktick project show ID` | Show project details |
| `ticktick project add NAME` | Create a new project |
| `ticktick project edit ID` | Edit a project |
| `ticktick project delete ID` | Delete project |
| `ticktick project inbox` | Show inbox project ID |
| `ticktick group list` | List project groups |
| `ticktick group add NAME` | Create a project group |
| `ticktick group edit ID` | Edit a project group |
| `ticktick group delete ID` | Delete project group |
| `ticktick tag list` | List all tags |
| `ticktick tag add NAME` | Create a tag |
| `ticktick tag rename OLD NEW` | Rename a tag |
| `ticktick tag edit NAME` | Edit tag color/parent |
| `ticktick tag delete NAME` | Delete a tag |
| `ticktick user profile` | Show user profile |
| `ticktick user status` | Show subscription status |
| `ticktick user stats` | Show usage statistics |
| `ticktick sync` | Fetch full state snapshot |
| `ticktick trash empty` | Permanently delete all trashed items |

Use `ticktick COMMAND --help` for detailed options.

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

## Known Limitations

### Single Task Lookup

The TickTick V2 API does not support fetching a single task by ID directly. Commands like `ticktick task show` fetch all tasks and filter client-side. This is efficient for most users but may be slow for accounts with thousands of tasks.

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
bun test

# Build binary
bun run build
```

### Live Integration Tests

The project includes optional integration tests that run against the real TickTick API. These are skipped by default and require explicit opt-in.

**Prerequisites:**
- A TickTick account (recommend using a dedicated test account)
- A valid session token

**Running locally:**

```bash
# Set required environment variables
export RUN_LIVE_TESTS=1
export TICKTICK_TOKEN=your_session_token_here

# Optional: enable debug logging
export TICKTICK_DEBUG=1

# Optional: customize delay between API calls (default: 500ms)
export TICKTICK_TEST_DELAY_MS=1000

# Run live tests only
bun test tests/integration/live-api.test.ts

# Run with longer timeout for rate-limited environments
bun test tests/integration/live-api.test.ts --timeout 60000
```

**Getting a session token:**

1. Log in to TickTick web app (https://ticktick.com)
2. Open browser DevTools → Application → Cookies
3. Copy the value of the `t` cookie

**Test isolation:**

Live tests create resources with a `__tt-cli-test-` prefix:
- A dedicated test project is created for each test run
- All test tasks, tags, and groups are created within this project
- Resources are automatically cleaned up after tests complete
- Orphaned resources from failed runs are cleaned up on the next run

**Manual cleanup:**

If tests fail and leave orphaned resources (or you hit quota limits on a free account), run the cleanup script:

```bash
RUN_LIVE_TESTS=1 TICKTICK_TOKEN=xxx bun run tests/helpers/cleanup.ts
```

This will find and delete all resources with the `__tt-cli-test-` prefix.

**GitHub Actions:**

Live tests can be triggered manually via the "Live Integration Tests" workflow:
1. Go to Actions → Live Integration Tests → Run workflow
2. Optionally enable debug logging
3. The workflow uses the `TICKTICK_TOKEN` repository secret

**⚠️ Cautions:**
- Live tests make real API calls and may be rate-limited
- Use a dedicated test account to avoid polluting your real data
- Tests add delays between API calls to avoid rate limits

### Dependency Management

This project uses [Renovate](https://github.com/renovatebot/renovate) for automated dependency updates. Renovate runs weekly (Monday mornings) and creates pull requests for outdated dependencies.

**Configuration highlights:**
- Minor and patch updates for stable packages (non-0.x) are auto-merged after CI passes
- TypeScript and Bun updates are grouped together
- All PRs are labeled with `dependencies` and assigned to `@crcatala`
- A Dependency Dashboard issue tracks all pending updates

**Configuration:** See `renovate.json` in the repository root.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

When submitting changes that affect users, please add an entry to the `## [Unreleased]` section of [CHANGELOG.md](CHANGELOG.md).

## Releasing

See [RELEASING.md](RELEASING.md) for the release process and how to publish new versions.

## License

MIT
