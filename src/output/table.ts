/**
 * Simple table rendering utilities.
 * Replaces cli-table3 with ~60 lines of code.
 */
import { cyan, dim } from "./colors.js";
import { formatPriority, truncateId } from "./format.js";
import { formatDate } from "../utils/date.js";
import type { Task, Project, Tag, ProjectGroup } from "../api/types.js";

/**
 * Render a table with headers and rows.
 */
function renderTable(headers: string[], rows: string[][]): void {
  if (rows.length === 0) return;

  // Calculate column widths
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => stripAnsi(r[i] || "").length))
  );

  // Print header
  console.log(headers.map((h, i) => cyan(h.padEnd(widths[i]))).join("  "));
  console.log(widths.map((w) => dim("─".repeat(w))).join("  "));

  // Print rows
  for (const row of rows) {
    const cells = row.map((cell, i) => {
      const stripped = stripAnsi(cell || "-");
      const padding = widths[i] - stripped.length;
      return (cell || dim("-")) + " ".repeat(Math.max(0, padding));
    });
    console.log(cells.join("  "));
  }
}

/**
 * Strip ANSI escape codes from a string for width calculation.
 */
function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Print a table of tasks.
 */
export function printTasksTable(tasks: Task[]): void {
  const headers = ["ID", "Title", "Due", "Priority", "Project"];
  const rows = tasks.map((task) => [
    truncateId(task.id),
    task.title?.slice(0, 50) ?? "-",
    formatDate(task.dueDate),
    formatPriority(task.priority),
    truncateId(task.projectId),
  ]);
  renderTable(headers, rows);
}

/**
 * Print a table of projects.
 */
export function printProjectsTable(projects: Project[]): void {
  const headers = ["ID", "Name", "Kind", "Color"];
  const rows = projects.map((project) => [
    truncateId(project.id),
    project.name ?? "-",
    project.kind ?? "TASK",
    project.color ?? "-",
  ]);
  renderTable(headers, rows);
}

/**
 * Print a table of tags.
 */
export function printTagsTable(tags: Tag[]): void {
  const headers = ["Name", "Color", "Parent"];
  const rows = tags.map((tag) => [
    tag.name ?? "-",
    tag.color ?? "-",
    tag.parent ?? "-",
  ]);
  renderTable(headers, rows);
}

/**
 * Print a table of project groups.
 */
export function printGroupsTable(groups: ProjectGroup[]): void {
  const headers = ["ID", "Name"];
  const rows = groups.map((group) => [
    truncateId(group.id),
    group.name ?? "-",
  ]);
  renderTable(headers, rows);
}
