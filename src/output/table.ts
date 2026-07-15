/**
 * Simple table rendering utilities.
 * Replaces cli-table3 with ~60 lines of code.
 */
import { cyan, dim } from "./colors.js";
import { formatPriority, truncateId } from "./format.js";
import { formatDate } from "../utils/date.js";
import { formatRepeatFlag } from "../utils/repeat.js";
import type { Task, Project, Tag, ProjectGroup } from "../api/types.js";

/**
 * Build a map of group ID -> group name for folder lookups.
 */
function buildGroupMap(groups: ProjectGroup[]): Map<string, string> {
  const groupMap = new Map<string, string>();
  for (const g of groups) {
    if (g.id && g.name) {
      groupMap.set(g.id, g.name);
    }
  }
  return groupMap;
}

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
  const escape = String.fromCharCode(0x1b);
  return str.replace(new RegExp(`${escape}\\[[0-9;]*m`, "g"), "");
}

/**
 * Print a table of tasks.
 * Shows repeat column only if any task has a repeat pattern.
 */
export function printTasksTable(tasks: Task[]): void {
  // Check if any task has a repeat pattern
  const hasRepeat = tasks.some((t) => t.repeatFlag);
  const hasNotes = tasks.some((t) => t.kind === "NOTE");

  if (hasRepeat) {
    const headers = ["ID", "Title", ...(hasNotes ? ["Type"] : []), "Due", "Repeat", "Priority", "Project"];
    const rows = tasks.map((task) => [
      truncateId(task.id),
      task.title?.slice(0, 40) ?? "-",
      ...(hasNotes ? [task.kind === "NOTE" ? "Note" : "Task"] : []),
      formatDate(task.dueDate),
      formatRepeatFlag(task.repeatFlag) ?? "-",
      formatPriority(task.priority),
      truncateId(task.projectId),
    ]);
    renderTable(headers, rows);
  } else {
    const headers = ["ID", "Title", ...(hasNotes ? ["Type"] : []), "Due", "Priority", "Project"];
    const rows = tasks.map((task) => [
      truncateId(task.id),
      task.title?.slice(0, 50) ?? "-",
      ...(hasNotes ? [task.kind === "NOTE" ? "Note" : "Task"] : []),
      formatDate(task.dueDate),
      formatPriority(task.priority),
      truncateId(task.projectId),
    ]);
    renderTable(headers, rows);
  }
}

/**
 * Print a table of projects.
 * @param projects - Projects to display
 * @param groups - Optional groups for folder name lookup
 */
export function printProjectsTable(projects: Project[], groups?: ProjectGroup[]): void {
  const groupMap = groups ? buildGroupMap(groups) : new Map<string, string>();

  const headers = ["ID", "Name", "Folder", "Kind", "Color"];
  const rows = projects.map((project) => {
    const folderName = project.groupId ? (groupMap.get(project.groupId) ?? truncateId(project.groupId)) : "-";
    return [
      truncateId(project.id),
      project.name ?? "-",
      folderName,
      project.kind ?? "TASK",
      project.color ?? "-",
    ];
  });
  renderTable(headers, rows);
}

/**
 * Print projects grouped by folder.
 * @param projects - Projects to display
 * @param groups - Groups for folder names
 */
export function printProjectsByFolder(projects: Project[], groups: ProjectGroup[]): void {
  const groupMap = buildGroupMap(groups);

  // Group projects by folder
  const byFolder = new Map<string | null, Project[]>();
  for (const project of projects) {
    const folderId = project.groupId ?? null;
    if (!byFolder.has(folderId)) {
      byFolder.set(folderId, []);
    }
    byFolder.get(folderId)!.push(project);
  }

  // Sort folders: named folders first (alphabetically), then "No Folder"
  const folderIds = Array.from(byFolder.keys()).sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    const nameA = groupMap.get(a) ?? a;
    const nameB = groupMap.get(b) ?? b;
    return nameA.localeCompare(nameB);
  });

  // Print each folder section
  for (const folderId of folderIds) {
    const folderProjects = byFolder.get(folderId)!;
    const folderName = folderId ? (groupMap.get(folderId) ?? folderId) : "(No Folder)";
    
    console.log();
    console.log(cyan(`📁 ${folderName}`));
    console.log(dim("─".repeat(folderName.length + 3)));
    
    const headers = ["ID", "Name", "Kind", "Color"];
    const rows = folderProjects.map((project) => [
      truncateId(project.id),
      project.name ?? "-",
      project.kind ?? "TASK",
      project.color ?? "-",
    ]);
    renderTable(headers, rows);
  }
}

/**
 * Print a simple table of projects (without folder column).
 * Used when showing projects within a specific folder.
 */
export function printProjectsTableSimple(projects: Project[]): void {
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
