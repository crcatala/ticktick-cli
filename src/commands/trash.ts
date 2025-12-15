/**
 * Trash command.
 */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import { printSuccess } from "../output/index.js";
import { handleError } from "./errors.js";
import { getGlobalOptions } from "../index.js";

export function createTrashCommand(): Command {
  const trash = new Command("trash").description("Manage trash");

  // empty command
  trash
    .command("empty")
    .description("Permanently delete all items in trash")
    .option("-y, --yes", "Skip confirmation prompt")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);

        // Confirm unless --yes flag is provided
        if (!options.yes) {
          const readline = await import("readline");
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const confirmed = await new Promise<boolean>((resolve) => {
            rl.question(
              "⚠️  WARNING: This will PERMANENTLY delete ALL trashed items.\n" +
              "   This action CANNOT be undone.\n" +
              "   Continue? (y/N) ",
              (answer) => {
                rl.close();
                resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
              }
            );
          });

          if (!confirmed) {
            console.log("Aborted.");
            return;
          }
        }

        const client = await getClient({ validation: globalOpts.validation });
        await client.emptyTrash();

        printSuccess("Trash emptied successfully.");
      })
    );

  return trash;
}
