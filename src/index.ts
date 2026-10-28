#!/usr/bin/env node
/**
 * TickTick CLI - Command-line interface for TickTick
 */
import { Command, Option } from "commander";
import {
  createAuthCommand,
  createTaskCommand,
  createNoteCommand,
  createProjectCommand,
  createGroupCommand,
  createFolderCommand,
  createTagCommand,
  createUserCommand,
  createSyncCommand,
  createTrashCommand,
  createChecklistCommand,
} from "./commands/index.js";
import { runUpdate, versionDetails, versionLine } from "./cli-meta.js";
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
  .name("tt")
  .description("Command-line interface for TickTick")
  .version(versionLine("tt"), "-V, --version", "print the version and commit")
  .addOption(
    new Option(
      "--validation <strategy>",
      "API response validation strategy: strict (fail on errors), warn (log warnings, continue), off (skip validation)"
    )
      .choices(["strict", "warn", "off"])
      .default("strict")
  );

// Version, update and self-management commands
program
  .command("update")
  .description("update tt the way it was installed")
  .option("--check", "report only: exit 0 up to date, 1 update available, 2 unknown")
  .option("--force", "update even when already up to date")
  .action((options: { check?: boolean; force?: boolean }) => {
    process.exitCode = runUpdate("tt", options);
  });

program
  .command("version")
  .description("print version, commit, install method and path")
  .option("--json", "Output as JSON")
  .action((options: { json?: boolean }) => {
    const details = versionDetails();
    console.log(options.json ? JSON.stringify(details) : Object.entries(details).map(([k, v]) => `${k}: ${v}`).join("\n"));
  });

// Register all command groups
program.addCommand(createAuthCommand());
program.addCommand(createTaskCommand());
program.addCommand(createNoteCommand());
program.addCommand(createProjectCommand());
program.addCommand(createGroupCommand());
program.addCommand(createFolderCommand());
program.addCommand(createTagCommand());
program.addCommand(createChecklistCommand());
program.addCommand(createUserCommand());
program.addCommand(createSyncCommand());
program.addCommand(createTrashCommand());

// Parse command line arguments (only when run directly, not when imported)
if (import.meta.main) {
  program.parse(process.argv);
}
