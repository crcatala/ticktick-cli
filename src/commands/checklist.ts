/**
 * Checklist commands.
 * Manage checklist items within tasks.
 */
import { Command } from "commander";
import { getClient, generateObjectId } from "../api/client.js";
import type { ChecklistItemInput, ChecklistItem } from "../api/types.js";
import {
  printError,
  printSuccess,
  printInfo,
  printJson,
} from "../output/index.js";
import { handleError } from "./errors.js";
import { getGlobalOptions } from "../index.js";
import { findTaskById } from "./task-filters.js";

/**
 * Find a checklist item by exact ID or ID prefix.
 */
function findItemById(
  items: ChecklistItem[],
  idOrPrefix: string
): { item: ChecklistItem; index: number } | undefined {
  const index = items.findIndex(
    (item) => item.id === idOrPrefix || item.id?.startsWith(idOrPrefix)
  );
  if (index === -1) return undefined;
  return { item: items[index], index };
}

/**
 * Format checklist items for display.
 */
function printChecklistItems(
  items: ChecklistItem[],
  taskTitle?: string | null
): void {
  if (items.length === 0) {
    printInfo("No checklist items");
    return;
  }

  const completed = items.filter((i) => i.status === 1).length;
  const header = taskTitle
    ? `Checklist for "${taskTitle}" (${completed}/${items.length}):`
    : `Checklist (${completed}/${items.length}):`;
  printInfo(header);

  // Sort by sortOrder
  const sorted = [...items].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  for (const item of sorted) {
    const checkbox = item.status === 1 ? "☑" : "☐";
    const shortId = item.id?.slice(0, 8) ?? "?";
    console.log(`  ${checkbox} [${shortId}] ${item.title ?? "(untitled)"}`);
  }
}

/**
 * Calculate the next sortOrder value for a new item.
 * Uses the same large increment as the TickTick web app.
 */
function getNextSortOrder(items: ChecklistItem[]): number {
  if (items.length === 0) return 0;
  const maxOrder = Math.max(...items.map((i) => i.sortOrder ?? 0));
  // TickTick uses 1099511627776 (2^40) as increment
  return maxOrder + 1099511627776;
}

export function createChecklistCommand(): Command {
  const checklist = new Command("checklist").description(
    "Manage checklist items within tasks"
  );

  // list command
  checklist
    .command("list <taskId>")
    .description("List checklist items for a task")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, taskId: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // First find the task to get its projectId
        const tasks = await client.getTasks();
        const task = findTaskById(tasks, taskId);

        if (!task) {
          printError(`Task not found: ${taskId}`);
          process.exit(1);
        }

        if (!task.projectId) {
          printError(`Task has no project ID: ${taskId}`);
          process.exit(1);
        }

        // Get full task details including checklist items
        const fullTask = await client.getTask(task.id, task.projectId);
        const items = fullTask.items ?? [];

        if (options.json) {
          printJson(items);
        } else {
          printChecklistItems(items, fullTask.title);
        }
      })
    );

  // add command
  checklist
    .command("add <taskId> <title>")
    .description("Add a checklist item to a task")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (
        this: Command,
        taskId: string,
        title: string,
        options
      ) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task
        const tasks = await client.getTasks();
        const task = findTaskById(tasks, taskId);

        if (!task) {
          printError(`Task not found: ${taskId}`);
          process.exit(1);
        }

        if (!task.projectId) {
          printError(`Task has no project ID: ${taskId}`);
          process.exit(1);
        }

        // Get full task details
        const fullTask = await client.getTask(task.id, task.projectId);
        const existingItems = fullTask.items ?? [];

        // Create new item
        const newItem: ChecklistItemInput = {
          id: generateObjectId(),
          title,
          status: 0,
          sortOrder: getNextSortOrder(existingItems),
        };

        // Build updated items array
        const updatedItems: ChecklistItemInput[] = [
          ...existingItems.map((item: ChecklistItem) => ({
            id: item.id ?? generateObjectId(),
            title: item.title ?? "",
            status: item.status ?? 0,
            sortOrder: item.sortOrder ?? 0,
            completedTime: item.completedTime ?? undefined,
          })),
          newItem,
        ];

        // Update task with new items
        await client.updateTask({
          id: task.id,
          projectId: task.projectId,
          items: updatedItems,
        });

        if (options.json) {
          printJson(newItem);
        } else {
          printSuccess(`Added checklist item: ${title}`);
        }
      })
    );

  // toggle command
  checklist
    .command("toggle <taskId> <itemId>")
    .description("Toggle checklist item completion status")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (
        this: Command,
        taskId: string,
        itemId: string,
        options
      ) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task
        const tasks = await client.getTasks();
        const task = findTaskById(tasks, taskId);

        if (!task) {
          printError(`Task not found: ${taskId}`);
          process.exit(1);
        }

        if (!task.projectId) {
          printError(`Task has no project ID: ${taskId}`);
          process.exit(1);
        }

        // Get full task details
        const fullTask = await client.getTask(task.id, task.projectId);
        const existingItems = fullTask.items ?? [];

        if (existingItems.length === 0) {
          printError("Task has no checklist items");
          process.exit(1);
        }

        // Find the item to toggle
        const found = findItemById(existingItems, itemId);
        if (!found) {
          printError(`Checklist item not found: ${itemId}`);
          process.exit(1);
        }

        const targetItem = found.item;
        const isCompleting = targetItem.status !== 1;

        // Build updated items array
        const updatedItems: ChecklistItemInput[] = existingItems.map(
          (item: ChecklistItem) => {
            const base: ChecklistItemInput = {
              id: item.id ?? generateObjectId(),
              title: item.title ?? "",
              status: item.status ?? 0,
              sortOrder: item.sortOrder ?? 0,
            };

            if (item.completedTime) {
              base.completedTime = item.completedTime;
            }

            // Toggle the target item
            if (item.id === targetItem.id) {
              if (isCompleting) {
                base.status = 1;
                base.completedTime = new Date().toISOString();
              } else {
                base.status = 0;
                delete base.completedTime;
              }
            }

            return base;
          }
        );

        // Update task
        await client.updateTask({
          id: task.id,
          projectId: task.projectId,
          items: updatedItems,
        });

        if (options.json) {
          const updatedItem = updatedItems.find((i) => i.id === targetItem.id);
          printJson(updatedItem);
        } else {
          const action = isCompleting ? "Completed" : "Uncompleted";
          printSuccess(`${action}: ${targetItem.title}`);
        }
      })
    );

  // delete command
  checklist
    .command("delete <taskId> <itemId>")
    .description("Delete a checklist item from a task")
    .action(
      handleError(async function (
        this: Command,
        taskId: string,
        itemId: string
      ) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the task
        const tasks = await client.getTasks();
        const task = findTaskById(tasks, taskId);

        if (!task) {
          printError(`Task not found: ${taskId}`);
          process.exit(1);
        }

        if (!task.projectId) {
          printError(`Task has no project ID: ${taskId}`);
          process.exit(1);
        }

        // Get full task details
        const fullTask = await client.getTask(task.id, task.projectId);
        const existingItems = fullTask.items ?? [];

        if (existingItems.length === 0) {
          printError("Task has no checklist items");
          process.exit(1);
        }

        // Find the item to delete
        const found = findItemById(existingItems, itemId);
        if (!found) {
          printError(`Checklist item not found: ${itemId}`);
          process.exit(1);
        }

        const targetItem = found.item;

        // Build updated items array without the deleted item
        const updatedItems: ChecklistItemInput[] = existingItems
          .filter((item: ChecklistItem) => item.id !== targetItem.id)
          .map((item: ChecklistItem) => ({
            id: item.id ?? generateObjectId(),
            title: item.title ?? "",
            status: item.status ?? 0,
            sortOrder: item.sortOrder ?? 0,
            completedTime: item.completedTime ?? undefined,
          }));

        // Update task
        await client.updateTask({
          id: task.id,
          projectId: task.projectId,
          items: updatedItems,
        });

        printSuccess(`Deleted checklist item: ${targetItem.title}`);
      })
    );

  return checklist;
}
