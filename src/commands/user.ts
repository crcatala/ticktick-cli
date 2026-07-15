/**
 * User commands.
 */
import { Command } from "commander";
import { getClient } from "../api/client.js";
import { printJson, printKeyValue } from "../output/index.js";
import { formatDate } from "../utils/date.js";
import { handleError } from "./errors.js";
import { getGlobalOptions } from "../index.js";

export function createUserCommand(): Command {
  const user = new Command("user").description("User information");

  // profile command
  user
    .command("profile")
    .description("Show user profile")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const profile = await client.getProfile();

        if (options.json) {
          printJson(profile);
        } else {
          printKeyValue(
            {
              "User ID": profile.id ?? "-",
              Username: profile.username ?? "-",
              Name: profile.name ?? "-",
              Email: profile.email ?? "-",
              "Time Zone": profile.timeZone ?? "-",
              Pro: profile.pro ? "Yes" : "No",
              "Free Trial": profile.freeTrial ? "Yes" : "No",
              Created: formatDate(profile.createdTime),
            },
            [
              "User ID",
              "Username",
              "Name",
              "Email",
              "Time Zone",
              "Pro",
              "Free Trial",
              "Created",
            ]
          );
        }
      })
    );

  // status command
  user
    .command("status")
    .description("Show subscription status")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const status = await client.getUserStatus();

        if (options.json) {
          printJson(status);
        } else {
          printKeyValue(
            {
              "User ID": status.userId ?? "-",
              Pro: status.pro ? "Yes" : "No",
              "Pro Expires": formatDate(status.proExpire),
              "Free Trial": status.freeTrial ? "Yes" : "No",
              "Trial Expires": formatDate(status.freeTrialExpire),
              "Subscription Type": status.subscriptionType ?? "-",
              "Last Check-in": formatDate(status.lastCheckIn),
            },
            [
              "User ID",
              "Pro",
              "Pro Expires",
              "Free Trial",
              "Trial Expires",
              "Subscription Type",
              "Last Check-in",
            ]
          );
        }
      })
    );

  // stats command
  user
    .command("stats")
    .description("Show usage statistics")
    .option("--json", "Output as JSON")
    .action(
      handleError(async function (this: Command, options) {
        const globalOpts = getGlobalOptions(this);
        const client = await getClient({ validation: globalOpts.validation });
        const stats = await client.getUserStats();

        if (options.json) {
          printJson(stats);
        } else {
          printKeyValue(
            {
              "Normal Tasks": stats.normalCount?.toString() ?? "-",
              "Checklist Items": stats.checklistCount?.toString() ?? "-",
              "Completed": stats.completedCount?.toString() ?? "-",
              "Deleted": stats.deletedCount?.toString() ?? "-",
              "Due Today": stats.dueTodayCount?.toString() ?? "-",
              "Overdue": stats.overdueCount?.toString() ?? "-",
              "Notes": stats.noteCount?.toString() ?? "-",
              "Date": stats.date ?? "-",
            },
            [
              "Normal Tasks",
              "Checklist Items",
              "Completed",
              "Deleted",
              "Due Today",
              "Overdue",
              "Notes",
              "Date",
            ]
          );
        }
      })
    );

  return user;
}
