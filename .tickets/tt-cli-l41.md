---
id: tt-cli-l41
status: open
deps: [tt-cli-pkl]
links: []
created: 2025-12-14T12:25:49.064272572-08:00
type: task
priority: 3
---
# Add cross-platform build scripts (Linux, macOS, Windows)

Add build scripts for cross-platform single-binary distribution using `bun build --compile` with platform targets.

## Acceptance Criteria

- build:linux script compiles for bun-linux-x64
- build:macos script compiles for bun-darwin-x64  
- build:windows script compiles for bun-windows-x64
- All binaries output to dist/ directory
- Consider GitHub Actions workflow for automated releases


