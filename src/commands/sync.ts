/**
 * Sync command.
 */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import { printInfo, printJson, printKeyValue } from "../output/index.js";
import { handleError } from "./errors.js";
import { getGlobalOptions } from "../index.js";

export function createSyncCommand(): Command {
  const sync = new Command("sync").description("Sync and backup");

  // sync command (default)
  sync
    .command("all", { isDefault: true })
    .description("Get full state snapshot (tasks, projects, tags, groups)")
    .option("--json", "Output raw JSON (useful for backups)")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const batch = await client.getBatch();

        if (options.json) {
          printJson(batch);
        } else {
          const tasks = batch.syncTaskBean?.update ?? [];
          const projects = batch.projectProfiles ?? [];
          const tags = batch.tags ?? [];
          const groups = batch.projectGroups ?? [];

          printKeyValue(
            {
              "Active Tasks": tasks.length.toString(),
              "Projects": projects.length.toString(),
              "Tags": tags.length.toString(),
              "Project Groups": groups.length.toString(),
              "Inbox ID": batch.inboxId ?? "-",
              "Checkpoint": batch.checkPoint?.toString() ?? "-",
            },
            [
              "Active Tasks",
              "Projects",
              "Tags",
              "Project Groups",
              "Inbox ID",
              "Checkpoint",
            ]
          );

          printInfo("\nUse --json flag to export full data for backup.");
        }
      })
    );

  return sync;
}
