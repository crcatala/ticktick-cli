/**
 * Schema Snapshot Capture Script
 *
 * Captures JSON schema from TickTick API endpoints and saves them to
 * schemas/snapshots/*.schema.json files.
 *
 * This script extracts type information only (no sensitive data) and tracks
 * nullability for each field.
 *
 * Usage:
 *   TICKTICK_TOKEN=xxx bun run scripts/schema-capture.ts
 *
 * Requirements:
 *   - TICKTICK_TOKEN environment variable must be set
 */

import { getLiveClient, generateTestName, apiDelay, TestProject } from "../tests/helpers/live-test.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const SNAPSHOTS_DIR = "schemas/snapshots";
const SCHEMA_VERSION = "1.0.0";

// Track number of snapshots saved
let snapshotCount = 0;

/**
 * Infer JSON Schema from a value.
 * Tracks type information and nullability.
 */
function inferSchema(value: unknown): unknown {
  if (value === null) {
    return { type: ["null"] };
  }

  if (value === undefined) {
    return { type: ["undefined"] };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return {
        type: "array",
        items: { type: "unknown" },
      };
    }

    // Infer schema from first item (assumes homogeneous arrays)
    const itemSchema = inferSchema(value[0]);
    return {
      type: "array",
      items: itemSchema,
    };
  }

  if (typeof value === "object") {
    const properties: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value)) {
      properties[key] = inferSchema(val);
    }

    return {
      type: "object",
      properties,
    };
  }

  // Primitive types
  return { type: typeof value };
}

/**
 * Create a schema snapshot with metadata.
 */
function createSchemaSnapshot(
  endpoint: string,
  method: string,
  data: unknown
): unknown {
  return {
    $endpoint: `${method} ${endpoint}`,
    $capturedAt: new Date().toISOString(),
    $version: SCHEMA_VERSION,
    ...inferSchema(data),
  };
}

/**
 * Save a schema snapshot to disk.
 */
async function saveSnapshot(
  filename: string,
  schema: unknown
): Promise<void> {
  const filepath = join(SNAPSHOTS_DIR, filename);
  await writeFile(filepath, JSON.stringify(schema, null, 2));
  snapshotCount++;
  console.log(`✓ Saved ${filename}`);
}

/**
 * Main capture function.
 */
async function captureSchemas(): Promise<void> {
  console.log("Starting schema capture...\n");

  // Ensure snapshots directory exists
  await mkdir(SNAPSHOTS_DIR, { recursive: true });

  // Get authenticated client
  const client = getLiveClient();

  // Create a test project for mutation operations
  const testProject = new TestProject(client);
  let testProjectId: string | null = null;

  try {
    // ============================================================
    // Read-only endpoints
    // ============================================================

    console.log("Capturing read endpoints...");

    // GET /batch/check/0
    console.log("  Fetching batch data...");
    const batchData = await client.getBatch();
    await saveSnapshot("batch-check.schema.json", createSchemaSnapshot(
      "/api/v2/batch/check/0",
      "GET",
      batchData
    ));
    await apiDelay();

    // GET /user/profile
    console.log("  Fetching user profile...");
    const profileData = await client.getProfile();
    await saveSnapshot("user-profile.schema.json", createSchemaSnapshot(
      "/api/v2/user/profile",
      "GET",
      profileData
    ));
    await apiDelay();

    // GET /user/status
    console.log("  Fetching user status...");
    const statusData = await client.getUserStatus();
    await saveSnapshot("user-status.schema.json", createSchemaSnapshot(
      "/api/v2/user/status",
      "GET",
      statusData
    ));
    await apiDelay();

    // GET /user/statistics
    console.log("  Fetching user stats...");
    const statsData = await client.getUserStats();
    await saveSnapshot("user-stats.schema.json", createSchemaSnapshot(
      "/api/v2/user/statistics",
      "GET",
      statsData
    ));
    await apiDelay();

    // GET /project/all/closed (completed tasks)
    console.log("  Fetching closed tasks...");
    const closedTasks = await client.getClosedTasks("Completed");
    await saveSnapshot("closed-tasks.schema.json", createSchemaSnapshot(
      "/api/v2/project/all/closed",
      "GET",
      closedTasks
    ));
    await apiDelay();

    // ============================================================
    // Mutation endpoints (require test resources)
    // ============================================================

    console.log("\nCapturing mutation endpoints...");
    console.log("  Setting up test project...");
    const project = await testProject.setup();
    testProjectId = project.id;
    await apiDelay();

    // POST /batch/task (create)
    console.log("  Creating test task...");
    const taskName = generateTestName("schema-capture-task");
    const createdTask = await client.createTask({
      title: taskName,
      projectId: testProjectId,
      content: "Test task for schema capture",
      priority: 1,
    });
    testProject.trackTask(createdTask.id);
    await saveSnapshot("task-create.schema.json", createSchemaSnapshot(
      "/api/v2/batch/task",
      "POST",
      createdTask
    ));
    await apiDelay();

    // POST /batch/task (update)
    console.log("  Updating test task...");
    const updatedTask = await client.updateTask({
      id: createdTask.id,
      title: `${taskName}-updated`,
      priority: 2,
    });
    await saveSnapshot("task-update.schema.json", createSchemaSnapshot(
      "/api/v2/batch/task",
      "POST",
      updatedTask
    ));
    await apiDelay();

    // POST /batch/project (create)
    console.log("  Creating test project...");
    const projectName = generateTestName("schema-capture-project");
    const createdProject = await client.createProject({
      name: projectName,
      color: "#FF5733",
    });
    await saveSnapshot("project-create.schema.json", createSchemaSnapshot(
      "/api/v2/batch/project",
      "POST",
      createdProject
    ));
    await apiDelay();

    // Clean up the extra project immediately
    await client.deleteProjects([createdProject.id]);
    await apiDelay();

    // POST /batch/tag (create)
    console.log("  Creating test tag...");
    const tagName = generateTestName("schema-capture-tag");
    const createdTag = await client.createTag({
      name: tagName,
      color: "#00FF00",
    });
    testProject.trackTag(tagName);
    await saveSnapshot("tag-create.schema.json", createSchemaSnapshot(
      "/api/v2/batch/tag",
      "POST",
      createdTag
    ));
    await apiDelay();

    // POST /batch/projectGroup (create)
    console.log("  Creating test project group...");
    const groupName = generateTestName("schema-capture-group");
    const createdGroup = await client.createProjectGroup({
      name: groupName,
    });
    testProject.trackGroup(createdGroup.id);
    await saveSnapshot("project-group-create.schema.json", createSchemaSnapshot(
      "/api/v2/batch/projectGroup",
      "POST",
      createdGroup
    ));
    await apiDelay();

    console.log("\n✓ Schema capture complete!");
    console.log(`  Saved ${snapshotCount} schema snapshots to ${SNAPSHOTS_DIR}/`);

  } catch (error) {
    console.error("\n✗ Error during schema capture:", error);
    throw error;
  } finally {
    // Cleanup test resources
    if (testProjectId) {
      console.log("\nCleaning up test resources...");
      await testProject.teardown();
    }
  }
}

// Run if executed directly
if (import.meta.main) {
  // Validate required environment variables
  if (!process.env.TICKTICK_TOKEN) {
    console.error("Error: TICKTICK_TOKEN environment variable is required");
    console.error("Usage: TICKTICK_TOKEN=xxx bun run schema:capture");
    process.exit(1);
  }

  try {
    await captureSchemas();
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}
