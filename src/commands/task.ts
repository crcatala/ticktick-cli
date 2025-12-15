/**
 * Task commands.
 */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import type { Task, ChecklistItem } from "../api/types.js";
import {
  printError,
  printSuccess,
  printInfo,
  printJson,
  printKeyValue,
  printTasksTable,
  formatPriority,
  truncateId,
  printChecklistItems,
} from "../output/index.js";
import { formatDate, parseDate, toISODate } from "../utils/date.js";
import { parsePriority } from "../utils/priority.js";
import { createReminder, formatReminderTrigger } from "../utils/reminder.js";
import { parseRepeatPattern, formatRepeatFlag, REPEAT_FROM_DEFAULT } from "../utils/repeat.js";
import { handleError } from "./errors.js";

// Maximum reminders per task based on TickTick API observation
// (confirmed from API payload examples showing up to 5 reminders)
const MAX_REMINDERS_PER_TASK = 5;
import {
  filterByProject,
  filterByTag,
  filterByPriority,
  filterBySearch,
  findTaskById,
  resolveProjectId,
} from "./task-filters.js";
import { getGlobalOptions } from "../index.js";

export function createTaskCommand(): Command {
  const task = new Command("task").description("Manage tasks");

  // list command
  task
    .command("list")
    .description("List tasks")
    .option("-p, --project <name>", "Filter by project name or ID")
    .option("-t, --tag <name>", "Filter by tag name")
    .option("--priority <level>", "Filter by priority (high, medium, low, none)")
    .option("-s, --search <query>", "Search in title, content, description, and checklist items")
    .option("--status <status>", "Task status: active, completed, abandoned, all (default: active)")
    .option("--case-sensitive", "Use case-sensitive search")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        
        // Validate status option early
        const status = options.status?.toLowerCase() ?? "active";
        if (!["active", "completed", "abandoned", "all"].includes(status)) {
          printError(`Invalid status: ${status}. Use: active, completed, abandoned, or all`);
          process.exit(1);
        }

        // Resolve project filter first (fail fast before fetching tasks)
        let resolvedProjectId: string | undefined;
        if (options.project) {
          const projects = await client.getProjects();
          resolvedProjectId = resolveProjectId(projects, options.project);
          if (!resolvedProjectId) {
            printError(`Project not found: ${options.project}`);
            process.exit(1);
          }
        }
        
        // Fetch tasks based on status
        let tasks: Task[] = [];
        
        if (status === "active") {
          tasks = await client.getTasks();
        } else if (status === "completed") {
          tasks = await client.getClosedTasks("Completed");
        } else if (status === "abandoned") {
          tasks = await client.getClosedTasks("Abandoned");
        } else if (status === "all") {
          // Fetch both active and closed tasks in parallel
          const [activeTasks, completedTasks, abandonedTasks] = await Promise.all([
            client.getTasks(),
            client.getClosedTasks("Completed"),
            client.getClosedTasks("Abandoned"),
          ]);
          tasks = [...activeTasks, ...completedTasks, ...abandonedTasks];
        }

        // Apply search filter
        if (options.search) {
          tasks = filterBySearch(tasks, options.search, options.caseSensitive);
        }

        // Apply project filter
        if (resolvedProjectId) {
          tasks = filterByProject(tasks, resolvedProjectId);
        }
        
        // Apply tag filter
        if (options.tag) {
          tasks = filterByTag(tasks, options.tag);
        }
        
        // Apply priority filter
        if (options.priority) {
          tasks = filterByPriority(tasks, options.priority);
        }

        if (options.json) {
          printJson(tasks);
        } else if (tasks.length === 0) {
          printInfo("No tasks found");
        } else {
          printTasksTable(tasks);
          printInfo(`\n${tasks.length} task${tasks.length === 1 ? "" : "s"} found`);
        }
      })
    );

  // show command
  task
    .command("show <id>")
    .description("Show task details")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const tasks = await client.getTasks();
        const foundTask = findTaskById(tasks, id);

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        // Get full task details including checklist items
        let fullTask = foundTask;
        if (foundTask.projectId) {
          fullTask = await client.getTask(foundTask.id, foundTask.projectId);
        }

        if (options.json) {
          printJson(fullTask);
        } else {
          // Format reminders for display
          let remindersStr = "-";
          if (fullTask.reminders && fullTask.reminders.length > 0) {
            remindersStr = fullTask.reminders
              .map((r) => formatReminderTrigger(r.trigger))
              .join(", ");
          }

          // Format checklist summary
          const items: ChecklistItem[] = fullTask.items ?? [];
          let checklistDisplay = "-";
          if (items.length > 0) {
            const completed = items.filter(
              (i: ChecklistItem) => i.status === 1
            ).length;
            checklistDisplay = `${completed}/${items.length} completed`;
          }

          // Format repeat pattern
          const repeatDisplay = formatRepeatFlag(fullTask.repeatFlag) ?? "-";

          printKeyValue(
            {
              ID: fullTask.id ?? "-",
              Title: fullTask.title ?? "-",
              Content: fullTask.content ?? "-",
              Project: truncateId(fullTask.projectId),
              Priority: formatPriority(fullTask.priority).replace(
                /\x1b\[[0-9;]*m/g,
                ""
              ),
              "Due Date": formatDate(fullTask.dueDate),
              Repeat: repeatDisplay,
              Reminders: remindersStr,
              Tags: fullTask.tags?.join(", ") ?? "-",
              Checklist: checklistDisplay,
              Status: fullTask.status === 2 ? "Completed" : "Active",
              Created: formatDate(fullTask.createdTime),
              Modified: formatDate(fullTask.modifiedTime),
            },
            [
              "ID",
              "Title",
              "Content",
              "Project",
              "Priority",
              "Due Date",
              "Repeat",
              "Reminders",
              "Tags",
              "Checklist",
              "Status",
              "Created",
              "Modified",
            ]
          );

          // Display checklist items if present
          if (items.length > 0) {
            console.log("");
            printChecklistItems(items);
          }
        }
      })
    );

  // closed command
  task
    .command("closed")
    .description("List closed tasks")
    .option("-p, --project <id>", "Filter by project ID")
    .option("--status <status>", "Filter by status (Completed, Abandoned)", "Completed")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const tasks = await client.getClosedTasks(
          options.status,
          options.project
        );

        if (options.json) {
          printJson(tasks);
        } else if (tasks.length === 0) {
          printInfo("No closed tasks found");
        } else {
          printTasksTable(tasks);
        }
      })
    );

  // add command
  task
    .command("add <title>")
    .description("Create a new task")
    .option("-p, --project <id>", "Project ID")
    .option("-c, --content <text>", "Task content/description")
    .option("--priority <level>", "Priority (high, medium, low, none)")
    .option("-d, --due <date>", "Due date (YYYY-MM-DD, today, tomorrow, +3d)")
    .option("-t, --tag <name>", "Tag name (can be used multiple times)", (val, arr: string[]) => {
      arr.push(val);
      return arr;
    }, [])
    .option("-r, --reminder <time>", "Reminder time (on-time, 15m, 1h, 1d, 2h30m) - requires --due date - can be used multiple times", (val, arr: string[]) => {
      arr.push(val);
      return arr;
    }, [])
    .option("--repeat <pattern>", "Repeat pattern (daily, weekly, monthly, yearly, weekly:mon,wed,fri, monthly:first-mon)")
    .option("--repeat-until <date>", "End repeat on date (YYYY-MM-DD)")
    .option("--repeat-count <n>", "End repeat after N occurrences", parseInt)
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, title: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Build task data
        const taskData: Parameters<typeof client.createTask>[0] = { title };

        if (options.project) {
          taskData.projectId = options.project;
        }
        if (options.content) {
          taskData.content = options.content;
        }
        if (options.priority) {
          taskData.priority = parsePriority(options.priority);
        }
        if (options.due) {
          const dueDate = parseDate(options.due);
          if (dueDate) {
            taskData.dueDate = toISODate(dueDate);
          } else {
            printError(`Invalid date format: ${options.due}`);
            process.exit(1);
          }
        }
        if (options.tag && options.tag.length > 0) {
          taskData.tags = options.tag;
        }
        if (options.reminder && options.reminder.length > 0) {
          // Reminders require a reference time (due date or start date)
          if (!options.due) {
            printError("Reminders require a due date");
            printInfo("Use --due to set a due date for this task");
            printInfo("Example: tt task add 'Meeting prep' --due tomorrow --reminder 1h");
            process.exit(1);
          }

          const reminders = [];
          for (const timeStr of options.reminder) {
            const reminder = createReminder(timeStr);
            if (!reminder) {
              printError(`Invalid reminder format: ${timeStr}`);
              printInfo("Supported formats:");
              printInfo("  on-time    - Remind at task time");
              printInfo("  15m        - 15 minutes before");
              printInfo("  1h         - 1 hour before");
              printInfo("  2h30m      - 2 hours 30 minutes before");
              printInfo("  1d         - 1 day before");
              printInfo("Can combine: 1d2h30m for 1 day, 2 hours, 30 minutes");
              process.exit(1);
            }
            reminders.push(reminder);
          }
          if (reminders.length > MAX_REMINDERS_PER_TASK) {
            printError(`Maximum ${MAX_REMINDERS_PER_TASK} reminders allowed per task`);
            process.exit(1);
          }
          taskData.reminders = reminders;
        }

        // Handle repeat pattern
        if (options.repeat) {
          // Repeat requires a start/due date
          if (!options.due) {
            printError("Repeat pattern requires a due date");
            printInfo("Use --due to set a due date for this task");
            printInfo("Example: tt task add 'Daily standup' --due tomorrow --repeat daily");
            process.exit(1);
          }

          // Validate repeat-until and repeat-count are mutually exclusive
          if (options.repeatUntil && options.repeatCount) {
            printError("Cannot use both --repeat-until and --repeat-count");
            process.exit(1);
          }

          try {
            const repeatOptions: { until?: string; count?: number } = {};
            if (options.repeatUntil) {
              repeatOptions.until = options.repeatUntil;
            }
            if (options.repeatCount) {
              repeatOptions.count = options.repeatCount;
            }

            const parsed = parseRepeatPattern(options.repeat, repeatOptions);
            taskData.repeatFlag = parsed.repeatFlag;
            taskData.repeatFrom = REPEAT_FROM_DEFAULT; // Standard value observed from TickTick web app
            
            // Set repeatFirstDate to the due date
            if (taskData.dueDate) {
              taskData.repeatFirstDate = taskData.dueDate;
            }
          } catch (err) {
            printError(err instanceof Error ? err.message : `Invalid repeat pattern: ${options.repeat}`);
            printInfo("Supported patterns:");
            printInfo("  daily              - Every day");
            printInfo("  weekly             - Every week");
            printInfo("  weekly:mon,wed,fri - Weekly on specific days");
            printInfo("  weekly:2           - Every 2 weeks");
            printInfo("  monthly            - Every month");
            printInfo("  monthly:15         - Monthly on the 15th");
            printInfo("  monthly:first-mon  - First Monday of each month");
            printInfo("  yearly             - Every year");
            printInfo("");
            printInfo("End conditions:");
            printInfo("  --repeat-until 2026-01-24  - End on specific date");
            printInfo("  --repeat-count 10          - End after 10 occurrences");
            process.exit(1);
          }
        }

        const task = await client.createTask(taskData);

        if (options.json) {
          printJson(task);
        } else {
          printSuccess(`Created task: ${task.title}`);
          printInfo(`ID: ${task.id}`);
        }
      })
    );

  // edit command
  task
    .command("edit <id>")
    .description("Edit an existing task")
    .option("--title <text>", "New title")
    .option("-c, --content <text>", "New content/description")
    .option("-p, --project <id>", "New project ID")
    .option("--priority <level>", "New priority (high, medium, low, none)")
    .option("-d, --due <date>", "New due date (YYYY-MM-DD, today, tomorrow, +3d)")
    .option("-r, --reminder <time>", "Reminder time (on-time, 15m, 1h, 1d, 2h30m) - requires --due date - can be used multiple times", (val, arr: string[]) => {
      arr.push(val);
      return arr;
    }, [])
    .option("--clear-reminders", "Remove all reminders from task")
    .option("--repeat <pattern>", "Repeat pattern (daily, weekly, monthly, yearly, weekly:mon,wed,fri)")
    .option("--repeat-until <date>", "End repeat on date (YYYY-MM-DD)")
    .option("--repeat-count <n>", "End repeat after N occurrences", parseInt)
    .option("--clear-repeat", "Remove repeat pattern from task")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task first
        const tasks = await client.getTasks();
        const foundTask = findTaskById(tasks, id);

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        // Build update data
        const updateData: Parameters<typeof client.updateTask>[0] = {
          id: foundTask.id,
          projectId: foundTask.projectId, // Always include projectId for proper task updates
        };

        if (options.title) {
          updateData.title = options.title;
        }
        if (options.content) {
          updateData.content = options.content;
        }
        if (options.project) {
          updateData.projectId = options.project;
        }
        if (options.priority) {
          updateData.priority = parsePriority(options.priority);
        }
        if (options.due) {
          const dueDate = parseDate(options.due);
          if (dueDate) {
            updateData.dueDate = toISODate(dueDate);
          } else {
            printError(`Invalid date format: ${options.due}`);
            process.exit(1);
          }
        }
        if (options.clearReminders) {
          updateData.reminders = [];
        } else if (options.reminder && options.reminder.length > 0) {
          // Reminders require a reference time (due date or start date)
          // Check if task already has a due date OR if they're setting one now
          const willHaveDueDate = options.due || foundTask.dueDate || foundTask.startDate;
          if (!willHaveDueDate) {
            printError("Reminders require a due date");
            printInfo("This task has no due date. Use --due to set one");
            printInfo("Example: tt task edit <id> --due tomorrow --reminder 1h");
            process.exit(1);
          }

          const reminders = [];
          for (const timeStr of options.reminder) {
            const reminder = createReminder(timeStr);
            if (!reminder) {
              printError(`Invalid reminder format: ${timeStr}`);
              printInfo("Supported formats:");
              printInfo("  on-time    - Remind at task time");
              printInfo("  15m        - 15 minutes before");
              printInfo("  1h         - 1 hour before");
              printInfo("  2h30m      - 2 hours 30 minutes before");
              printInfo("  1d         - 1 day before");
              printInfo("Can combine: 1d2h30m for 1 day, 2 hours, 30 minutes");
              process.exit(1);
            }
            reminders.push(reminder);
          }
          if (reminders.length > MAX_REMINDERS_PER_TASK) {
            printError(`Maximum ${MAX_REMINDERS_PER_TASK} reminders allowed per task`);
            process.exit(1);
          }
          updateData.reminders = reminders;
        }

        // Handle repeat pattern
        if (options.clearRepeat) {
          // Clear repeat by setting repeatFlag to empty/null
          updateData.repeatFlag = "";
          updateData.repeatFrom = undefined;
          updateData.repeatFirstDate = undefined;
        } else if (options.repeat) {
          // Repeat requires a start/due date
          const willHaveDueDate = options.due || foundTask.dueDate || foundTask.startDate;
          if (!willHaveDueDate) {
            printError("Repeat pattern requires a due date");
            printInfo("This task has no due date. Use --due to set one");
            printInfo("Example: tt task edit <id> --due tomorrow --repeat daily");
            process.exit(1);
          }

          // Validate repeat-until and repeat-count are mutually exclusive
          if (options.repeatUntil && options.repeatCount) {
            printError("Cannot use both --repeat-until and --repeat-count");
            process.exit(1);
          }

          try {
            const repeatOptions: { until?: string; count?: number } = {};
            if (options.repeatUntil) {
              repeatOptions.until = options.repeatUntil;
            }
            if (options.repeatCount) {
              repeatOptions.count = options.repeatCount;
            }

            const parsed = parseRepeatPattern(options.repeat, repeatOptions);
            updateData.repeatFlag = parsed.repeatFlag;
            updateData.repeatFrom = REPEAT_FROM_DEFAULT; // Standard value observed from TickTick web app
            
            // Set repeatFirstDate to the due date (existing or new)
            const dueDate = options.due ? toISODate(parseDate(options.due)!) : foundTask.dueDate;
            if (dueDate) {
              updateData.repeatFirstDate = dueDate;
            }
          } catch (err) {
            printError(err instanceof Error ? err.message : `Invalid repeat pattern: ${options.repeat}`);
            printInfo("Supported patterns:");
            printInfo("  daily              - Every day");
            printInfo("  weekly             - Every week");
            printInfo("  weekly:mon,wed,fri - Weekly on specific days");
            printInfo("  weekly:2           - Every 2 weeks");
            printInfo("  monthly            - Every month");
            printInfo("  monthly:15         - Monthly on the 15th");
            printInfo("  monthly:first-mon  - First Monday of each month");
            printInfo("  yearly             - Every year");
            printInfo("");
            printInfo("End conditions:");
            printInfo("  --repeat-until 2026-01-24  - End on specific date");
            printInfo("  --repeat-count 10          - End after 10 occurrences");
            process.exit(1);
          }
        }

        const task = await client.updateTask(updateData);

        if (options.json) {
          printJson(task);
        } else {
          printSuccess(`Updated task: ${foundTask.title}`);
        }
      })
    );

  // done command
  task
    .command("done <id>")
    .description("Mark a task as complete")
    .action(
      handleError(async function (this: Command, id: string) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task first
        const tasks = await client.getTasks();
        const foundTask = findTaskById(tasks, id);

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        if (!foundTask.projectId) {
          printError(`Task has no projectId: ${id}`);
          process.exit(1);
        }
        await client.completeTask(foundTask.id, foundTask.projectId);
        printSuccess(`Completed: ${foundTask.title}`);
      })
    );

  // abandon command
  task
    .command("abandon <id>")
    .description("Mark a task as abandoned")
    .action(
      handleError(async function (this: Command, id: string) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task first
        const tasks = await client.getTasks();
        const foundTask = findTaskById(tasks, id);

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        if (!foundTask.projectId) {
          printError(`Task has no projectId: ${id}`);
          process.exit(1);
        }
        await client.abandonTask(foundTask.id, foundTask.projectId);
        printSuccess(`Abandoned: ${foundTask.title}`);
      })
    );

  // reopen command
  task
    .command("reopen <id>")
    .description("Reopen a closed task")
    .action(
      handleError(async function (this: Command, id: string) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Check closed tasks
        const closedTasks = await client.getClosedTasks();
        const foundTask = findTaskById(closedTasks, id);

        if (!foundTask) {
          printError(`Closed task not found: ${id}`);
          process.exit(1);
        }

        if (!foundTask.projectId) {
          printError(`Task has no projectId: ${id}`);
          process.exit(1);
        }
        await client.reopenTask(foundTask.id, foundTask.projectId);
        printSuccess(`Reopened: ${foundTask.title}`);
      })
    );

  // delete command
  task
    .command("delete <id>")
    .description("Delete a task")
    .option("-f, --force", "Skip confirmation")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task first
        const tasks = await client.getTasks();
        const foundTask = findTaskById(tasks, id);

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        if (!foundTask.projectId) {
          printError(`Task has no projectId, cannot delete`);
          process.exit(1);
        }
        await client.deleteTasks([foundTask.id], foundTask.projectId);
        printSuccess(`Deleted: ${foundTask.title}`);
      })
    );

  // subtask add command
  task
    .command("subtask:add <taskId> <parentId>")
    .description("Make a task a subtask of another task")
    .action(
      handleError(async function (this: Command, taskId: string, parentId: string) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find both tasks
        const tasks = await client.getTasks();
        const childTask = findTaskById(tasks, taskId);
        const parentTask = findTaskById(tasks, parentId);

        if (!childTask) {
          printError(`Task not found: ${taskId}`);
          process.exit(1);
        }
        if (!parentTask) {
          printError(`Parent task not found: ${parentId}`);
          process.exit(1);
        }

        await client.setTaskParent(childTask.id, parentTask.id);
        printSuccess(`Made "${childTask.title}" a subtask of "${parentTask.title}"`);
      })
    );

  // subtask unset command
  task
    .command("subtask:unset <taskId>")
    .description("Remove a task from its parent (make it a top-level task)")
    .action(
      handleError(async function (this: Command, taskId: string) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task
        const tasks = await client.getTasks();
        const foundTask = findTaskById(tasks, taskId);

        if (!foundTask) {
          printError(`Task not found: ${taskId}`);
          process.exit(1);
        }

        await client.unsetTaskParent(foundTask.id);
        printSuccess(`Removed "${foundTask.title}" from parent`);
      })
    );

  return task;
}
