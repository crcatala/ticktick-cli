/**
 * Task filtering utilities.
 *
 * Pure functions for filtering and finding tasks, extracted from
 * command handlers to enable unit testing.
 */
import type { Task, Project } from "../api/types.js";
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

/**
 * Search tasks by text query.
 * 
 * Searches in title, content, description (desc), and checklist items.
 * Case-insensitive by default.
 *
 * @param tasks - Array of tasks to search
 * @param query - Search query string (empty/whitespace-only returns all tasks)
 * @param caseSensitive - Whether to perform case-sensitive search (default: false)
 * @returns Tasks that match the search query
 */
export function filterBySearch(
  tasks: Task[],
  query: string,
  caseSensitive = false
): Task[] {
  // Empty or whitespace-only query returns all tasks (no filtering)
  const trimmedQuery = query.trim();
  if (trimmedQuery === "") {
    return tasks;
  }
  
  const searchQuery = caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase();
  
  return tasks.filter((task) => {
    // Helper to check if a string contains the query
    const matches = (text: string | null | undefined): boolean => {
      if (!text) return false;
      const compareText = caseSensitive ? text : text.toLowerCase();
      return compareText.includes(searchQuery);
    };

    // Search in title
    if (matches(task.title)) return true;

    // Search in content
    if (matches(task.content)) return true;

    // Search in description (desc field)
    if (matches(task.desc)) return true;

    // Search in checklist items
    if (task.items && task.items.length > 0) {
      for (const item of task.items) {
        if (matches(item.title)) return true;
      }
    }

    return false;
  });
}

/**
 * Resolve a project identifier to a project ID.
 * 
 * Accepts either:
 * - A project ID (full or prefix)
 * - A project name (case-insensitive match)
 *
 * @param projects - Array of projects to search
 * @param identifier - Project ID, ID prefix, or name
 * @returns The project ID if found, undefined otherwise
 */
export function resolveProjectId(
  projects: Project[],
  identifier: string
): string | undefined {
  // First, try exact ID match
  const exactMatch = projects.find((p) => p.id === identifier);
  if (exactMatch) return exactMatch.id;

  // Try ID prefix match
  const prefixMatch = projects.find((p) => p.id?.startsWith(identifier));
  if (prefixMatch) return prefixMatch.id;

  // Try case-insensitive name match
  const lowerIdentifier = identifier.toLowerCase();
  const nameMatch = projects.find(
    (p) => p.name?.toLowerCase() === lowerIdentifier
  );
  if (nameMatch) return nameMatch.id;

  return undefined;
}
