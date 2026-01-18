---
id: tt-cli-6s3
status: open
deps: []
links: []
created: 2025-12-15T16:17:24.513737309-08:00
type: task
priority: 3
---
# Document shell aliases and integrations

Add documentation for power users on shell integrations.

## Content to Document

### Recommended Aliases
```bash
# Add to ~/.bashrc or ~/.zshrc
alias tt='ticktick'
alias tta='ticktick task add'
alias ttd='ticktick task done'
alias ttl='ticktick task list'
alias ttp='ticktick project list'
```

### fzf Integration
```bash
# Interactive task completion with fzf
ttdone() {
  local task=$(ticktick task list --json | jq -r '.[] | "\(.id)\t\(.title)"' | fzf --with-nth=2)
  [[ -n "$task" ]] && ticktick task done $(echo "$task" | cut -f1)
}
```

### Completion Scripts
- Document how to generate/use shell completions
- Bash completion
- Zsh completion
- Fish completion (if supported)

### Quick Capture Scripts
```bash
# Quick capture from anywhere (could use rofi/dmenu on Linux)
capture() {
  local task="$(echo '' | rofi -dmenu -p 'Quick task:')"
  [[ -n "$task" ]] && ticktick task add "$task"
}
```

## Location
- Add to README.md under 'Advanced Usage' or 'Tips & Tricks'
- Or create separate INTEGRATIONS.md doc


