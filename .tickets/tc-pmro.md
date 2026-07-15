---
id: tc-pmro
status: closed
deps: []
links: []
created: 2026-07-15T14:27:29Z
type: feature
priority: 2
assignee: cc-vps
---
# Add first-class TickTick Note support

Implement note creation and task↔note conversion using the observed v2 batch task payload semantics.

API findings:
- Create a note in a NOTE project with `kind: "NOTE"`; it is otherwise a normal batch add record.
- Convert an existing task/note with a full-object batch update that changes `kind` between `"TEXT"` and `"NOTE"`.
- TickTick normalizes note conversion: it clears priority, tags, reminders/repeat, progress, assignee, and checklist items (and sets dueDate null); preserve the fields TickTick retains, such as title/content/startDate/isAllDay/projectId/columnId/sortOrder/timeZone.

Proposed UX:
- `tt note add <title> --project <note-project> [--content ...]` (validate project kind NOTE).
- `tt task convert-to-note <id>` and `tt note convert-to-task <id>`.
- Clearly distinguish note kind in human-readable `task show`/list output and prevent completion operations on notes.

Use the existing updateTask full-object fetch/merge mechanism, but explicitly normalize conversion fields rather than accidentally retaining incompatible task metadata.

## Acceptance Criteria

- `note add` creates an item with `kind: "NOTE"` only in a project whose kind is `NOTE`; it has title/content and standard default fields.
- Conversion fetches the full item, sets `kind` to `NOTE` or `TEXT`, and sends a complete update payload.
- Conversion intentionally clears items, reminders, repeat fields, priority, tags, progress, assignee, and dueDate in accordance with observed web-app behavior; retained fields have tests.
- Note-to-task conversion is supported and retains title/content/start date/all-day state.
- The CLI refuses to complete/abandon notes with an actionable error.
- Unit tests cover payload formation and project-kind validation; README documents the commands.


## Notes

**2026-07-15T14:31:24Z**

Implemented note add, bidirectional conversion, conversion normalization, note display, completion/abandon guards, documentation, and unit coverage. Validation in progress.
