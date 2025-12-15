#!/usr/bin/env bun
/**
 * TickTick CLI - Command-line interface for TickTick
 */
import { Command, Option } from "commander";
import {
  createAuthCommand,
  createTaskCommand,
  createProjectCommand,
  createGroupCommand,
  createTagCommand,
  createUserCommand,
  createSyncCommand,
} from "./commands/index.js";
import type { ValidationStrategy } from "./schemas/index.js";

/**
 * Global options that are passed to commands.
 */
export interface GlobalOptions {
  validation: ValidationStrategy;
}

/**
 * Get global options from the root command.
 */
export function getGlobalOptions(cmd: Command): GlobalOptions {
  // Walk up to root command to get global options
  let root = cmd;
  while (root.parent) {
    root = root.parent;
  }
  const opts = root.opts();
  return {
    validation: opts.validation ?? "strict",
  };
}

const program = new Command();

program
  .name("ticktick")
  .description("Command-line interface for TickTick")
  .version("1.0.0")
  .addOption(
    new Option(
      "--validation <strategy>",
      "API response validation strategy: strict (fail on errors), warn (log warnings, continue), off (skip validation)"
    )
      .choices(["strict", "warn", "off"])
      .default("strict")
  );

// Register all command groups
program.addCommand(createAuthCommand());
program.addCommand(createTaskCommand());
program.addCommand(createProjectCommand());
program.addCommand(createGroupCommand());
program.addCommand(createTagCommand());
program.addCommand(createUserCommand());
program.addCommand(createSyncCommand());

// Parse command line arguments (only when run directly, not when imported)
if (import.meta.main) {
  program.parse(process.argv);
}
