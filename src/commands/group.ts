/**
 * Project group commands.
 */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import {
  printError,
  printSuccess,
  printInfo,
  printJson,
  printKeyValue,
  printGroupsTable,
} from "../output/index.js";
import { handleError } from "./errors.js";
import { getGlobalOptions } from "../index.js";

export function createGroupCommand(): Command {
  const group = new Command("group").description("Manage project groups");

  // list command
  group
    .command("list")
    .description("List all project groups")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const groups = await client.getProjectGroups();

        if (options.json) {
          printJson(groups);
        } else if (groups.length === 0) {
          printInfo("No project groups found");
        } else {
          printGroupsTable(groups);
        }
      })
    );

  // add command
  group
    .command("add <name>")
    .description("Create a new project group")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, name: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        const groupData = { name };
        const createdGroup = await client.createProjectGroup(groupData);

        if (options.json) {
          printJson(createdGroup);
        } else {
          printSuccess(`Created group: ${createdGroup.name}`);
          printInfo(`ID: ${createdGroup.id}`);
        }
      })
    );

  // edit command
  group
    .command("edit <id>")
    .description("Edit an existing project group")
    .option("-n, --name <name>", "New name")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the group first
        const groups = await client.getProjectGroups();
        const foundGroup = groups.find(
          (g) => g.id === id || g.id?.startsWith(id)
        );

        if (!foundGroup) {
          printError(`Project group not found: ${id}`);
          process.exit(1);
        }

        const updateData: Parameters<typeof client.updateProjectGroup>[0] = {
          id: foundGroup.id,
        };

        if (options.name) {
          updateData.name = options.name;
        }

        const updatedGroup = await client.updateProjectGroup(updateData);

        if (options.json) {
          printJson(updatedGroup);
        } else {
          printSuccess(`Updated group: ${foundGroup.name}`);
        }
      })
    );

  // delete command
  group
    .command("delete <id>")
    .description("Delete a project group")
    .option("-f, --force", "Skip confirmation")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the group first
        const groups = await client.getProjectGroups();
        const foundGroup = groups.find(
          (g) => g.id === id || g.id?.startsWith(id)
        );

        if (!foundGroup) {
          printError(`Project group not found: ${id}`);
          process.exit(1);
        }

        await client.deleteProjectGroups([foundGroup.id]);
        printSuccess(`Deleted group: ${foundGroup.name}`);
      })
    );

  return group;
}
