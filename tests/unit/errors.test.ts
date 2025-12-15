/**
 * Tests for error handling wrapper.
 */
import { describe, it, expect, mock } from "bun:test";
import { Command } from "commander";
import { handleError } from "../../src/commands/errors.js";
import { getGlobalOptions } from "../../src/index.js";

describe("handleError", () => {
  it("preserves Commander context for getGlobalOptions", async () => {
    // Setup: Create a command structure like the real CLI
    const rootCommand = new Command();
    rootCommand.setOptionValue("validation", "warn");

    const subcommand = new Command("project");
    rootCommand.addCommand(subcommand);

    // Simulate calling the action with Commander's context
    let capturedValidation: string | undefined;
    let actionCalled = false;

    const wrappedAction = handleError(async function (this: Command) {
      actionCalled = true;
      const opts = getGlobalOptions(this);
      capturedValidation = opts.validation;
    });

    // Call the wrapped action with the subcommand as 'this' (like Commander does)
    await wrappedAction.call(subcommand);

    // Verify the action was called and got the correct options
    expect(actionCalled).toBe(true);
    expect(capturedValidation).toBe("warn");
  });

  it("preserves Commander context with nested subcommands", async () => {
    // Setup: Create a program with nested commands
    const rootCommand = new Command();
    rootCommand.setOptionValue("validation", "off");

    const level1 = new Command("level1");
    const level2 = new Command("level2");
    rootCommand.addCommand(level1);
    level1.addCommand(level2);

    let capturedValidation: string | undefined;

    const wrappedAction = handleError(async function (this: Command) {
      const opts = getGlobalOptions(this);
      capturedValidation = opts.validation;
    });

    // Call with deeply nested command as context
    await wrappedAction.call(level2);

    expect(capturedValidation).toBe("off");
  });

  it("forwards function arguments correctly", async () => {
    let capturedArgs: [string, string] | undefined;

    const wrappedAction = handleError(async function (arg1: string, arg2: string) {
      capturedArgs = [arg1, arg2];
    });

    await wrappedAction("hello", "world");

    expect(capturedArgs).toEqual(["hello", "world"]);
  });

  it("forwards options correctly", async () => {
    let capturedOptions: any;

    const wrappedAction = handleError(async function (options: any) {
      capturedOptions = options;
    });

    await wrappedAction({ foo: "bar" });

    expect(capturedOptions.foo).toBe("bar");
  });

  it("handles errors by calling process.exit", async () => {
    // Mock process.exit to prevent actually exiting
    const originalExit = process.exit;
    const exitMock = mock(() => {});
    process.exit = exitMock as any;

    const wrappedAction = handleError(async function () {
      throw new Error("Test error");
    });

    try {
      await wrappedAction();
      // Verify process.exit was called
      expect(exitMock).toHaveBeenCalledWith(1);
    } finally {
      // Restore original process.exit
      process.exit = originalExit;
    }
  });

  it("preserves context when calling getGlobalOptions from action with arguments", async () => {
    // This is the real-world scenario: a command with both context and arguments
    const rootCommand = new Command();
    rootCommand.setOptionValue("validation", "strict");

    const projectCommand = new Command("project");
    const listCommand = new Command("list");
    rootCommand.addCommand(projectCommand);
    projectCommand.addCommand(listCommand);

    let capturedValidation: string | undefined;
    let capturedOptions: any;

    const wrappedAction = handleError(async function (this: Command, options: any) {
      const globalOpts = getGlobalOptions(this);
      capturedValidation = globalOpts.validation;
      capturedOptions = options;
    });

    // Call with both context and arguments (like Commander does in real usage)
    await wrappedAction.call(listCommand, { json: true });

    expect(capturedValidation).toBe("strict");
    expect(capturedOptions.json).toBe(true);
  });
});
