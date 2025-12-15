/**
 * Task filtering utilities.
 *
 * Pure functions for filtering and finding tasks, extracted from
 * command handlers to enable unit testing.
 */
import type { Task } from "../api/types.js";
import { PRIORITY_MAP } from "../utils/priority.js";

/**
 * Filter tasks by project ID.
 *
 * @param tasks - Array of tasks to filter
 * @param projectId - Project ID to match
 * @returns Tasks that belong to the specified project
 */
export function filterByProject(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId);
}

/**
 * Filter tasks by tag name.
 *
 * @param tasks - Array of tasks to filter
 * @param tagName - Tag name to match
 * @returns Tasks that have the specified tag
 */
export function filterByTag(tasks: Task[], tagName: string): Task[] {
  return tasks.filter((t) => t.tags?.includes(tagName));
}

/**
 * Filter tasks by priority level.
 *
 * @param tasks - Array of tasks to filter
 * @param priorityName - Priority name (high, medium, low, none)
 * @returns Tasks with the specified priority, or all tasks if priority is unknown
 */
export function filterByPriority(tasks: Task[], priorityName: string): Task[] {
  const targetPriority = PRIORITY_MAP[priorityName.toLowerCase()];
  if (targetPriority === undefined) {
    return tasks;
  }
  return tasks.filter((t) => t.priority === targetPriority);
}

/**
 * Find a task by exact ID or ID prefix.
 *
 * @param tasks - Array of tasks to search
 * @param idOrPrefix - Full task ID or prefix to match
 * @returns The matching task, or undefined if not found
 */
export function findTaskById(tasks: Task[], idOrPrefix: string): Task | undefined {
  return tasks.find((t) => t.id === idOrPrefix || t.id?.startsWith(idOrPrefix));
}
