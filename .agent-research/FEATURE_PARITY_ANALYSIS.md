# TickTick CLI Feature Parity Analysis

This document compares the features available in TickTick's official apps (web/mobile/desktop) with what is currently supported in the ticktick-cli tool.

## Legend
- ✅ **Fully Supported** - Feature is fully implemented in CLI
- 🟡 **Partially Supported** - Feature exists but with limitations
- ❌ **Not Supported** - Feature is missing from CLI
- 🔵 **API Available** - Not in CLI but accessible via underlying API
- 🟣 **N/A for CLI** - Feature not applicable to command-line interface

---

## 1. Task Creation & Input Methods

| Feature | Status | Notes |
|---------|--------|-------|
| **Basic Task Creation** | ✅ | `task add <TITLE>` |
| Quick Task Add | ✅ | Command-line task creation |
| Smart Date Recognition | ❌ | No automatic date parsing from title |
| Voice Input | 🟣 N/A | Not applicable to CLI |
| Email Integration | ❌ | Cannot create tasks via email |
| Clipboard Recognition | 🟣 N/A | Not applicable to CLI |
| Batch Task Addition | ❌ | No batch creation from multiple lines |
| Widget Support | 🟣 N/A | Not applicable to CLI |
| Global Shortcuts | 🟣 N/A | OS-level feature |
| Siri Integration | 🟣 N/A | Not applicable to CLI |
| Template Support | ❌ | Cannot save/load task templates |

---

## 2. Task Properties & Fields

| Feature | Status | Notes |
|---------|--------|-------|
| **Title** | ✅ | Fully supported |
| **Due Date** | ✅ | Supports multiple formats (YYYY-MM-DD, "today", "tomorrow", "+3d") |
| **Start Date** | ✅ | Can set start date |
| **Time** | 🟡 | Can set but no specific time-only field |
| **Duration** | 🔵 | API supports duration but CLI doesn't expose it |
| **Priority** | ✅ | Supports high/medium/low/none |
| **Description/Content** | ✅ | Can set task content/description |
| **Tags** | ✅ | Multiple tags supported |
| **Project/List** | ✅ | Can assign to projects |
| **All-day Flag** | ✅ | Supported |
| **Time Zone** | ✅ | Can set timezone |
| **Fixed vs Floating Time** | ❌ | No option to choose between fixed/floating time |
| **Progress/Percentage** | 🔵 | API has progress field but CLI doesn't expose |
| **Estimated Pomodoro Count** | ❌ | Not supported |
| **Estimated Duration** | ❌ | Not supported |

---

## 3. Task Details & Rich Content

| Feature | Status | Notes |
|---------|--------|-------|
| **Description/Body** | ✅ | Basic text content supported |
| Rich Text Formatting | ❌ | No bold, italic, highlight support |
| Markdown Support | ❌ | Content is plain text only |
| Slash Commands (/) | ❌ | Not supported |
| Headings | ❌ | No formatting support |
| **Attachments** | 🔵 | API supports but CLI doesn't |
| Image Attachments | ❌ | Not supported |
| File Attachments | ❌ | Not supported |
| Recording Attachments | 🟣 N/A | Not applicable to CLI |
| Video Attachments | ❌ | Not supported |
| Copy/Paste Images | 🟣 N/A | Not applicable to CLI |
| Drag & Drop Files | 🟣 N/A | Not applicable to CLI |

---

## 4. Subtasks & Checklist Items

| Feature | Status | Notes |
|---------|--------|-------|
| **Subtasks (Parent-Child)** | ✅ | `task subtask:add` and `task subtask:unset` |
| Checklist Items | 🔵 | API supports but CLI doesn't expose editing |
| Multi-level Nesting (5 levels) | 🟡 | API supports but CLI only has basic subtask commands |
| Subtask Reminders | ❌ | Cannot set reminders on checklist items |
| Convert Between Task/Checklist | ❌ | Not supported |
| Drag to Reorder Checklist | 🟣 N/A | Not applicable to CLI |

---

## 5. Reminders & Notifications

| Feature | Status | Notes |
|---------|--------|-------|
| **Basic Reminders** | 🔵 | API has reminder field but CLI cannot set/edit |
| Multiple Reminders (up to 5) | ❌ | Not supported |
| Custom Reminder Times | ❌ | Not supported |
| Default Reminder Settings | ❌ | Not supported |
| Location-Based Reminders | 🟣 N/A | Not applicable to CLI |
| End Time Reminders | ❌ | Not supported |
| Email Notifications | ❌ | Not CLI-controlled |
| Constant Reminder | 🟣 N/A | Mobile-only feature |
| Priority-Based Ringtones | 🟣 N/A | Not applicable to CLI |
| Reminder Pop-ups | 🟣 N/A | Not applicable to CLI |
| Lock Screen Reminders | 🟣 N/A | Not applicable to CLI |

---

## 6. Recurring/Repeat Tasks

| Feature | Status | Notes |
|---------|--------|-------|
| **Repeat Flag** | 🔵 | API has repeat field (RRULE) but CLI cannot set/edit |
| Daily Repeat | ❌ | Not supported |
| Weekly Repeat | ❌ | Not supported |
| Monthly Repeat | ❌ | Not supported |
| Yearly Repeat | ❌ | Not supported |
| Custom Repeat Patterns | ❌ | Not supported |
| By Due Dates | ❌ | Not supported |
| By Completion Dates | ❌ | Not supported |
| By Specific Dates | ❌ | Not supported |
| Repeat Ends On (date) | ❌ | Not supported |
| Repeat Ends After (count) | ❌ | Not supported |
| Modify Single Occurrence | ❌ | Not supported |
| Show All Repeat Cycles | ❌ | Not supported |

---

## 7. Task Organization

### Lists/Projects

| Feature | Status | Notes |
|---------|--------|-------|
| **Create Lists** | ✅ | `project add <NAME>` |
| **Edit Lists** | ✅ | `project edit <ID>` |
| **Delete Lists** | ✅ | `project delete <ID>` |
| **List All Projects** | ✅ | `project list` |
| **Show Project Details** | ✅ | `project show <ID>` |
| **Get Inbox** | ✅ | `project inbox` |
| List Color | ✅ | Can set hex color |
| List Icon/Emoji | ❌ | Not supported |
| List Kind (TASK/NOTE) | ✅ | Supported |
| List View Mode | ✅ | Supported |
| List Background | ❌ | Not supported (Beta feature) |
| Share Lists | ❌ | No sharing functionality |
| Pin Lists | ❌ | Not supported |

### Smart Lists

| Feature | Status | Notes |
|---------|--------|-------|
| Today | 🟡 | Can filter by date but no built-in smart list |
| Tomorrow | 🟡 | Can filter by date but no built-in smart list |
| Next 7 Days | 🟡 | Can filter by date but no built-in smart list |
| Inbox | ✅ | `project inbox` command |
| Assigned to Me | ❌ | Not supported |
| Won't Do | 🟡 | Can list abandoned tasks: `task closed --status=Abandoned` |
| Completed | ✅ | `task closed` command |
| All | ✅ | `task list` shows all active tasks |
| Smart List Customization | ❌ | Cannot hide/show smart lists |

### Folders

| Feature | Status | Notes |
|---------|--------|-------|
| **Create Folders** | ❌ | No folder support |
| Drag Lists into Folders | ❌ | Not supported |
| Ungroup Folders | ❌ | Not supported |
| Folder Icons | ❌ | Not supported |

### Tags

| Feature | Status | Notes |
|---------|--------|-------|
| **Create Tags** | ✅ | `tag add <NAME>` |
| **Rename Tags** | ✅ | `tag rename <OLD> <NEW>` |
| **Edit Tags** | ✅ | `tag edit <NAME>` |
| **Delete Tags** | ✅ | `tag delete <NAME>` |
| **List Tags** | ✅ | `tag list` |
| Tag Colors | ✅ | Can set hex color |
| Tag Hierarchy (Parent Tags) | ✅ | Supports parent tag |
| Tag Sorting | ✅ | Can set sort order |
| Pin Tags | ❌ | Not supported |
| Quick Tag with # Symbol | ❌ | Not supported in CLI |
| Drag & Drop Tag Assignment | 🟣 N/A | Not applicable to CLI |

### Project Groups

| Feature | Status | Notes |
|---------|--------|-------|
| **Create Groups** | ✅ | `group add <NAME>` |
| **Edit Groups** | ✅ | `group edit <ID>` |
| **Delete Groups** | ✅ | `group delete <ID>` |
| **List Groups** | ✅ | `group list` |
| Group Sorting | ✅ | Can set sort order |

---

## 8. Task Views & Display

| Feature | Status | Notes |
|---------|--------|-------|
| **List View** | ✅ | Default table display |
| Kanban View | ❌ | Not supported |
| Timeline View | ❌ | Not supported |
| Calendar View | ❌ | Not supported |
| Eisenhower Matrix | ❌ | Not supported |
| **Filtering** | 🟡 | Limited filters (project, tag, priority) |
| **Sorting** | 🟡 | Basic table sorting available |
| **Grouping** | ❌ | No grouping options |
| Group by Time | ❌ | Not supported |
| Group by Priority | ❌ | Not supported |
| Group by Assignee | ❌ | Not supported |
| Group by List | ❌ | Not supported |
| Group by Custom | ❌ | Not supported |
| Sort by Due Date | ✅ | Table can be sorted |
| Sort by Priority | ✅ | Can filter by priority |
| Sort by Name | ✅ | Table can be sorted |
| Sort by Modified Time | ❌ | Not supported |
| Sort by Tag | ❌ | Not supported |
| Show Task Details in List | ❌ | Not in table view |
| Hide Completed Tasks | ❌ | Not a toggle option |
| Pin Tasks | ❌ | Not supported |

---

## 9. Task Operations & Actions

| Feature | Status | Notes |
|---------|--------|-------|
| **Create Task** | ✅ | `task add <TITLE>` |
| **Edit Task** | ✅ | `task edit <ID>` |
| **Complete Task** | ✅ | `task done <ID>` |
| **Delete Task** | ✅ | `task delete <ID>` |
| **Reopen Task** | ✅ | `task reopen <ID>` |
| **Mark as Won't Do** | ✅ | `task abandon <ID>` |
| **List Tasks** | ✅ | `task list` with filters |
| **Show Task Details** | ✅ | `task show <ID>` |
| **List Closed Tasks** | ✅ | `task closed` |
| Move to List | ✅ | Via `task edit` |
| Copy Task Link | ❌ | Not supported |
| Share Task | ❌ | Not supported |
| Duplicate Task | ❌ | Not supported |
| Save as Template | ❌ | Not supported |
| Convert Task to Note | ❌ | Not supported |
| Convert Note to Task | ❌ | Not supported |
| Start Focus/Pomodoro | ❌ | Not supported |
| Batch Operations | ❌ | No batch edit/delete/move |
| Task Activities/History | ❌ | Not supported |
| Comments | ❌ | Not supported |
| Right-click Actions | 🟣 N/A | Not applicable to CLI |
| Swipe Actions | 🟣 N/A | Not applicable to CLI |
| Drag & Drop | 🟣 N/A | Not applicable to CLI |

---

## 10. Collaboration & Sharing

| Feature | Status | Notes |
|---------|--------|-------|
| Share Lists | ❌ | Not supported |
| Assign Tasks | ❌ | Not supported |
| Task Comments | ❌ | Not supported |
| Team Collaboration | ❌ | Not supported |
| Assignee Avatars | 🟣 N/A | Not applicable to CLI |
| "Assigned to Me" View | ❌ | Not supported |
| Mention Users | ❌ | Not supported |

---

## 11. Time Management Features

| Feature | Status | Notes |
|---------|--------|-------|
| Calendar View | ❌ | Not supported |
| Month View | ❌ | Not supported |
| Week View | ❌ | Not supported |
| Day View | ❌ | Not supported |
| Year View | ❌ | Not supported |
| Timeline/Gantt View | ❌ | Not supported |
| Additional Timezones Display | ❌ | Not supported |
| Pomodoro Timer | ❌ | Not supported |
| Focus Sessions | ❌ | Not supported |
| Stopwatch | ❌ | Not supported |
| Time Tracking | ❌ | Not supported |
| Habit Tracker | ❌ | Not supported |
| Suggested Tasks | ❌ | Not supported |
| Recently Added | ❌ | Not supported |
| Postponed Tasks | ❌ | Not supported |
| Long Overdue | ❌ | Not supported |
| Upcoming Tasks | ❌ | Not supported |

---

## 12. Data Management

| Feature | Status | Notes |
|---------|--------|-------|
| **Sync** | ✅ | `sync` command gets full snapshot |
| **JSON Export** | ✅ | `sync --json` |
| Import from Other Apps | ❌ | Not supported |
| Export to Other Formats | ❌ | Only JSON supported |
| **Empty Trash** | ✅ | `trash empty` |
| Backup | 🟡 | Can export JSON but no dedicated backup |
| Restore from Backup | ❌ | No import functionality |
| Data Recovery | ❌ | Not supported |

---

## 13. User Account & Settings

| Feature | Status | Notes |
|---------|--------|-------|
| **Login** | ✅ | `auth login` |
| **Login with 2FA** | ✅ | `auth login --totp-code` |
| **Logout** | ✅ | `auth logout` |
| **Check Auth Status** | ✅ | `auth status` / `whoami` |
| **User Profile** | ✅ | `user profile` |
| **Subscription Status** | ✅ | `user status` |
| **Usage Statistics** | ✅ | `user stats` |
| Task Default Settings | ❌ | Cannot set default date/priority/list |
| Smart Date Parsing Toggle | ❌ | Not applicable |
| Default Reminder | ❌ | Not supported |
| Time Format (12h/24h) | ❌ | Not supported |
| Theme/Appearance | 🟣 N/A | Not applicable to CLI |
| Sound Settings | 🟣 N/A | Not applicable to CLI |
| Notification Settings | 🟣 N/A | Not applicable to CLI |

---

## 14. Output & Display Options

| Feature | Status | Notes |
|---------|--------|-------|
| **Formatted Tables** | ✅ | Default display mode |
| **JSON Output** | ✅ | `--json` flag on all commands |
| Colored Output | ✅ | Priority colors in tables |
| Truncated Display | ✅ | ID and title truncation |
| Detailed Single Item View | ✅ | Key-value pairs for single items |
| Relative Date Display | ✅ | "Today", "Tomorrow" formatting |
| Custom Column Display | ❌ | Cannot choose which columns to show |
| Pagination | ❌ | All results shown at once |

---

## 15. Advanced Features

| Feature | Status | Notes |
|---------|--------|-------|
| Filters (Custom Views) | ❌ | No custom filter creation |
| Search | ❌ | No search functionality |
| Advanced Queries | ❌ | No complex query support |
| Sections within Lists | ❌ | Not supported |
| List Customization | 🟡 | Limited (color, name, kind) |
| Keyboard Shortcuts | 🟣 N/A | CLI uses standard shell commands |
| Offline Mode | ❌ | Requires API connection |
| API Rate Limiting Handling | ✅ | Automatic retry with backoff |
| Schema Validation | ✅ | Built into SDK |
| Device ID Management | ✅ | Automatic session handling |

---

## Summary of Major Gaps

### Critical Gaps (Core Task Features)
1. **Reminders** - Cannot set or manage reminders from CLI
2. **Recurring Tasks** - No support for repeat/recurrence rules
3. **Attachments** - Cannot add/view files, images, or recordings
4. **Subtask Management** - Limited; can link/unlink but no multi-level nesting control
5. **Task Search** - No search functionality
6. **Checklist Items** - Cannot create or edit checklist items within tasks
7. **Rich Text/Markdown** - Content is plain text only
8. **Folders** - No folder organization support

### Important Gaps (Productivity Features)
9. **Views** - No Kanban, Timeline, or Calendar views
10. **Grouping & Advanced Sorting** - Limited filtering/sorting
11. **Batch Operations** - No batch edit/delete/complete
12. **Templates** - Cannot save or use templates
13. **Smart Features** - No suggested tasks, smart date parsing
14. **Collaboration** - No sharing, assignment, or comments
15. **Pomodoro/Focus** - No time tracking features

### Nice-to-Have Gaps
16. **Task Duplication** - Cannot duplicate tasks
17. **Task Comments** - No comment support
18. **Task Links** - Cannot copy/create task links
19. **Pin Tasks/Lists** - No pinning functionality
20. **Custom Filters** - Cannot create saved filters
21. **Task History** - No activity log

### Features Available at API Level but Not in CLI
- Checklist items (can read but not edit)
- Progress/percentage tracking
- Attachments
- Multiple reminders
- Repeat/recurrence rules
- Duration fields
- Advanced batch operations

---

## Recommendations for CLI Enhancement

### High Priority (Core Functionality)
1. **Add reminder management** - Set/edit/remove reminders
2. **Add recurring task support** - Create and manage repeat rules
3. **Implement search** - Search tasks by title, content, tags
4. **Add batch operations** - Edit/complete/delete multiple tasks
5. **Support checklist items** - Create/edit/delete checklist items
6. **Add folder support** - Create and manage folders for projects

### Medium Priority (User Experience)
7. **Template support** - Save and apply task templates
8. **Task duplication** - Duplicate existing tasks
9. **Smart date parsing** - Parse dates from natural language
10. **Advanced filtering** - Date ranges, complex queries
11. **Custom output columns** - Choose which fields to display
12. **Pagination** - Handle large result sets

### Low Priority (Nice-to-Have)
13. **Task linking** - Create references between tasks
14. **Progress tracking** - Set/view task progress percentage
15. **Duration fields** - Set task duration/time estimates
16. **Custom views** - Save filter combinations as views

### Not Recommended for CLI
- GUI-only features (Kanban boards, Calendar view, Pomodoro timer UI)
- Platform-specific features (widgets, Siri, voice input, gestures)
- Collaboration features (may be better suited for web/mobile)

---

## Conclusion

The ticktick-cli currently supports the **core task management operations** well:
- ✅ CRUD operations for tasks, projects, tags, and groups
- ✅ Basic task properties (title, dates, priority, content, tags)
- ✅ Authentication and user management
- ✅ Data sync and JSON export
- ✅ Basic subtask management

However, there are **significant gaps** in:
- ❌ **Reminders** - A critical task management feature
- ❌ **Recurring tasks** - Essential for routine task management
- ❌ **Attachments** - Important for task context
- ❌ **Search** - Necessary for large task lists
- ❌ **Advanced organization** - Folders, sections, custom filters
- ❌ **Collaboration** - Sharing and assignment features

The CLI is best suited for users who need **quick task management** from the terminal and don't require advanced features like reminders, recurring tasks, or collaboration. For power users, the most impactful improvements would be **reminder management** and **recurring task support**.
