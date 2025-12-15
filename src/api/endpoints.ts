/**
 * TickTick API endpoint constants.
 */

export const BASE_URL = "https://api.ticktick.com/api/v2";

export const ENDPOINTS = {
  // Auth
  LOGIN: "/user/signon?wc=true&remember=true",

  // User
  PROFILE: "/user/profile",
  STATUS: "/user/status",
  STATS: "/user/statistics",

  // Batch/Sync
  BATCH: "/batch/check/0",

  // Tasks
  BATCH_TASK: "/batch/task",
  CLOSED_TASKS: "/project/all/closed",

  // Projects
  BATCH_PROJECT: "/batch/project",

  // Project Groups
  BATCH_PROJECT_GROUP: "/batch/projectGroup",

  // Tags
  BATCH_TAG: "/batch/tag",
  TAG_RENAME: "/tag/rename",
  TAG_DELETE: "/tag", // DELETE /tag/{name}

  // Trash
  TRASH_CLEANUP: "/trash/cleanUp",
} as const;
