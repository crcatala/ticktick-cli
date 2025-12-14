#!/usr/bin/env bun
/**
 * TickTick CLI - Command-line interface for TickTick
 */
import { Command } from "commander";
import {
  createAuthCommand,
  createTaskCommand,
  createProjectCommand,
  createGroupCommand,
  createTagCommand,
  createUserCommand,
  createSyncCommand,
} from "./commands/index.js";

const program = new Command();

program
  .name("ticktick")
  .description("Command-line interface for TickTick")
  .version("1.0.0");

// Register all command groups
program.addCommand(createAuthCommand());
program.addCommand(createTaskCommand());
program.addCommand(createProjectCommand());
program.addCommand(createGroupCommand());
program.addCommand(createTagCommand());
program.addCommand(createUserCommand());
program.addCommand(createSyncCommand());

// Parse command line arguments
program.parse(process.argv);
