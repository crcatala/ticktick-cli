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
let failedEndpoints: string[] = [];

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
 * Format error message, truncating HTML responses.
 */
function formatErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const message = error.message;

  // Detect HTML responses (common for 404s) and truncate
  if (message.includes("<!DOCTYPE html>") || message.includes("<html")) {
    // Extract just the HTTP status part
    const statusMatch = message.match(/^HTTP \d+/);
    if (statusMatch) {
      return `${statusMatch[0]} (HTML response)`;
    }
    return "HTTP error (HTML response)";
  }

  return message;
}

/**
 * Capture a single endpoint with error handling.
 * Returns true if successful, false if failed.
 */
async function captureEndpoint(
  name: string,
  endpoint: string,
  method: string,
  fetchFn: () => Promise<unknown>,
  filename: string
): Promise<boolean> {
  try {
    console.log(`  Fetching ${name}...`);
    const data = await fetchFn();
    await saveSnapshot(filename, createSchemaSnapshot(endpoint, method, data));
    await apiDelay();
    return true;
  } catch (error) {
    const errorMsg = formatErrorMessage(error);
    console.log(`✗ Failed to capture ${name}: ${errorMsg}`);
    failedEndpoints.push(`${method} ${endpoint} (${name})`);
    await apiDelay(); // Still delay to avoid rate limiting on subsequent calls
    return false;
  }
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
    await captureEndpoint(
      "batch data",
      "/api/v2/batch/check/0",
      "GET",
      () => client.getBatch(),
      "batch-check.schema.json"
    );

    // GET /user/profile
    await captureEndpoint(
      "user profile",
      "/api/v2/user/profile",
      "GET",
      () => client.getProfile(),
      "user-profile.schema.json"
    );

    // GET /user/status
    await captureEndpoint(
      "user status",
      "/api/v2/user/status",
      "GET",
      () => client.getUserStatus(),
      "user-status.schema.json"
    );

    // GET /project/all/closed (completed tasks)
    await captureEndpoint(
      "closed tasks",
      "/api/v2/project/all/closed",
      "GET",
      () => client.getClosedTasks("Completed"),
      "closed-tasks.schema.json"
    );

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

    if (failedEndpoints.length > 0) {
      console.log(`\n⚠ Warning: ${failedEndpoints.length} endpoint(s) failed:`);
      for (const endpoint of failedEndpoints) {
        console.log(`  - ${endpoint}`);
      }
    }

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
