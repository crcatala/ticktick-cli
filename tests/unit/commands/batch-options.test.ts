/**
 * Tests to verify batch operation commands have proper options.
 * 
 * Commands that support batch operations should:
 * - Accept multiple IDs (variadic)
 * - Have -y/--yes option to skip confirmation
 * - Delete should also have -f/--force as alias
 */
import { describe, it, expect } from "bun:test";
import { Command } from "commander";
import { createTaskCommand } from "../../../src/commands/index.js";

/**
 * Helper to check if a command has a specific option.
 */
function hasOption(cmd: Command, longFlag: string): boolean {
  return cmd.options.some((opt) => opt.long === longFlag);
}

/**
 * Helper to check if a command has a specific short option.
 */
function hasShortOption(cmd: Command, shortFlag: string): boolean {
  return cmd.options.some((opt) => opt.short === shortFlag);
}

/**
 * Helper to get subcommand by name.
 */
function getSubcommand(parent: Command, name: string): Command | undefined {
  return parent.commands.find((c) => c.name() === name);
}

/**
 * Helper to check if command accepts variadic arguments.
 */
function acceptsVariadicArgs(cmd: Command): boolean {
  // Commander stores argument info in _args
  const args = (cmd as unknown as { registeredArguments: Array<{ variadic: boolean }> }).registeredArguments;
  return args?.some((arg) => arg.variadic) ?? false;
}

describe("batch operation options", () => {
  const task = createTaskCommand();

  describe("task done", () => {
    const cmd = getSubcommand(task, "done");

    it("exists", () => {
      expect(cmd).toBeDefined();
    });

    it("accepts multiple IDs (variadic)", () => {
      expect(acceptsVariadicArgs(cmd!)).toBe(true);
    });

    it("has --yes option", () => {
      expect(hasOption(cmd!, "--yes")).toBe(true);
    });

    it("has -y short option", () => {
      expect(hasShortOption(cmd!, "-y")).toBe(true);
    });
  });

  describe("task abandon", () => {
    const cmd = getSubcommand(task, "abandon");

    it("exists", () => {
      expect(cmd).toBeDefined();
    });

    it("accepts multiple IDs (variadic)", () => {
      expect(acceptsVariadicArgs(cmd!)).toBe(true);
    });

    it("has --yes option", () => {
      expect(hasOption(cmd!, "--yes")).toBe(true);
    });

    it("has -y short option", () => {
      expect(hasShortOption(cmd!, "-y")).toBe(true);
    });
  });

  describe("task reopen", () => {
    const cmd = getSubcommand(task, "reopen");

    it("exists", () => {
      expect(cmd).toBeDefined();
    });

    it("accepts multiple IDs (variadic)", () => {
      expect(acceptsVariadicArgs(cmd!)).toBe(true);
    });

    it("has --yes option", () => {
      expect(hasOption(cmd!, "--yes")).toBe(true);
    });

    it("has -y short option", () => {
      expect(hasShortOption(cmd!, "-y")).toBe(true);
    });
  });

  describe("task delete", () => {
    const cmd = getSubcommand(task, "delete");

    it("exists", () => {
      expect(cmd).toBeDefined();
    });

    it("accepts multiple IDs (variadic)", () => {
      expect(acceptsVariadicArgs(cmd!)).toBe(true);
    });

    it("has --yes option", () => {
      expect(hasOption(cmd!, "--yes")).toBe(true);
    });

    it("has -y short option", () => {
      expect(hasShortOption(cmd!, "-y")).toBe(true);
    });

    it("has --force option as alias", () => {
      expect(hasOption(cmd!, "--force")).toBe(true);
    });

    it("has -f short option for force", () => {
      expect(hasShortOption(cmd!, "-f")).toBe(true);
    });
  });
});
