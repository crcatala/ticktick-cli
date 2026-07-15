import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { TickTickClient } from "../../../src/api/client.js";

const client = {
  getProjects: mock(),
  getTasks: mock(),
  createTask: mock(),
  convertTaskKind: mock(),
  completeTask: mock(),
  abandonTask: mock(),
} as unknown as TickTickClient;

await mock.module("../../../src/api/client.js", () => ({
  getClient: mock(async () => client),
  generateObjectId: mock(() => "generated-id"),
  login: mock(),
}));

let createNoteCommand: typeof import("../../../src/commands/note.js").createNoteCommand;
let createTaskCommand: typeof import("../../../src/commands/task.js").createTaskCommand;

beforeAll(async () => {
  ({ createNoteCommand } = await import("../../../src/commands/note.js"));
  ({ createTaskCommand } = await import("../../../src/commands/task.js"));
});

beforeEach(() => {
  mock.clearAllMocks();
});

async function run(command: ReturnType<typeof createNoteCommand> | ReturnType<typeof createTaskCommand>, args: string[]) {
  await command.parseAsync(args, { from: "user" });
}

describe("note command actions", () => {
  it("resolves a NOTE project and creates a normalized note", async () => {
    client.getProjects.mockResolvedValue([{ id: "note-project-123", name: "Notes", kind: "NOTE" }]);
    client.createTask.mockResolvedValue({ id: "note-123", title: "Daily reflection" });

    await run(createNoteCommand(), ["add", "Daily reflection", "--project", "note-proj", "--content", "Today was good", "--json"]);

    expect(client.createTask).toHaveBeenCalledWith({
      title: "Daily reflection",
      projectId: "note-project-123",
      kind: "NOTE",
      content: "Today was good",
      items: [],
      reminders: [],
      tags: [],
      priority: 0,
      progress: 0,
      status: 0,
    });
  });

  it("rejects note creation in a task project", async () => {
    client.getProjects.mockResolvedValue([{ id: "task-project-123", name: "Tasks", kind: "TASK" }]);
    const originalExit = process.exit;
    const exit = mock(() => undefined);
    process.exit = exit as typeof process.exit;

    try {
      await run(createNoteCommand(), ["add", "Daily reflection", "--project", "task-project-123"]);
      expect(exit).toHaveBeenCalledWith(1);
      expect(client.createTask).not.toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
    }
  });

  it("converts a selected note to a task", async () => {
    client.getTasks.mockResolvedValue([{ id: "note-123", projectId: "project-123", title: "Note", kind: "NOTE" }]);
    client.convertTaskKind.mockResolvedValue({ id: "note-123", kind: "TEXT" });

    await run(createNoteCommand(), ["convert-to-task", "note-", "--json"]);

    expect(client.convertTaskKind).toHaveBeenCalledWith("note-123", "project-123", "TEXT");
  });

  it("converts a selected task to a note", async () => {
    client.getTasks.mockResolvedValue([{ id: "task-123", projectId: "project-123", title: "Task", kind: "TEXT" }]);
    client.convertTaskKind.mockResolvedValue({ id: "task-123", kind: "NOTE" });

    await run(createTaskCommand(), ["convert-to-note", "task-", "--json"]);

    expect(client.convertTaskKind).toHaveBeenCalledWith("task-123", "project-123", "NOTE");
  });

  it("does not complete a note", async () => {
    client.getTasks.mockResolvedValue([{ id: "note-123", projectId: "project-123", title: "Note", kind: "NOTE" }]);
    const originalExit = process.exit;
    const exit = mock(() => undefined);
    process.exit = exit as typeof process.exit;

    try {
      await run(createTaskCommand(), ["done", "note-123", "--yes"]);
      expect(exit).toHaveBeenCalledWith(1);
      expect(client.completeTask).not.toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
    }
  });

  it("does not abandon a note", async () => {
    client.getTasks.mockResolvedValue([{ id: "note-123", projectId: "project-123", title: "Note", kind: "NOTE" }]);
    const originalExit = process.exit;
    const exit = mock(() => undefined);
    process.exit = exit as typeof process.exit;

    try {
      await run(createTaskCommand(), ["abandon", "note-123", "--yes"]);
      expect(exit).toHaveBeenCalledWith(1);
      expect(client.abandonTask).not.toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
    }
  });
});
