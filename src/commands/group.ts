/**
 * Project group (folder) commands.
 * 
 * In TickTick's API, "project groups" are what users see as "folders" in the UI.
 * This module provides both `group` and `folder` command aliases.
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
  printProjectsTableSimple,
} from "../output/index.js";
import { handleError } from "./errors.js";
import { getGlobalOptions } from "../index.js";

/**
 * Build the group/folder command with all subcommands.
 * @param commandName - "group" or "folder"
 */
function buildGroupCommand(commandName: string): Command {
  const isFolder = commandName === "folder";
  const entityName = isFolder ? "folder" : "group";
  const entityNameCap = isFolder ? "Folder" : "Group";
  
  const description = isFolder 
    ? "Manage folders (project groups)" 
    : "Manage project groups (folders)";
  const group = new Command(commandName).description(description);

  // list command
  group
    .command("list")
    .description(`List all ${entityName}s`)
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const groups = await client.getProjectGroups();

        if (options.json) {
          printJson(groups);
        } else if (groups.length === 0) {
          printInfo(`No ${entityName}s found`);
        } else {
          printGroupsTable(groups);
        }
      })
    );

  // add command
  group
    .command("add <name>")
    .description(`Create a new ${entityName}`)
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
          printSuccess(`Created ${entityName}: ${createdGroup.name}`);
          printInfo(`ID: ${createdGroup.id}`);
        }
      })
    );

  // edit command
  group
    .command("edit <id>")
    .description(`Edit an existing ${entityName}`)
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
          printError(`${entityNameCap} not found: ${id}`);
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
          printSuccess(`Updated ${entityName}: ${foundGroup.name}`);
        }
      })
    );

  // delete command
  group
    .command("delete <id>")
    .description(`Delete a ${entityName}`)
    .option("-f, --force", "Skip confirmation")
    .action(
      handleError(async function (this: Command, id: string) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the group first
        const groups = await client.getProjectGroups();
        const foundGroup = groups.find(
          (g) => g.id === id || g.id?.startsWith(id)
        );

        if (!foundGroup) {
          printError(`${entityNameCap} not found: ${id}`);
          process.exit(1);
        }

        await client.deleteProjectGroups([foundGroup.id]);
        printSuccess(`Deleted ${entityName}: ${foundGroup.name}`);
      })
    );

  // show command - display folder details and its projects
  group
    .command("show <id>")
    .description(`Show ${entityName} details and its projects`)
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the group
        const groups = await client.getProjectGroups();
        const foundGroup = groups.find(
          (g) => g.id === id || g.id?.startsWith(id)
        );

        if (!foundGroup) {
          printError(`Folder not found: ${id}`);
          process.exit(1);
        }

        // Get projects in this folder
        const allProjects = await client.getProjects();
        const folderProjects = allProjects.filter(
          (p) => p.groupId === foundGroup.id
        );

        if (options.json) {
          printJson({
            folder: foundGroup,
            projects: folderProjects,
          });
        } else {
          printKeyValue(
            {
              ID: foundGroup.id ?? "-",
              Name: foundGroup.name ?? "-",
              "Project Count": String(folderProjects.length),
            },
            ["ID", "Name", "Project Count"]
          );

          if (folderProjects.length > 0) {
            console.log();
            printInfo("Projects in this folder:");
            printProjectsTableSimple(folderProjects);
          } else {
            console.log();
            printInfo("No projects in this folder");
          }
        }
      })
    );

  return group;
}

/**
 * Create the "group" command.
 */
export function createGroupCommand(): Command {
  return buildGroupCommand("group");
}

/**
 * Create the "folder" command (alias for group).
 */
export function createFolderCommand(): Command {
  return buildGroupCommand("folder");
}
