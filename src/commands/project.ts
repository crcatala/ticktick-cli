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
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const projects = await client.getProjects();

        if (options.json) {
          printJson(projects);
        } else if (projects.length === 0) {
          printInfo("No projects found");
        } else {
          printProjectsTable(projects);
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
          printKeyValue(
            {
              ID: foundProject.id ?? "-",
              Name: foundProject.name ?? "-",
              Kind: foundProject.kind ?? "TASK",
              Color: foundProject.color ?? "-",
              "View Mode": foundProject.viewMode ?? "-",
              Group: truncateId(foundProject.groupId),
              Closed: foundProject.closed ? "Yes" : "No",
            },
            ["ID", "Name", "Kind", "Color", "View Mode", "Group", "Closed"]
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
    .option("-g, --group <id>", "Project group ID")
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
        if (options.group) {
          projectData.groupId = options.group;
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
    .option("-g, --group <id>", "New group ID")
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

        const updateData: Parameters<typeof client.updateProject>[0] = {
          id: foundProject.id,
        };

        if (options.name) {
          updateData.name = options.name;
        }
        if (options.color) {
          updateData.color = options.color;
        }
        if (options.group) {
          updateData.groupId = options.group;
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
