---
id: tc-af3f
status: open
deps: []
links: []
created: 2026-01-18T01:24:50Z
type: task
priority: 2
assignee: cc-vps
parent: tt-cli-bgj
---
# Pin GitHub Actions to SHA commits

Pin all GitHub Actions in workflows to specific SHA commits for supply chain security. Keep version comments for maintainability.

Files to update:
- .github/workflows/test.yml
- .github/workflows/live-tests.yml
- .github/workflows/release.yml

Example format:
```yaml
uses: actions/checkout@8e8c483db84b4bee98b60c0593521ed34d9990e8  # v6.0.1
```

