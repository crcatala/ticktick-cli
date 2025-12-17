# Live Integration Tests

The project includes optional integration tests that run against the real TickTick API. These are skipped by default and require explicit opt-in.

## Prerequisites

- A TickTick account (recommend using a dedicated test account)
- A valid session token

## Running Locally

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

## Getting a Session Token

1. Log in to TickTick web app (https://ticktick.com)
2. Open browser DevTools → Application → Cookies
3. Copy the value of the `t` cookie

## Test Isolation

Live tests create resources with a `__tt-cli-test-` prefix:
- A dedicated test project is created for each test run
- All test tasks, tags, and groups are created within this project
- Resources are automatically cleaned up after tests complete
- Orphaned resources from failed runs are cleaned up on the next run

## Manual Cleanup

If tests fail and leave orphaned resources (or you hit quota limits on a free account), run the cleanup script:

```bash
RUN_LIVE_TESTS=1 TICKTICK_TOKEN=xxx bun run tests/helpers/cleanup.ts
```

This will find and delete all resources with the `__tt-cli-test-` prefix.

## GitHub Actions

Live tests can be triggered manually via the "Live Integration Tests" workflow:
1. Go to Actions → Live Integration Tests → Run workflow
2. Optionally enable debug logging
3. The workflow uses the `TICKTICK_TOKEN` repository secret

## ⚠️ Cautions

- Live tests make real API calls and may be rate-limited
- Use a dedicated test account to avoid polluting your real data
- Tests add delays between API calls to avoid rate limits
