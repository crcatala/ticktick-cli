---
id: tc-1w7j
status: open
deps: []
links: []
created: 2026-07-14T23:56:57Z
type: feature
priority: 3
assignee: cc-vps
---
# Add list-section commands (Kanban column support)

Add support for TickTick's custom **Sections**: named task groups within a List. In Kanban view, the same groups are shown as columns; switching views preserves the section/column names and task placement. The undocumented web API calls these resources `columns` and assigns tasks with `columnId`, so the implementation must use the column endpoints while presenting the feature as Sections in the CLI.

Use a user-facing `tt section` command namespace (with `tt column` aliases if practical, to accommodate Kanban terminology). Integrate it with the existing project/group command organization and support JSON output.

## Missing CLI/API coverage

- `Column` schema/type is absent, as is `Task.columnId`.
- No client support exists for `GET /column/project/{projectId}` or `POST /column` batch add/update/delete operations.
- No commands can list, create, rename, reorder, or delete Sections.
- `tt task add` and `tt task edit` cannot assign/move a task to a Section; task output does not show its Section. Moving a task to another project also needs to replace its old `columnId` with a valid destination Section.
- Project/list output does not identify the view mode or expose its Sections.

## Acceptance Criteria

- Users can list, create, rename, reorder, and delete Sections for a project, with `--json` support.
- `tt section` is the documented primary interface; if `tt column` aliases are included, help text explains that Kanban columns and List sections are the same underlying grouping.
- `tt task add` resolves the destination project (including Inbox when applicable), fetches its Sections, and assigns the lowest-`sortOrder` Section when `--section` is omitted; it uses the explicitly resolved `--section` when supplied. It omits `columnId` only when the project has no Sections.
- `tt task edit` can assign or move a task to a Section; moving a task to another project resolves a valid destination Section rather than retaining a stale source-project `columnId`. Task list/show output displays the Section where it can be resolved. Do not offer an unsectioned/clear option unless its web-API behavior is verified.
- The API client implements column listing and batch create/update/delete, validates API responses, and exposes typed `Column` and `Task.columnId` fields.
- Commands resolve a project and section by name or ID, give clear errors for missing/wrong-project Sections, and preserve existing task properties when moving a task.
- Unit tests cover schemas, API request/response behavior, command behavior, JSON output, and name/ID resolution; live API coverage is added where available.
- README command reference and terminology document Sections and their Kanban relationship.


## Notes

**2026-07-15T13:53:11Z**

Refocused from Kanban-only columns to TickTick List Sections. Research confirms Sections are List-view groups backed by the same column/columnId API used by Kanban; ticket now documents terminology, missing schema/client/CLI coverage, task placement, output, validation, tests, and docs.

**2026-07-15T14:08:08Z**

Observed web-app traffic (2026-07-15): Sections use GET /column/project/:projectId and POST /column batch payloads. Create sends full client-generated object (id, userId, createdTime, projectId, name, sortOrder); rename/reorder sends full existing object incl. etag and changes name/sortOrder. Task membership is Task.columnId; UI sends full task objects for add/update with columnId and ETag on update. Section deletion is non-cascading: UI POSTs column delete ({columnId, projectId}) then separately deletes each member task through /batch/task. Endpoint response order was not numeric sortOrder order, so CLI must sort Sections client-side before display. Sort values observed use 2^40 spacing; generate/compute insertion values rather than assume array order.

**2026-07-15T14:13:24Z**

UI observation to preserve: a sectioned List has no user-visible unsectioned state; newly added tasks are automatically assigned to the first section by sortOrder. CLI policy proposal: in task add, after resolving the destination project (including Inbox when applicable), fetch its columns. If nonempty, assign the lowest-sortOrder column when --section is omitted; if --section is supplied, resolve and validate it belongs to that project; if no columns exist, omit columnId. Keep this UI-parity policy in command orchestration rather than generic client.createTask. Do not expose a clear/unsectioned option until request behavior is captured.
