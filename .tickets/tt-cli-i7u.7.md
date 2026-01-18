---
id: tt-cli-i7u.7
status: open
deps: [tt-cli-i7u.5, tt-cli-i7u.6]
links: []
created: 2025-12-15T07:50:02.200272695-08:00
type: task
priority: 2
parent: tt-cli-i7u
---
# Create nightly CI workflow for schema drift detection

Create .github/workflows/schema-drift.yml for automated nightly schema checks.

## Requirements
- Scheduled run: cron '0 6 * * *' (6am UTC daily)
- Manual trigger (workflow_dispatch) for on-demand checks
- Uses TICKTICK_TOKEN secret

## Workflow Steps
1. Checkout repository
2. Setup Bun
3. Install dependencies
4. Run schema:check --update-changelog
5. If drift detected (exit code 1):
   a. Create branch: schema-drift/YYYY-MM-DD
   b. Commit updated snapshots + changelog
   c. Open PR with diff summary in description
   d. Create GitHub issue with:
      - Diff summary table
      - Zod update suggestions
      - Link to PR
6. Post summary to GITHUB_STEP_SUMMARY

## PR Template
```markdown
## Schema Drift Detected - YYYY-MM-DD

Automated schema drift detection found changes in the TickTick API.

### Summary
- X endpoint(s) with changes
- Y new field(s)
- Z type change(s)

### Changes
[Diff table here]

### Suggested Updates
[Link to suggested-updates.ts or inline]

### Action Required
Review changes and update src/schemas/v2.ts if needed.
```

## Issue Template
Similar to PR but includes link to the PR for review.

## Permissions
- contents: write (for commits)
- pull-requests: write (for PR creation)
- issues: write (for issue creation)


