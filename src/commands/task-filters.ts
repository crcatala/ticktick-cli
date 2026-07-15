/**
 * Task filtering and reference-resolution utilities.
 */
import type { Project, Task } from "../api/types.js";
import { PRIORITY_MAP } from "../utils/priority.js";

export type ReferenceResolution<T> =
  | { value: T; error?: never; matches?: never }
  | { value?: never; error: "not_found" | "ambiguous"; matches: T[] };

function resolveReference<T extends { id?: string | null; title?: string | null; name?: string | null }>(
  items: T[],
  reference: string,
  label: "task" | "project"
): ReferenceResolution<T> {
  const trimmed = reference.trim();
  if (!trimmed) return { error: "not_found", matches: [] };

  const exactId = items.find((item) => item.id === trimmed);
  if (exactId) return { value: exactId };

  const lowerReference = trimmed.toLowerCase();
  const textFor = (item: T) => label === "task" ? item.title : item.name;
  const exactTextMatches = items.filter((item) => textFor(item)?.toLowerCase() === lowerReference);
  if (exactTextMatches.length === 1) return { value: exactTextMatches[0] };
  if (exactTextMatches.length > 1) return { error: "ambiguous", matches: exactTextMatches };

  const prefixMatches = items.filter((item) => item.id?.startsWith(trimmed));
  if (prefixMatches.length === 1) return { value: prefixMatches[0] };
  if (prefixMatches.length > 1) return { error: "ambiguous", matches: prefixMatches };

  // Project names support unambiguous case-insensitive prefixes; task titles remain exact-only.
  if (label === "project") {
    const textPrefixMatches = items.filter((item) => textFor(item)?.toLowerCase().startsWith(lowerReference));
    if (textPrefixMatches.length === 1) return { value: textPrefixMatches[0] };
    if (textPrefixMatches.length > 1) return { error: "ambiguous", matches: textPrefixMatches };
  }

  return { error: "not_found", matches: [] };
}

/** Resolve a task by exact ID, unambiguous ID prefix, or exact title. */
export function resolveTaskReference(tasks: Task[], reference: string): ReferenceResolution<Task> {
  return resolveReference(tasks, reference, "task");
}

/** Resolve a project by exact ID, case-insensitive exact name, or unambiguous prefix. */
export function resolveProjectReference(projects: Project[], reference: string): ReferenceResolution<Project> {
  return resolveReference(projects, reference, "project");
}

/** Format a safe, actionable error for a failed task reference. */
export function formatTaskResolutionError(reference: string, resolution: ReferenceResolution<Task>): string {
  if (resolution.error === "not_found") return `Task not found: ${reference}`;
  const matches = (resolution.matches ?? [])
    .map((task) => `  ${task.id ?? "-"}  ${task.title ?? "(untitled)"}  (${task.projectId ?? "no project"})`)
    .join("\n");
  return `Multiple tasks match "${reference}":\n${matches}\nUse --project to narrow the match, or provide the full task ID.`;
}

/** Format a safe, actionable error for a failed project reference. */
export function formatProjectResolutionError(reference: string, resolution: ReferenceResolution<Project>): string {
  if (resolution.error === "not_found") return `Project not found: ${reference}`;
  const matches = (resolution.matches ?? [])
    .map((project) => `  ${project.id ?? "-"}  ${project.name ?? "(unnamed)"}`)
    .join("\n");
  return `Multiple projects match "${reference}":\n${matches}\nProvide the full project ID.`;
}

export function filterByProject(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((task) => task.projectId === projectId);
}

export function filterByTag(tasks: Task[], tagName: string): Task[] {
  return tasks.filter((task) => task.tags?.includes(tagName));
}

export function filterByPriority(tasks: Task[], priorityName: string): Task[] {
  const targetPriority = PRIORITY_MAP[priorityName.toLowerCase()];
  return targetPriority === undefined ? tasks : tasks.filter((task) => task.priority === targetPriority);
}

export function filterBySearch(tasks: Task[], query: string, caseSensitive = false): Task[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return tasks;
  const searchQuery = caseSensitive ? trimmedQuery : trimmedQuery.toLowerCase();
  const matches = (text: string | null | undefined): boolean => {
    if (!text) return false;
    return (caseSensitive ? text : text.toLowerCase()).includes(searchQuery);
  };
  return tasks.filter((task) =>
    matches(task.title) || matches(task.content) || matches(task.desc) ||
    task.items?.some((item) => matches(item.title))
  );
}

/** Resolve a task reference, throwing an actionable error when it is ambiguous. */
export function findTaskById(tasks: Task[], idOrPrefix: string): Task | undefined {
  const resolution = resolveTaskReference(tasks, idOrPrefix);
  if (resolution.error === "ambiguous") {
    throw new Error(formatTaskResolutionError(idOrPrefix, resolution));
  }
  return resolution.value;
}

/** Resolve a project reference, throwing an actionable error when it is ambiguous. */
export function resolveProjectId(projects: Project[], identifier: string): string | undefined {
  const resolution = resolveProjectReference(projects, identifier);
  if (resolution.error === "ambiguous") {
    throw new Error(formatProjectResolutionError(identifier, resolution));
  }
  return resolution.value?.id;
}
