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
import { handleError } from "./errors.js";
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
        
        // Determine which tasks to fetch based on status
        const status = options.status?.toLowerCase() ?? "active";
        let tasks: Task[] = [];
        
        if (status === "active") {
          tasks = await client.getTasks();
        } else if (status === "completed") {
          tasks = await client.getClosedTasks("Completed");
        } else if (status === "abandoned") {
          tasks = await client.getClosedTasks("Abandoned");
        } else if (status === "all") {
          // Fetch both active and closed tasks
          const [activeTasks, completedTasks, abandonedTasks] = await Promise.all([
            client.getTasks(),
            client.getClosedTasks("Completed"),
            client.getClosedTasks("Abandoned"),
          ]);
          tasks = [...activeTasks, ...completedTasks, ...abandonedTasks];
        } else {
          printError(`Invalid status: ${status}. Use: active, completed, abandoned, or all`);
          process.exit(1);
        }

        // Apply search filter first (before other filters)
        if (options.search) {
          tasks = filterBySearch(tasks, options.search, options.caseSensitive);
        }

        // Apply project filter (resolve name to ID if needed)
        if (options.project) {
          const projects = await client.getProjects();
          const projectId = resolveProjectId(projects, options.project);
          if (!projectId) {
            printError(`Project not found: ${options.project}`);
            process.exit(1);
          }
          tasks = filterByProject(tasks, projectId);
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
          // Format checklist summary
          const items: ChecklistItem[] = fullTask.items ?? [];
          let checklistDisplay = "-";
          if (items.length > 0) {
            const completed = items.filter(
              (i: ChecklistItem) => i.status === 1
            ).length;
            checklistDisplay = `${completed}/${items.length} completed`;
          }

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
