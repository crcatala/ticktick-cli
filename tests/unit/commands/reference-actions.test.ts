import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { TickTickClient } from "../../../src/api/client.js";
import type { Command } from "commander";

const client = {
  getProjects: mock(),
  getProjectGroups: mock(),
  getTasks: mock(),
  getClosedTasks: mock(),
  getTask: mock(),
  createTask: mock(),
  updateTask: mock(),
  completeTask: mock(),
  abandonTask: mock(),
  reopenTask: mock(),
  deleteTasks: mock(),
  updateProject: mock(),
  deleteProjects: mock(),
} as unknown as TickTickClient;

await mock.module("../../../src/api/client.js", () => ({
  getClient: mock(async () => client),
  generateObjectId: mock(() => "generated-id"),
  login: mock(),
}));

let createTaskCommand: typeof import("../../../src/commands/task.js").createTaskCommand;
let createNoteCommand: typeof import("../../../src/commands/note.js").createNoteCommand;
let createProjectCommand: typeof import("../../../src/commands/project.js").createProjectCommand;

beforeAll(async () => {
  ({ createTaskCommand } = await import("../../../src/commands/task.js"));
  ({ createNoteCommand } = await import("../../../src/commands/note.js"));
  ({ createProjectCommand } = await import("../../../src/commands/project.js"));
});

beforeEach(() => {
  mock.clearAllMocks();
});

async function run(command: Command, args: string[]) {
  await command.parseAsync(args, { from: "user" });
}

const projects = [
  { id: "work-project", name: "Work", kind: "TASK" },
  { id: "home-project", name: "Home", kind: "TASK" },
];
const duplicateTasks = [
  { id: "work-task", projectId: "work-project", title: "Release", kind: "TEXT" },
  { id: "home-task", projectId: "home-project", title: "Release", kind: "TEXT" },
];

describe("reference-aware command actions", () => {
  it("scopes task show and active mutations before resolving a duplicate title", async () => {
    client.getProjects.mockResolvedValue(projects);
    client.getTasks.mockResolvedValue(duplicateTasks);
    client.getTask.mockResolvedValue(duplicateTasks[0]);
    client.updateTask.mockResolvedValue(duplicateTasks[0]);

    await run(createTaskCommand(), ["show", "Release", "--project", "wor", "--json"]);
    expect(client.getTask).toHaveBeenCalledWith("work-task", "work-project");

    await run(createTaskCommand(), ["done", "Release", "--project", "Work", "--yes"]);
    expect(client.completeTask).toHaveBeenCalledWith("work-task", "work-project");

    await run(createTaskCommand(), ["abandon", "Release", "--project", "Work", "--yes"]);
    expect(client.abandonTask).toHaveBeenCalledWith("work-task", "work-project");

    await run(createTaskCommand(), ["delete", "Release", "--project", "Work", "--force"]);
    expect(client.deleteTasks).toHaveBeenCalledWith(["work-task"], "work-project");
  });

  it("scopes reopen and passes canonical project IDs to closed-task lookup", async () => {
    client.getProjects.mockResolvedValue(projects);
    client.getClosedTasks.mockImplementation(async (status: string, projectId?: string) => {
      if (projectId) return duplicateTasks.filter((task) => task.projectId === projectId);
      return status === "Completed" ? duplicateTasks : [];
    });

    await run(createTaskCommand(), ["reopen", "Release", "--project", "wor", "--yes"]);
    expect(client.reopenTask).toHaveBeenCalledWith("work-task", "work-project");

    await run(createTaskCommand(), ["closed", "--project", "wor", "--json"]);
    expect(client.getClosedTasks).toHaveBeenLastCalledWith("Completed", "work-project");
  });

  it("resolves task titles and destination project-name prefixes when editing", async () => {
    client.getProjects.mockResolvedValue(projects);
    client.getTasks.mockResolvedValue([duplicateTasks[0]]);
    client.updateTask.mockResolvedValue(duplicateTasks[0]);

    await run(createTaskCommand(), ["edit", "Release", "--project", "hom", "--json"]);

    expect(client.updateTask).toHaveBeenCalledWith({
      id: "work-task",
      projectId: "home-project",
    });
  });

  it("resolves project-name prefixes for note creation and project actions", async () => {
    client.getProjects.mockResolvedValue([...projects, { id: "journal-project", name: "Journal", kind: "NOTE" }]);
    client.createTask.mockResolvedValue({ id: "note-1", title: "Reflection" });
    client.updateProject.mockResolvedValue(projects[0]);

    await run(createNoteCommand(), ["add", "Reflection", "--project", "jou", "--json"]);
    expect(client.createTask).toHaveBeenCalledWith(expect.objectContaining({ projectId: "journal-project" }));

    await run(createProjectCommand(), ["show", "wor", "--json"]);
    await run(createProjectCommand(), ["edit", "wor", "--name", "Office", "--json"]);
    await run(createProjectCommand(), ["delete", "wor", "--force"]);
    expect(client.updateProject).toHaveBeenCalledWith({ id: "work-project", name: "Office" });
    expect(client.deleteProjects).toHaveBeenCalledWith(["work-project"]);
  });

  it("does not mutate when a project-name prefix is ambiguous", async () => {
    client.getProjects.mockResolvedValue([
      { id: "home-project", name: "Home", kind: "TASK" },
      { id: "homework-project", name: "Homework", kind: "TASK" },
    ]);
    const originalExit = process.exit;
    process.exit = mock(() => undefined) as typeof process.exit;

    try {
      await run(createTaskCommand(), ["add", "Release", "--project", "hom"]);
      expect(client.createTask).not.toHaveBeenCalled();
    } finally {
      process.exit = originalExit;
    }
  });
});
