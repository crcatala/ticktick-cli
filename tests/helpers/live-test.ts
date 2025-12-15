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

/** Maximum number of retries for cleanup operations */
const CLEANUP_MAX_RETRIES = 3;

/**
 * Retry an async operation with delays between attempts.
 * Used for cleanup operations that may fail transiently.
 */
async function retryOperation<T>(
  operation: () => Promise<T>,
  description: string,
  maxRetries: number = CLEANUP_MAX_RETRIES
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) {
        console.warn(`[cleanup] Failed ${description} after ${maxRetries} attempts:`, error);
        return null;
      }
      await apiDelay();
    }
  }
  return null;
}

/**
 * Create a throttled version of the TickTick client.
 * 
 * Wraps all async methods to automatically add a delay after each call,
 * preventing rate limiting without manual apiDelay() calls.
 * 
 * @param client - The TickTick client to wrap
 * @param delayMs - Delay in milliseconds after each API call (default: DEFAULT_API_DELAY)
 * @returns A proxied client that throttles all async method calls
 */
export function createThrottledClient(
  client: TickTickClient,
  delayMs: number = DEFAULT_API_DELAY
): TickTickClient {
  return new Proxy(client, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      
      // Only wrap functions
      if (typeof value !== "function") {
        return value;
      }
      
      // Return a wrapped function that adds delay after async calls
      return async function (...args: unknown[]) {
        const result = await value.apply(target, args);
        await sleep(delayMs);
        return result;
      };
    },
  });
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
    // Delete tracked tasks (with retry)
    if (this.createdTaskIds.length > 0 && this.project) {
      await retryOperation(
        () => this.client.deleteTasks(this.createdTaskIds, this.project!.id),
        `deleting ${this.createdTaskIds.length} tracked tasks`
      );
      await apiDelay();
    }

    // Delete tracked tags (with retry for each)
    for (const tagName of this.createdTagNames) {
      await retryOperation(
        () => this.client.deleteTag(tagName),
        `deleting tag "${tagName}"`
      );
      await apiDelay();
    }

    // Delete tracked groups (with retry)
    if (this.createdGroupIds.length > 0) {
      await retryOperation(
        () => this.client.deleteProjectGroups(this.createdGroupIds),
        `deleting ${this.createdGroupIds.length} tracked groups`
      );
      await apiDelay();
    }

    // Delete the test project (with retry) - this should also delete tasks within it
    if (this.project) {
      await retryOperation(
        () => this.client.deleteProjects([this.project!.id]),
        `deleting test project "${this.project.name}"`
      );
      await apiDelay();
    }

    // Clear tracking
    this.createdTaskIds = [];
    this.createdTagNames = [];
    this.createdGroupIds = [];
    this.project = null;
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
        // Include projectId in delete request (skip if no projectId)
        if (task.projectId) {
          const result = await retryOperation(
            () => this.client.deleteTasks([task.id], task.projectId!),
            `deleting orphaned task ${task.id}`
          );
          if (result !== null) cleanedTasks++;
          await apiDelay();
        } else {
          console.warn(`[live-test] Cannot delete orphaned task ${task.id}: no projectId`);
        }
      }

      // Wait for task deletions to propagate
      if (cleanedTasks > 0) {
        await apiDelay(1000);
      }

      // Re-fetch projects and cleanup orphaned ones
      for (const project of orphanedProjects) {
        const result = await retryOperation(
          () => this.client.deleteProjects([project.id]),
          `deleting orphaned project ${project.id}`
        );
        if (result !== null) cleanedProjects++;
        await apiDelay();
      }

      // Cleanup orphaned tags one at a time
      const tags = await this.client.getTags();
      const orphanedTags = tags.filter(t => isTestResource(t.name));

      for (const tag of orphanedTags) {
        const result = await retryOperation(
          () => this.client.deleteTag(tag.name),
          `deleting orphaned tag ${tag.name}`
        );
        if (result !== null) cleanedTags++;
        await apiDelay();
      }

      // Cleanup orphaned groups one at a time
      const groups = await this.client.getProjectGroups();
      const orphanedGroups = groups.filter(g => g.name && isTestResource(g.name));

      for (const group of orphanedGroups) {
        const result = await retryOperation(
          () => this.client.deleteProjectGroups([group.id]),
          `deleting orphaned group ${group.id}`
        );
        if (result !== null) cleanedGroups++;
        await apiDelay();
      }

      // Empty trash to permanently delete all trashed items
      await retryOperation(
        () => this.client.emptyTrash(),
        "emptying trash"
      );
      await apiDelay();

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
      // Skip tasks without a valid projectId
      if (projectId === "unknown") {
        console.warn(`[cleanup] Skipping ${taskIds.length} tasks with unknown projectId`);
        continue;
      }
      for (const taskId of taskIds) {
        const task = testTasks.find(t => t.id === taskId);
        const result = await retryOperation(
          () => client.deleteTasks([taskId], projectId),
          `deleting task ${taskId}`
        );
        if (result !== null) {
          cleanedTasks++;
          console.log(`[cleanup] Deleted task: ${task?.title || taskId}`);
        }
        await apiDelay();
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
      const result = await retryOperation(
        () => client.deleteProjects([project.id]),
        `deleting project ${project.id}`
      );
      if (result !== null) {
        cleanedProjects++;
        console.log(`[cleanup] Deleted project: ${project.name}`);
      }
      await apiDelay();
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
      const result = await retryOperation(
        () => client.deleteTag(tag.name),
        `deleting tag ${tag.name}`
      );
      if (result !== null) {
        cleanedTags++;
        console.log(`[cleanup] Deleted tag: ${tag.name}`);
      }
      await apiDelay();
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
      const result = await retryOperation(
        () => client.deleteProjectGroups([group.id]),
        `deleting group ${group.id}`
      );
      if (result !== null) {
        cleanedGroups++;
        console.log(`[cleanup] Deleted group: ${group.name}`);
      }
      await apiDelay();
    }
  } catch (error) {
    console.warn("[cleanup] Error fetching groups:", error);
  }

  // Empty trash to permanently delete all trashed items
  console.log("[cleanup] Emptying trash...");
  await retryOperation(
    () => client.emptyTrash(),
    "emptying trash"
  );
  await apiDelay();

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
 * Options for describeLiveWithProject.
 */
export interface LiveTestOptions {
  /** Delay in milliseconds between API calls (default: DEFAULT_API_DELAY) */
  throttleMs?: number;
}

/**
 * Create a test suite with automatic project setup/teardown.
 * 
 * The client returned by getClient() is automatically throttled to add delays
 * between API calls, preventing rate limiting. Configure via options or
 * TICKTICK_TEST_DELAY_MS environment variable.
 *
 * Usage:
 * ```ts
 * describeLiveWithProject("Task API", ({ getClient, getTestProject }) => {
 *   it("creates a task", async () => {
 *     const client = getClient();
 *     const project = getTestProject();
 *     // No need for manual apiDelay() calls - client is throttled automatically
 *   });
 * });
 * ```
 */
export function describeLiveWithProject(
  name: string,
  fn: (ctx: {
    getClient: () => TickTickClient;
    getTestProject: () => TestProject;
  }) => void,
  options: LiveTestOptions = {}
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

  // Allow override via env var or options
  const throttleMs = options.throttleMs 
    ?? (process.env.TICKTICK_TEST_DELAY_MS ? parseInt(process.env.TICKTICK_TEST_DELAY_MS, 10) : DEFAULT_API_DELAY);

  describe(`[LIVE] ${name}`, () => {
    let rawClient: TickTickClient;
    let throttledClient: TickTickClient;
    let testProject: TestProject;

    // Use longer timeouts for setup/teardown since they make API calls
    // and may need to clean up orphaned resources
    beforeAll(async () => {
      rawClient = getLiveClient();
      throttledClient = createThrottledClient(rawClient, throttleMs);
      // Use raw client for setup to be faster (cleanup is less timing-sensitive)
      testProject = new TestProject(rawClient);
      await testProject.setup();
    }, 60000); // 60 second timeout for setup

    afterAll(async () => {
      if (testProject) {
        await testProject.teardown();
      }
    }, 60000); // 60 second timeout for teardown

    fn({
      getClient: () => throttledClient,
      getTestProject: () => testProject,
    });
  });
}
