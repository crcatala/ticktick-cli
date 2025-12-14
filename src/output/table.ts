/**
 * Table rendering utilities using cli-table3.
 */
import Table from "cli-table3";
import { pc } from "./colors.js";
import { formatPriority, truncateId } from "./format.js";
import { formatDate } from "../utils/date.js";
import type { Task, Project, Tag, ProjectGroup } from "../api/types.js";

/**
 * Print a table of tasks.
 */
export function printTasksTable(tasks: Task[]): void {
  const table = new Table({
    head: [
      pc.cyan("ID"),
      pc.cyan("Title"),
      pc.cyan("Due"),
      pc.cyan("Priority"),
      pc.cyan("Project"),
    ],
    style: { head: [], border: [] },
  });

  for (const task of tasks) {
    table.push([
      truncateId(task.id),
      task.title?.slice(0, 50) ?? "-",
      formatDate(task.dueDate),
      formatPriority(task.priority),
      truncateId(task.projectId),
    ]);
  }

  console.log(table.toString());
}

/**
 * Print a table of projects.
 */
export function printProjectsTable(projects: Project[]): void {
  const table = new Table({
    head: [
      pc.cyan("ID"),
      pc.cyan("Name"),
      pc.cyan("Kind"),
      pc.cyan("Color"),
    ],
    style: { head: [], border: [] },
  });

  for (const project of projects) {
    table.push([
      truncateId(project.id),
      project.name ?? "-",
      project.kind ?? "TASK",
      project.color ?? "-",
    ]);
  }

  console.log(table.toString());
}

/**
 * Print a table of tags.
 */
export function printTagsTable(tags: Tag[]): void {
  const table = new Table({
    head: [pc.cyan("Name"), pc.cyan("Color"), pc.cyan("Parent")],
    style: { head: [], border: [] },
  });

  for (const tag of tags) {
    table.push([tag.name ?? "-", tag.color ?? "-", tag.parent ?? "-"]);
  }

  console.log(table.toString());
}

/**
 * Print a table of project groups.
 */
export function printGroupsTable(groups: ProjectGroup[]): void {
  const table = new Table({
    head: [pc.cyan("ID"), pc.cyan("Name")],
    style: { head: [], border: [] },
  });

  for (const group of groups) {
    table.push([truncateId(group.id), group.name ?? "-"]);
  }

  console.log(table.toString());
}
