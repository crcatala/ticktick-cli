---
id: tt-cli-69p
status: closed
deps: [tt-cli-9zn]
links: []
created: 2025-12-14T16:02:16.358326622-08:00
type: task
priority: 2
---
# Set up GitHub Actions CI for Bun tests

Add a GitHub Actions workflow that runs bun install and bun test on pushes and PRs.\n- Use oven-sh/setup-bun to pin a Bun version.\n- Ensure it caches dependencies for faster runs.\n- Document CI expectations in README.\nDepends on tt-cli-9zn so unit tests are stable.


