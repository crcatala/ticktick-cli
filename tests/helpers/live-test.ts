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
   */
  private async cleanupOrphanedResources(): Promise<void> {
    try {
      // Cleanup orphaned projects
      const projects = await this.client.getProjects();
      const orphanedProjects = projects.filter(p => p.name && isTestResource(p.name));

      if (orphanedProjects.length > 0) {
        console.log(`[live-test] Cleaning up ${orphanedProjects.length} orphaned test project(s)`);
        const projectIds = orphanedProjects.map(p => p.id);
        await this.client.deleteProjects(projectIds);
        await apiDelay();
      }

      // Cleanup orphaned tags
      const tags = await this.client.getTags();
      const orphanedTags = tags.filter(t => isTestResource(t.name));

      for (const tag of orphanedTags) {
        console.log(`[live-test] Cleaning up orphaned test tag: ${tag.name}`);
        await this.client.deleteTag(tag.name);
        await apiDelay();
      }

      // Cleanup orphaned groups
      const groups = await this.client.getProjectGroups();
      const orphanedGroups = groups.filter(g => g.name && isTestResource(g.name));

      if (orphanedGroups.length > 0) {
        console.log(`[live-test] Cleaning up ${orphanedGroups.length} orphaned test group(s)`);
        const groupIds = orphanedGroups.map(g => g.id);
        await this.client.deleteProjectGroups(groupIds);
        await apiDelay();
      }
    } catch (error) {
      console.warn("[live-test] Error during orphan cleanup:", error);
      // Continue with test setup even if cleanup fails
    }
  }
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

    beforeAll(async () => {
      client = getLiveClient();
      testProject = new TestProject(client);
      await testProject.setup();
    });

    afterAll(async () => {
      if (testProject) {
        await testProject.teardown();
      }
    });

    fn({
      getClient: () => client,
      getTestProject: () => testProject,
    });
  });
}
