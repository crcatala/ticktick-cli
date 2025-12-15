/**
 * Task commands.
 */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import type { Task } from "../api/types.js";
import {
  printError,
  printSuccess,
  printInfo,
  printJson,
  printKeyValue,
  printTasksTable,
  formatPriority,
  truncateId,
} from "../output/index.js";
import { formatDate, parseDate, toISODate } from "../utils/date.js";
import { parsePriority } from "../utils/priority.js";
import { createReminder, formatReminderTrigger } from "../utils/reminder.js";
import { handleError } from "./errors.js";

// Maximum reminders per task based on TickTick API observation
// (confirmed from API payload examples showing up to 5 reminders)
const MAX_REMINDERS_PER_TASK = 5;
import {
  filterByProject,
  filterByTag,
  filterByPriority,
  findTaskById,
} from "./task-filters.js";
import { getGlobalOptions } from "../index.js";

export function createTaskCommand(): Command {
  const task = new Command("task").description("Manage tasks");

  // list command
  task
    .command("list")
    .description("List all active tasks")
    .option("-p, --project <id>", "Filter by project ID")
    .option("-t, --tag <name>", "Filter by tag name")
    .option("--priority <level>", "Filter by priority (high, medium, low, none)")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        let tasks = await client.getTasks();

        // Apply filters
        if (options.project) {
          tasks = filterByProject(tasks, options.project);
        }
        if (options.tag) {
          tasks = filterByTag(tasks, options.tag);
        }
        if (options.priority) {
          tasks = filterByPriority(tasks, options.priority);
        }

        if (options.json) {
          printJson(tasks);
        } else if (tasks.length === 0) {
          printInfo("No tasks found");
        } else {
          printTasksTable(tasks);
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

        if (options.json) {
          printJson(foundTask);
        } else {
          // Format reminders for display
          let remindersStr = "-";
          if (foundTask.reminders && foundTask.reminders.length > 0) {
            remindersStr = foundTask.reminders
              .map((r) => formatReminderTrigger(r.trigger))
              .join(", ");
          }

          printKeyValue(
            {
              ID: foundTask.id ?? "-",
              Title: foundTask.title ?? "-",
              Content: foundTask.content ?? "-",
              Project: truncateId(foundTask.projectId),
              Priority: formatPriority(foundTask.priority).replace(
                /\x1b\[[0-9;]*m/g,
                ""
              ),
              "Due Date": formatDate(foundTask.dueDate),
              Reminders: remindersStr,
              Tags: foundTask.tags?.join(", ") ?? "-",
              Status: foundTask.status === 2 ? "Completed" : "Active",
              Created: formatDate(foundTask.createdTime),
              Modified: formatDate(foundTask.modifiedTime),
            },
            [
              "ID",
              "Title",
              "Content",
              "Project",
              "Priority",
              "Due Date",
              "Reminders",
              "Tags",
              "Status",
              "Created",
              "Modified",
            ]
          );
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
    .option("-r, --reminder <time>", "Reminder time (on-time, 15m, 1h, 1d, 2h30m) - can be used multiple times", (val, arr: string[]) => {
      arr.push(val);
      return arr;
    }, [])
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
    .option("-r, --reminder <time>", "Reminder time (on-time, 15m, 1h, 1d, 2h30m) - can be used multiple times", (val, arr: string[]) => {
      arr.push(val);
      return arr;
    }, [])
    .option("--clear-reminders", "Remove all reminders from task")
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
