/**
 * Live integration test helpers.
 *
 * Provides utilities for running tests against the real TickTick API.
 * Tests are skipped unless RUN_LIVE_TESTS=1 and TICKTICK_TOKEN are set.
 */
import { describe, it, beforeAll, afterAll } from "bun:test";
import { TickTickClient } from "../../src/api/client.js";
import { sleep } from "../../src/utils/backoff.js";
import type { Project } from "../../src/api/types.js";

/** Prefix for test resources to identify them for cleanup */
export const TEST_RESOURCE_PREFIX = "__tt-cli-test-";

/** Default delay between API calls to avoid rate limiting (ms) */
export const DEFAULT_API_DELAY = 500;

/**
 * Check if live tests should run.
 */
export function shouldRunLiveTests(): boolean {
  return process.env.RUN_LIVE_TESTS === "1" && !!process.env.TICKTICK_TOKEN;
}

/**
 * Get the reason why live tests are being skipped.
 */
export function getSkipReason(): string | null {
  if (process.env.RUN_LIVE_TESTS !== "1") {
    return "RUN_LIVE_TESTS=1 not set";
  }
  if (!process.env.TICKTICK_TOKEN) {
    return "TICKTICK_TOKEN not set";
  }
  return null;
}

/**
 * Create a TickTick client for live tests.
 * Uses TICKTICK_TOKEN environment variable.
 *
 * @throws Error if TICKTICK_TOKEN is not set
 */
export function getLiveClient(): TickTickClient {
  const token = process.env.TICKTICK_TOKEN;
  if (!token) {
    throw new Error("TICKTICK_TOKEN environment variable is required for live tests");
  }

  // Username is not strictly required for API calls, but we include it for completeness
  const username = process.env.TICKTICK_USERNAME ?? "live-test-user";

  return new TickTickClient(username, token, {
    debug: process.env.TICKTICK_DEBUG === "1",
    validation: "strict",
  });
}

/**
 * Generate a unique test resource name.
 */
export function generateTestName(base: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${TEST_RESOURCE_PREFIX}${base}-${timestamp}-${random}`;
}

/**
 * Check if a resource name is a test resource.
 */
export function isTestResource(name: string): boolean {
  return name.startsWith(TEST_RESOURCE_PREFIX);
}

/**
 * Add a delay between API calls to avoid rate limiting.
 */
export async function apiDelay(ms: number = DEFAULT_API_DELAY): Promise<void> {
  await sleep(ms);
}

/**
 * Test project manager for isolated live tests.
 *
 * Creates a dedicated test project and cleans it up after tests complete.
 * Also cleans up orphaned test resources from previous failed runs.
 */
export class TestProject {
  private client: TickTickClient;
  private project: Project | null = null;
  private createdTaskIds: string[] = [];
  private createdTagNames: string[] = [];
  private createdGroupIds: string[] = [];

  constructor(client: TickTickClient) {
    this.client = client;
  }

  /**
   * Initialize the test project.
   * Creates a new project with a unique name.
   */
  async setup(): Promise<Project> {
    // First, cleanup any orphaned test resources
    await this.cleanupOrphanedResources();

    // Create the test project
    const name = generateTestName("project");
    this.project = await this.client.createProject({ name });

    return this.project;
  }

  /**
   * Get the test project.
   * @throws Error if setup() hasn't been called
   */
  getProject(): Project {
    if (!this.project) {
      throw new Error("TestProject not initialized. Call setup() first.");
    }
    return this.project;
  }

  /**
   * Get the test project ID.
   */
  getProjectId(): string {
    return this.getProject().id;
  }

  /**
   * Track a created task for cleanup.
   */
  trackTask(taskId: string): void {
    this.createdTaskIds.push(taskId);
  }

  /**
   * Track a created tag for cleanup.
   */
  trackTag(tagName: string): void {
    this.createdTagNames.push(tagName);
  }

  /**
   * Track a created group for cleanup.
   */
  trackGroup(groupId: string): void {
    this.createdGroupIds.push(groupId);
  }

  /**
   * Cleanup all test resources.
   */
  async teardown(): Promise<void> {
    const errors: Error[] = [];

    // Delete tracked tasks
    if (this.createdTaskIds.length > 0) {
      try {
        await this.client.deleteTasks(this.createdTaskIds);
        await apiDelay();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Delete tracked tags
    for (const tagName of this.createdTagNames) {
      try {
        await this.client.deleteTag(tagName);
        await apiDelay();
      } catch (error) {
        // Ignore errors for tags that may have already been deleted
        if (!String(error).includes("404")) {
          errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    // Delete tracked groups
    if (this.createdGroupIds.length > 0) {
      try {
        await this.client.deleteProjectGroups(this.createdGroupIds);
        await apiDelay();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Delete the test project (this should also delete tasks within it)
    if (this.project) {
      try {
        await this.client.deleteProjects([this.project.id]);
        await apiDelay();
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Clear tracking
    this.createdTaskIds = [];
    this.createdTagNames = [];
    this.createdGroupIds = [];
    this.project = null;

    // Report any cleanup errors
    if (errors.length > 0) {
      console.warn(`[live-test] Cleanup had ${errors.length} error(s):`, errors.map(e => e.message));
    }
  }

  /**
   * Cleanup orphaned test resources from previous failed runs.
   * Deletes resources one at a time to avoid batch operation failures.
   */
  private async cleanupOrphanedResources(): Promise<void> {
    let cleanedProjects = 0;
    let cleanedTasks = 0;
    let cleanedTags = 0;
    let cleanedGroups = 0;

    try {
      // Get projects first to identify test project IDs
      const projects = await this.client.getProjects();
      const orphanedProjects = projects.filter(p => p.name && isTestResource(p.name));
      const testProjectIds = new Set(orphanedProjects.map(p => p.id));

      // First, cleanup orphaned tasks (tasks with test prefix OR in test projects)
      const tasks = await this.client.getTasks();
      const orphanedTasks = tasks.filter(t => 
        (t.title && isTestResource(t.title)) ||
        (t.projectId && testProjectIds.has(t.projectId))
      );

      for (const task of orphanedTasks) {
        try {
          // Include projectId in delete request
          await this.client.deleteTasks([task.id], task.projectId ?? undefined);
          cleanedTasks++;
          await apiDelay();
        } catch (error) {
          console.warn(`[live-test] Failed to delete orphaned task ${task.id}:`, error);
        }
      }

      // Wait for task deletions to propagate
      if (cleanedTasks > 0) {
        await apiDelay(1000);
      }

      // Re-fetch projects and cleanup orphaned ones

      for (const project of orphanedProjects) {
        try {
          await this.client.deleteProjects([project.id]);
          cleanedProjects++;
          await apiDelay();
        } catch (error) {
          console.warn(`[live-test] Failed to delete orphaned project ${project.id}:`, error);
        }
      }

      // Cleanup orphaned tags one at a time
      const tags = await this.client.getTags();
      const orphanedTags = tags.filter(t => isTestResource(t.name));

      for (const tag of orphanedTags) {
        try {
          await this.client.deleteTag(tag.name);
          cleanedTags++;
          await apiDelay();
        } catch (error) {
          console.warn(`[live-test] Failed to delete orphaned tag ${tag.name}:`, error);
        }
      }

      // Cleanup orphaned groups one at a time
      const groups = await this.client.getProjectGroups();
      const orphanedGroups = groups.filter(g => g.name && isTestResource(g.name));

      for (const group of orphanedGroups) {
        try {
          await this.client.deleteProjectGroups([group.id]);
          cleanedGroups++;
          await apiDelay();
        } catch (error) {
          console.warn(`[live-test] Failed to delete orphaned group ${group.id}:`, error);
        }
      }

      // Log summary
      const total = cleanedTasks + cleanedProjects + cleanedTags + cleanedGroups;
      if (total > 0) {
        console.log(`[live-test] Cleaned up ${total} orphaned resource(s): ${cleanedTasks} tasks, ${cleanedProjects} projects, ${cleanedTags} tags, ${cleanedGroups} groups`);
      }
    } catch (error) {
      console.warn("[live-test] Error during orphan cleanup:", error);
      // Continue with test setup even if cleanup fails
    }
  }
}

/**
 * Standalone cleanup function to remove all test resources.
 * Can be run before tests to ensure a clean slate.
 *
 * Usage: RUN_LIVE_TESTS=1 TICKTICK_TOKEN=xxx bun run tests/helpers/cleanup.ts
 */
export async function cleanupAllTestResources(): Promise<void> {
  if (!shouldRunLiveTests()) {
    console.log("[cleanup] Skipping - RUN_LIVE_TESTS=1 and TICKTICK_TOKEN required");
    return;
  }

  const client = getLiveClient();
  console.log("[cleanup] Starting cleanup of all test resources...");

  let cleanedTasks = 0;
  let cleanedProjects = 0;
  let cleanedTags = 0;
  let cleanedGroups = 0;

  // First, get all projects to identify test projects
  let testProjectIds: Set<string> = new Set();
  try {
    const projects = await client.getProjects();
    const testProjects = projects.filter(p => p.name && isTestResource(p.name));
    testProjectIds = new Set(testProjects.map(p => p.id));
    console.log(`[cleanup] Found ${testProjects.length} test project(s)`);
  } catch (error) {
    console.warn("[cleanup] Error fetching projects:", error);
  }

  // Cleanup tasks - both by title prefix AND tasks in test projects
  try {
    const tasks = await client.getTasks();
    const testTasks = tasks.filter(t => 
      (t.title && isTestResource(t.title)) || 
      (t.projectId && testProjectIds.has(t.projectId))
    );
    console.log(`[cleanup] Found ${testTasks.length} test task(s) to delete`);

    // Group tasks by project for proper deletion
    const tasksByProject = new Map<string, string[]>();
    for (const task of testTasks) {
      const projectId = task.projectId || "unknown";
      if (!tasksByProject.has(projectId)) {
        tasksByProject.set(projectId, []);
      }
      tasksByProject.get(projectId)!.push(task.id);
    }

    // Delete tasks project by project, including projectId in the delete request
    for (const [projectId, taskIds] of tasksByProject) {
      for (const taskId of taskIds) {
        try {
          const task = testTasks.find(t => t.id === taskId);
          // Include projectId in delete request - some API versions require it
          await client.deleteTasks([taskId], projectId !== "unknown" ? projectId : undefined);
          cleanedTasks++;
          console.log(`[cleanup] Deleted task: ${task?.title || taskId}`);
          await apiDelay();
        } catch (error) {
          console.warn(`[cleanup] Failed to delete task ${taskId}:`, error);
        }
      }
    }
  } catch (error) {
    console.warn("[cleanup] Error fetching/deleting tasks:", error);
  }

  // Wait a bit for task deletions to propagate before deleting projects
  await apiDelay(1000);

  // Cleanup test projects (now that tasks are deleted)
  try {
    // Re-fetch projects in case state changed
    const projects = await client.getProjects();
    const testProjects = projects.filter(p => p.name && isTestResource(p.name));
    console.log(`[cleanup] Found ${testProjects.length} test project(s) to delete`);

    for (const project of testProjects) {
      try {
        await client.deleteProjects([project.id]);
        cleanedProjects++;
        console.log(`[cleanup] Deleted project: ${project.name}`);
        await apiDelay();
      } catch (error) {
        console.warn(`[cleanup] Failed to delete project ${project.id}:`, error);
      }
    }
  } catch (error) {
    console.warn("[cleanup] Error fetching projects:", error);
  }

  // Cleanup test tags
  try {
    const tags = await client.getTags();
    const testTags = tags.filter(t => isTestResource(t.name));
    console.log(`[cleanup] Found ${testTags.length} test tag(s) to delete`);

    for (const tag of testTags) {
      try {
        await client.deleteTag(tag.name);
        cleanedTags++;
        console.log(`[cleanup] Deleted tag: ${tag.name}`);
        await apiDelay();
      } catch (error) {
        console.warn(`[cleanup] Failed to delete tag ${tag.name}:`, error);
      }
    }
  } catch (error) {
    console.warn("[cleanup] Error fetching tags:", error);
  }

  // Cleanup test groups
  try {
    const groups = await client.getProjectGroups();
    const testGroups = groups.filter(g => g.name && isTestResource(g.name));
    console.log(`[cleanup] Found ${testGroups.length} test group(s) to delete`);

    for (const group of testGroups) {
      try {
        await client.deleteProjectGroups([group.id]);
        cleanedGroups++;
        console.log(`[cleanup] Deleted group: ${group.name}`);
        await apiDelay();
      } catch (error) {
        console.warn(`[cleanup] Failed to delete group ${group.id}:`, error);
      }
    }
  } catch (error) {
    console.warn("[cleanup] Error fetching groups:", error);
  }

  console.log(`[cleanup] Done! Cleaned up: ${cleanedTasks} tasks, ${cleanedProjects} projects, ${cleanedTags} tags, ${cleanedGroups} groups`);
}

/**
 * Wrapper for describe() that skips if live tests shouldn't run.
 *
 * Usage:
 * ```ts
 * describeLive("API Integration", () => {
 *   it("does something", async () => { ... });
 * });
 * ```
 */
export function describeLive(name: string, fn: () => void): void {
  const skipReason = getSkipReason();

  if (skipReason) {
    describe.skip(`[LIVE] ${name} (${skipReason})`, fn);
  } else {
    describe(`[LIVE] ${name}`, fn);
  }
}

/**
 * Create a test suite with automatic project setup/teardown.
 *
 * Usage:
 * ```ts
 * describeLiveWithProject("Task API", ({ getClient, getTestProject }) => {
 *   it("creates a task", async () => {
 *     const client = getClient();
 *     const project = getTestProject();
 *     // ...
 *   });
 * });
 * ```
 */
export function describeLiveWithProject(
  name: string,
  fn: (ctx: {
    getClient: () => TickTickClient;
    getTestProject: () => TestProject;
  }) => void
): void {
  const skipReason = getSkipReason();

  if (skipReason) {
    describe.skip(`[LIVE] ${name} (${skipReason})`, () => {
      fn({
        getClient: () => { throw new Error("Not available in skipped test"); },
        getTestProject: () => { throw new Error("Not available in skipped test"); },
      });
    });
    return;
  }

  describe(`[LIVE] ${name}`, () => {
    let client: TickTickClient;
    let testProject: TestProject;

    // Use longer timeouts for setup/teardown since they make API calls
    // and may need to clean up orphaned resources
    beforeAll(async () => {
      client = getLiveClient();
      testProject = new TestProject(client);
      await testProject.setup();
    }, 60000); // 60 second timeout for setup

    afterAll(async () => {
      if (testProject) {
        await testProject.teardown();
      }
    }, 60000); // 60 second timeout for teardown

    fn({
      getClient: () => client,
      getTestProject: () => testProject,
    });
  });
}
