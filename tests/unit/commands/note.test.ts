import { describe, expect, it } from "bun:test";
import { createNoteCommand, resolveNoteProject } from "../../../src/commands/note.js";
import { createTaskCommand, getNoteOperationError } from "../../../src/commands/task.js";
import { createMockProject, createMockTask } from "./helpers.js";

function getSubcommand(parent: ReturnType<typeof createNoteCommand> | ReturnType<typeof createTaskCommand>, name: string) {
  return parent.commands.find((command) => command.name() === name);
}

describe("note commands", () => {
  it("registers note creation and note-to-task conversion commands", () => {
    const note = createNoteCommand();
    const add = getSubcommand(note, "add");
    const convert = getSubcommand(note, "convert-to-task");

    expect(add).toBeDefined();
    expect(add?.options.find((option) => option.long === "--project")?.required).toBe(true);
    expect(add?.options.some((option) => option.long === "--content")).toBe(true);
    expect(add?.options.some((option) => option.long === "--json")).toBe(true);
    expect(convert).toBeDefined();
    expect(convert?.options.some((option) => option.long === "--json")).toBe(true);
  });

  it("registers task-to-note conversion", () => {
    const convert = getSubcommand(createTaskCommand(), "convert-to-note");
    expect(convert).toBeDefined();
    expect(convert?.options.some((option) => option.long === "--json")).toBe(true);
  });

  it("accepts exact and prefix references to NOTE projects", () => {
    const project = createMockProject({ id: "note-project-123", kind: "NOTE" });

    expect(resolveNoteProject([project], "note-project-123")).toEqual({ project });
    expect(resolveNoteProject([project], "note-proj")).toEqual({ project });
  });

  it("rejects a missing or task project for note creation", () => {
    const taskProject = createMockProject({ id: "task-project", name: "Tasks", kind: "TASK" });

    expect(resolveNoteProject([taskProject], "missing")).toEqual({ error: "Project not found: missing" });
    expect(resolveNoteProject([taskProject], "task-project")).toEqual({
      error: 'Project "Tasks" is not a note list',
    });
  });
});

describe("note operation guards", () => {
  const note = createMockTask({ id: "note-123", kind: "NOTE" });

  it("blocks completion of notes with a conversion hint", () => {
    expect(getNoteOperationError(note, "complete")).toBe(
      "Notes cannot be completed. Convert it first: tt note convert-to-task note-123"
    );
  });

  it("blocks abandoning notes with a conversion hint", () => {
    expect(getNoteOperationError(note, "abandon")).toBe(
      "Notes cannot be abandoned. Convert it first: tt note convert-to-task note-123"
    );
  });

  it("allows task-only operations for TEXT items", () => {
    expect(getNoteOperationError(createMockTask({ kind: "TEXT" }), "complete")).toBeUndefined();
  });
});
