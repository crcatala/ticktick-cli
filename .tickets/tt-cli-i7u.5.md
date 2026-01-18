---
id: tt-cli-i7u.5
status: open
deps: [tt-cli-i7u.2, tt-cli-i7u.3, tt-cli-i7u.4]
links: []
created: 2025-12-15T07:49:44.34375157-08:00
type: task
priority: 2
parent: tt-cli-i7u
---
# Create schema:check orchestrator script

Create scripts/schema-check.ts that orchestrates the full schema drift pipeline.

## Requirements
- Single entry point for CI and manual use
- Runs: capture → diff → changelog → suggest
- Exits with appropriate code for CI (0 = no drift, 1 = drift detected)
- Outputs summary suitable for GitHub Actions step summary

## CLI Interface
```bash
# Full check (capture + diff + report)
bun run schema:check

# Options
--no-capture      # Skip capture, use existing snapshots (for testing diff logic)
--json            # Output JSON instead of human-readable
--update-changelog # Update SCHEMA_CHANGELOG.md (default: false for dry-run)
--output-dir      # Custom output directory for reports
```

## Exit Codes
- 0: No schema drift detected
- 1: Schema drift detected (changes found)
- 2: Error during execution

## Output
- Console: Human-readable summary
- File: drift-report.json (full structured output)
- File: drift-report.md (GitHub-friendly markdown)
- File: suggested-updates.ts (Zod suggestions)

## Package.json
Add script: schema:check


