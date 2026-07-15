/**
 * Tag commands.
 */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import {
  printError,
  printSuccess,
  printInfo,
  printJson,
  printTagsTable,
} from "../output/index.js";
import { handleError } from "./errors.js";
import { getGlobalOptions } from "../index.js";

export function createTagCommand(): Command {
  const tag = new Command("tag").description("Manage tags");

  // list command
  tag
    .command("list")
    .description("List all tags")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const tags = await client.getTags();

        if (options.json) {
          printJson(tags);
        } else if (tags.length === 0) {
          printInfo("No tags found");
        } else {
          printTagsTable(tags);
        }
      })
    );

  // add command
  tag
    .command("add <name>")
    .description("Create a new tag")
    .option("-c, --color <hex>", "Tag color (hex code)")
    .option("-p, --parent <name>", "Parent tag name")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, name: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        const tagData: Parameters<typeof client.createTag>[0] = { name };

        if (options.color) {
          tagData.color = options.color;
        }
        if (options.parent) {
          tagData.parent = options.parent;
        }

        const createdTag = await client.createTag(tagData);

        if (options.json) {
          printJson(createdTag);
        } else {
          printSuccess(`Created tag: ${createdTag.name}`);
        }
      })
    );

  // rename command
  tag
    .command("rename <oldName> <newName>")
    .description("Rename a tag")
    .action(
      handleError(async function (this: Command, oldName: string, newName: string) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Verify tag exists
        const tags = await client.getTags();
        const foundTag = tags.find((t) => t.name === oldName);

        if (!foundTag) {
          printError(`Tag not found: ${oldName}`);
          process.exit(1);
        }

        await client.renameTag(oldName, newName);
        printSuccess(`Renamed tag: ${oldName} → ${newName}`);
      })
    );

  // edit command
  tag
    .command("edit <name>")
    .description("Edit an existing tag")
    .option("-c, --color <hex>", "New color (hex code)")
    .option("-p, --parent <name>", "New parent tag name")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, name: string, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Find the tag first
        const tags = await client.getTags();
        const foundTag = tags.find((t) => t.name === name);

        if (!foundTag) {
          printError(`Tag not found: ${name}`);
          process.exit(1);
        }

        const updateData: Parameters<typeof client.updateTag>[0] = { name };

        if (options.color) {
          updateData.color = options.color;
        }
        if (options.parent) {
          updateData.parent = options.parent;
        }

        const updatedTag = await client.updateTag(updateData);

        if (options.json) {
          printJson(updatedTag);
        } else {
          printSuccess(`Updated tag: ${name}`);
        }
      })
    );

  // delete command
  tag
    .command("delete <name>")
    .description("Delete a tag")
    .option("-f, --force", "Skip confirmation")
    .action(
      handleError(async function (this: Command, name: string) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });

        // Verify tag exists
        const tags = await client.getTags();
        const foundTag = tags.find((t) => t.name === name);

        if (!foundTag) {
          printError(`Tag not found: ${name}`);
          process.exit(1);
        }

        await client.deleteTag(name);
        printSuccess(`Deleted tag: ${name}`);
      })
    );

  return tag;
}
