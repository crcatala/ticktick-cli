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
import { handleError } from "./errors.js";
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
          tasks = tasks.filter((t) => t.projectId === options.project);
        }
        if (options.tag) {
          tasks = tasks.filter((t) => t.tags?.includes(options.tag));
        }
        if (options.priority) {
          const priorityMap: Record<string, number> = {
            high: 5,
            medium: 3,
            low: 1,
            none: 0,
          };
          const priority = priorityMap[options.priority.toLowerCase()];
          if (priority !== undefined) {
            tasks = tasks.filter((t) => t.priority === priority);
          }
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
        const foundTask = tasks.find(
          (t) => t.id === id || t.id?.startsWith(id)
        );

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        if (options.json) {
          printJson(foundTask);
        } else {
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
          const priorityMap: Record<string, number> = {
            high: 5,
            medium: 3,
            low: 1,
            none: 0,
          };
          taskData.priority = priorityMap[options.priority.toLowerCase()] ?? 0;
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
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task first
        const tasks = await client.getTasks();
        const foundTask = tasks.find(
          (t) => t.id === id || t.id?.startsWith(id)
        );

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
          const priorityMap: Record<string, number> = {
            high: 5,
            medium: 3,
            low: 1,
            none: 0,
          };
          updateData.priority = priorityMap[options.priority.toLowerCase()] ?? 0;
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
        const foundTask = tasks.find(
          (t) => t.id === id || t.id?.startsWith(id)
        );

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        await client.completeTask(foundTask.id);
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
        const foundTask = tasks.find(
          (t) => t.id === id || t.id?.startsWith(id)
        );

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        await client.abandonTask(foundTask.id);
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
        const foundTask = closedTasks.find(
          (t) => t.id === id || t.id?.startsWith(id)
        );

        if (!foundTask) {
          printError(`Closed task not found: ${id}`);
          process.exit(1);
        }

        await client.reopenTask(foundTask.id);
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
        const foundTask = tasks.find(
          (t) => t.id === id || t.id?.startsWith(id)
        );

        if (!foundTask) {
          printError(`Task not found: ${id}`);
          process.exit(1);
        }

        await client.deleteTasks([foundTask.id]);
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
        const childTask = tasks.find(
          (t) => t.id === taskId || t.id?.startsWith(taskId)
        );
        const parentTask = tasks.find(
          (t) => t.id === parentId || t.id?.startsWith(parentId)
        );

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
        const foundTask = tasks.find(
          (t) => t.id === taskId || t.id?.startsWith(taskId)
        );

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
