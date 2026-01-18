---
id: tt-cli-7xg
status: open
deps: []
links: []
created: 2025-12-15T07:49:38.537393794-08:00
type: feature
priority: 3
---
# Add rich text/markdown support for task descriptions

Add support for rich text formatting and markdown in task descriptions. Currently the CLI only supports plain text content.

## Design

## Current State
TickTick supports rich text in task descriptions:
- Bold, italic, underline, highlight
- Headings
- Bullet lists
- Markdown syntax
- Slash commands (/)

The CLI only supports plain text via the `content` field.

## Requirements
1. Support markdown input for task descriptions
2. Preserve formatting when syncing
3. Display formatted content (or markdown) in task details
4. Support common markdown features

## Implementation Approach

### Input Options

#### Option 1: Markdown flag
```bash
ticktick task add "Task" --description "# Heading\n**Bold** text"
ticktick task edit <ID> --description-markdown "## Notes\n- Item 1\n- Item 2"
```

#### Option 2: Editor mode
```bash
ticktick task edit <ID> --edit-description
# Opens $EDITOR with current content, save to apply
```

#### Option 3: File input
```bash
ticktick task add "Task" --description-file notes.md
```

### Supported Markdown
- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- Headings: `# H1`, `## H2`, etc.
- Lists: `- item` or `* item`
- Code: `` `code` `` or ``` ``` blocks
- Links: `[text](url)`
- Blockquotes: `> quote`

### Display Options

#### Option 1: Render to terminal
Use libraries like `rich` or `marked-terminal` to display formatted text in terminal

#### Option 2: Show markdown source
Display raw markdown with syntax highlighting

#### Option 3: Both
- Default: Rendered view
- `--raw` flag: Show markdown source

## API Considerations
Research needed:
1. Does API store content as HTML, Markdown, or custom format?
2. How does the web app handle formatting?
3. Are there specific formatting tags/codes?
4. Max content length?

## Challenges
- Terminal markdown rendering limitations
- Preserving complex formatting
- Cross-platform terminal compatibility
- Emoji and special characters

## Alternative: Basic Support
Start simple:
- Accept markdown input
- Store as-is in content field
- Display raw markdown
- Let TickTick app handle rendering

## Testing
- Create task with markdown description
- Edit description with formatting
- View in TickTick app (should preserve formatting)
- Test various markdown features
- Test with very long content
- Verify sync with API

## Acceptance Criteria

- Can input markdown in task descriptions
- Markdown formatting preserved when syncing
- Formatted content displays in task details (rendered or raw)
- Common markdown features supported (bold, italic, headings, lists)
- Changes compatible with TickTick app
- Optional: Terminal rendering of formatted text


