/** Note commands. */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import type { Project } from "../api/types.js";
import { printError, printInfo, printJson, printSuccess } from "../output/index.js";
import { getGlobalOptions } from "../index.js";
import { handleError } from "./errors.js";
import { formatProjectResolutionError, resolveProjectReference } from "./task-filters.js";

function findByIdOrPrefix<T extends { id?: string | null }>(items: T[], id: string): T | undefined {
  const exact = items.find((item) => item.id === id);
  if (exact) return exact;
  const matches = items.filter((item) => item.id?.startsWith(id));
  if (matches.length > 1) throw new Error(`Multiple items match "${id}". Provide the full ID.`);
  return matches[0];
}

export type NoteProjectResolution =
  | { project: Project; error?: never }
  | { project?: never; error: string };

/** Resolve a project reference and ensure it is a TickTick note list. */
export function resolveNoteProject(projects: Project[], id: string): NoteProjectResolution {
  const resolution = resolveProjectReference(projects, id);
  if (resolution.error) return { error: formatProjectResolutionError(id, resolution) };
  const project = resolution.value;
  if (project.kind !== "NOTE") {
    return { error: `Project "${project.name ?? project.id}" is not a note list` };
  }
  return { project };
}

export function createNoteCommand(): Command {
  const note = new Command("note").description("Manage notes");

  note
    .command("add <title>")
    .description("Create a note in a note list")
    .requiredOption("-p, --project <id>", "Note project ID")
    .option("-c, --content <text>", "Note content")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, title: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const resolution = resolveNoteProject(await client.getProjects(), options.project);
        if (resolution.error) {
          printError(resolution.error);
          if (resolution.error.includes("is not a note list")) {
            printInfo("Create one with: tt project add <name> --kind NOTE");
          }
          process.exit(1);
          return;
        }
        const project = resolution.project!;

        const created = await client.createTask({
          title,
          projectId: project.id,
          kind: "NOTE",
          content: options.content ?? "",
          items: [],
          reminders: [],
          tags: [],
          priority: 0,
          progress: 0,
          status: 0,
        });

        if (options.json) {
          printJson(created);
        } else {
          printSuccess(`Created note: ${created.title}`);
          printInfo(`ID: ${created.id}`);
        }
      })
    );

  note
    .command("convert-to-task <id>")
    .description("Convert a note to a task")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const item = findByIdOrPrefix(await client.getTasks(), id);
        if (!item) {
          printError(`Note not found: ${id}`);
          process.exit(1);
        }
        if (item.kind !== "NOTE") {
          printError(`Item is already a task: ${item.title ?? item.id}`);
          process.exit(1);
        }
        if (!item.projectId) {
          printError(`Note has no project ID: ${id}`);
          process.exit(1);
        }
        const converted = await client.convertTaskKind(item.id, item.projectId, "TEXT");
        if (options.json) printJson(converted);
        else printSuccess(`Converted to task: ${item.title}`);
      })
    );

  return note;
}
