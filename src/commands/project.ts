/**
 * Project commands.
 */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import {
  printError,
  printSuccess,
  printInfo,
  printJson,
  printKeyValue,
  printProjectsTable,
  printProjectsByFolder,
  truncateId,
} from "../output/index.js";
import { handleError } from "./errors.js";
import { getGlobalOptions } from "../index.js";

export function createProjectCommand(): Command {
  const project = new Command("project").description("Manage projects");

  // list command
  project
    .command("list")
    .description("List all projects")
    .option("--json", "Output as JSON")
    .option("--by-folder", "Group projects by folder")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const projects = await client.getProjects();
        const groups = await client.getProjectGroups();

        if (options.json) {
          printJson(projects);
        } else if (projects.length === 0) {
          printInfo("No projects found");
        } else if (options.byFolder) {
          printProjectsByFolder(projects, groups);
        } else {
          printProjectsTable(projects, groups);
        }
      })
    );

  // show command
  project
    .command("show <id>")
    .description("Show project details")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const projects = await client.getProjects();
        const foundProject = projects.find(
          (p) => p.id === id || p.id?.startsWith(id)
        );

        if (!foundProject) {
          printError(`Project not found: ${id}`);
          process.exit(1);
        }

        if (options.json) {
          printJson(foundProject);
        } else {
          // Get folder name if available
          const groups = await client.getProjectGroups();
          const folder = foundProject.groupId 
            ? groups.find(g => g.id === foundProject.groupId)
            : null;
          const folderDisplay = folder?.name ?? truncateId(foundProject.groupId);

          printKeyValue(
            {
              ID: foundProject.id ?? "-",
              Name: foundProject.name ?? "-",
              Kind: foundProject.kind ?? "TASK",
              Color: foundProject.color ?? "-",
              "View Mode": foundProject.viewMode ?? "-",
              Folder: folderDisplay,
              Closed: foundProject.closed ? "Yes" : "No",
            },
            ["ID", "Name", "Kind", "Color", "View Mode", "Folder", "Closed"]
          );
        }
      })
    );

  // inbox command
  project
    .command("inbox")
    .description("Show inbox project ID")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const inboxId = await client.getInbox();

        if (!inboxId) {
          printError("Could not find inbox");
          process.exit(1);
        }

        if (options.json) {
          printJson({ inboxId });
        } else {
          printInfo(`Inbox ID: ${inboxId}`);
        }
      })
    );

  // add command
  project
    .command("add <name>")
    .description("Create a new project")
    .option("-c, --color <hex>", "Project color (hex code)")
    .option("-k, --kind <kind>", "Project kind (TASK, NOTE)", "TASK")
    .option("-f, --folder <id>", "Folder ID to add project to")
    .option("-g, --group <id>", "Folder ID (alias for --folder)")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, name: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        const projectData: Parameters<typeof client.createProject>[0] = { name };

        if (options.color) {
          projectData.color = options.color;
        }
        if (options.kind) {
          projectData.kind = options.kind;
        }
        // Support both --folder and --group (folder takes precedence)
        if (options.folder || options.group) {
          projectData.groupId = options.folder || options.group;
        }

        const project = await client.createProject(projectData);

        if (options.json) {
          printJson(project);
        } else {
          printSuccess(`Created project: ${project.name}`);
          printInfo(`ID: ${project.id}`);
        }
      })
    );

  // edit command
  project
    .command("edit <id>")
    .description("Edit an existing project")
    .option("-n, --name <name>", "New name")
    .option("-c, --color <hex>", "New color (hex code)")
    .option("-f, --folder <id>", "Move project to folder")
    .option("-g, --group <id>", "Move project to folder (alias for --folder)")
    .option("--clear-folder", "Remove project from its folder")
    .option("--clear-group", "Remove project from its folder (alias for --clear-folder)")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the project first
        const projects = await client.getProjects();
        const foundProject = projects.find(
          (p) => p.id === id || p.id?.startsWith(id)
        );

        if (!foundProject) {
          printError(`Project not found: ${id}`);
          process.exit(1);
        }

        // Support both --folder and --group (folder takes precedence)
        const newFolder = options.folder || options.group;
        const clearFolder = options.clearFolder || options.clearGroup;

        // Validate: can't use both set and clear
        if (newFolder && clearFolder) {
          printError("Cannot use both --folder/--group and --clear-folder/--clear-group");
          process.exit(1);
        }

        const updateData: Parameters<typeof client.updateProject>[0] = {
          id: foundProject.id,
        };

        if (options.name) {
          updateData.name = options.name;
        }
        if (options.color) {
          updateData.color = options.color;
        }
        if (newFolder) {
          updateData.groupId = newFolder;
        }
        if (clearFolder) {
          // Set to empty string or null to clear the group
          updateData.groupId = "";
        }

        const project = await client.updateProject(updateData);

        if (options.json) {
          printJson(project);
        } else {
          printSuccess(`Updated project: ${foundProject.name}`);
        }
      })
    );

  // delete command
  project
    .command("delete <id>")
    .description("Delete a project")
    .option("-f, --force", "Skip confirmation")
    .action(
      handleError(async function (this: Command, id: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the project first
        const projects = await client.getProjects();
        const foundProject = projects.find(
          (p) => p.id === id || p.id?.startsWith(id)
        );

        if (!foundProject) {
          printError(`Project not found: ${id}`);
          process.exit(1);
        }

        await client.deleteProjects([foundProject.id]);
        printSuccess(`Deleted project: ${foundProject.name}`);
      })
    );

  return project;
}
