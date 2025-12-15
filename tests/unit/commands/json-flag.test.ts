/**
 * Tests to verify --json flag is available on appropriate commands.
 * 
 * Commands that return data should support --json for programmatic use.
 * Commands that only perform actions (like delete, done) may optionally skip it.
 */
import { describe, it, expect } from "bun:test";
import { Command } from "commander";
import {
  createAuthCommand,
  createTaskCommand,
  createProjectCommand,
  createGroupCommand,
  createFolderCommand,
  createTagCommand,
  createUserCommand,
  createSyncCommand,
  createTrashCommand,
  createChecklistCommand,
} from "../../../src/commands/index.js";

/**
 * Helper to check if a command has the --json option.
 */
function hasJsonOption(cmd: Command): boolean {
  return cmd.options.some((opt) => opt.long === "--json");
}

/**
 * Helper to get subcommand by name.
 */
function getSubcommand(parent: Command, name: string): Command | undefined {
  return parent.commands.find((c) => c.name() === name);
}

describe("--json flag availability", () => {
  describe("auth command", () => {
    const auth = createAuthCommand();

    it("auth status has --json", () => {
      const cmd = getSubcommand(auth, "status");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("auth whoami has --json", () => {
      const cmd = getSubcommand(auth, "whoami");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    // login/logout don't need --json as they're interactive/action commands
  });

  describe("task command", () => {
    const task = createTaskCommand();

    it("task list has --json", () => {
      const cmd = getSubcommand(task, "list");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("task show has --json", () => {
      const cmd = getSubcommand(task, "show");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("task closed has --json", () => {
      const cmd = getSubcommand(task, "closed");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("task add has --json", () => {
      const cmd = getSubcommand(task, "add");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("task edit has --json", () => {
      const cmd = getSubcommand(task, "edit");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });
  });

  describe("project command", () => {
    const project = createProjectCommand();

    it("project list has --json", () => {
      const cmd = getSubcommand(project, "list");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("project show has --json", () => {
      const cmd = getSubcommand(project, "show");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("project inbox has --json", () => {
      const cmd = getSubcommand(project, "inbox");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("project add has --json", () => {
      const cmd = getSubcommand(project, "add");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("project edit has --json", () => {
      const cmd = getSubcommand(project, "edit");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });
  });

  describe("group command", () => {
    const group = createGroupCommand();

    it("group list has --json", () => {
      const cmd = getSubcommand(group, "list");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("group add has --json", () => {
      const cmd = getSubcommand(group, "add");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("group edit has --json", () => {
      const cmd = getSubcommand(group, "edit");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("group show has --json", () => {
      const cmd = getSubcommand(group, "show");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });
  });

  describe("folder command (alias for group)", () => {
    const folder = createFolderCommand();

    it("folder list has --json", () => {
      const cmd = getSubcommand(folder, "list");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("folder add has --json", () => {
      const cmd = getSubcommand(folder, "add");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("folder edit has --json", () => {
      const cmd = getSubcommand(folder, "edit");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("folder show has --json", () => {
      const cmd = getSubcommand(folder, "show");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });
  });

  describe("tag command", () => {
    const tag = createTagCommand();

    it("tag list has --json", () => {
      const cmd = getSubcommand(tag, "list");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("tag add has --json", () => {
      const cmd = getSubcommand(tag, "add");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("tag edit has --json", () => {
      const cmd = getSubcommand(tag, "edit");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });
  });

  describe("checklist command", () => {
    const checklist = createChecklistCommand();

    it("checklist list has --json", () => {
      const cmd = getSubcommand(checklist, "list");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("checklist add has --json", () => {
      const cmd = getSubcommand(checklist, "add");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("checklist toggle has --json", () => {
      const cmd = getSubcommand(checklist, "toggle");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("checklist delete has --json", () => {
      const cmd = getSubcommand(checklist, "delete");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });
  });

  describe("user command", () => {
    const user = createUserCommand();

    it("user profile has --json", () => {
      const cmd = getSubcommand(user, "profile");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("user status has --json", () => {
      const cmd = getSubcommand(user, "status");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });

    it("user stats has --json", () => {
      const cmd = getSubcommand(user, "stats");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });
  });

  describe("sync command", () => {
    const sync = createSyncCommand();

    it("sync all has --json", () => {
      const cmd = getSubcommand(sync, "all");
      expect(cmd).toBeDefined();
      expect(hasJsonOption(cmd!)).toBe(true);
    });
  });

  // trash.empty is an action command, --json is optional
});
