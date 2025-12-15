/**
 * Live integration tests for TickTick API.
 *
 * These tests exercise the real TickTick v2 API and require:
 * - RUN_LIVE_TESTS=1
 * - TICKTICK_TOKEN=<valid session token>
 *
 * Run with:
 *   RUN_LIVE_TESTS=1 TICKTICK_TOKEN=xxx bun test tests/integration/live-api.test.ts --timeout 60000
 *
 * The --timeout flag is important because API calls can be slow.
 * 
 * Throttling:
 *   The client is automatically throttled to prevent rate limiting.
 *   Configure delay via TICKTICK_TEST_DELAY_MS environment variable (default: 500ms).
 */
import { expect, it } from "bun:test";
import {
  describeLiveWithProject,
  generateTestName,
  TEST_RESOURCE_PREFIX,
} from "../helpers/live-test.js";

// ============================================================
// Task CRUD Tests
// ============================================================

describeLiveWithProject("Task API", ({ getClient, getTestProject }) => {
  it("creates a task", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const title = generateTestName("task");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      content: "Test task content",
      priority: 1,
    });
    testProject.trackTask(task.id);

    expect(task.id).toBeDefined();
    expect(task.title).toBe(title);
    expect(task.projectId).toBe(testProject.getProjectId());
  });

  it("updates a task", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a task first
    const title = generateTestName("task");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
    });
    testProject.trackTask(task.id);

    // Update the task
    const newTitle = generateTestName("task-updated");
    const updated = await client.updateTask({
      id: task.id,
      title: newTitle,
      content: "Updated content",
      priority: 3,
    });

    expect(updated.id).toBe(task.id);
    expect(updated.title).toBe(newTitle);
  });

  it("completes a task", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a task
    const title = generateTestName("task");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
    });
    testProject.trackTask(task.id);

    // Complete it
    await client.completeTask(task.id, testProject.getProjectId());

    // Verify it's in closed tasks (may need a moment to propagate)
    // Poll a few times since the API may have eventual consistency
    let found = false;
    for (let i = 0; i < 3; i++) {
      const closedTasks = await client.getClosedTasks("Completed");
      const matchingTask = closedTasks.find(t => t.id === task.id);
      if (matchingTask) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("reopens a completed task", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create and complete a task
    const title = generateTestName("task");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
    });
    testProject.trackTask(task.id);

    await client.completeTask(task.id, testProject.getProjectId());

    // Reopen it
    await client.reopenTask(task.id, testProject.getProjectId());

    // Verify it's back in active tasks
    const tasks = await client.getTasks();
    const found = tasks.find(t => t.id === task.id);
    expect(found).toBeDefined();
    expect(found?.status).toBe(0);
  });

  it("deletes a task", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a task
    const title = generateTestName("task");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
    });

    // Delete it (don't track since we're testing deletion)
    await client.deleteTasks([task.id], testProject.getProjectId());

    // Verify it's gone from active tasks
    const tasks = await client.getTasks();
    const found = tasks.find(t => t.id === task.id);
    expect(found).toBeUndefined();
  });
});

// ============================================================
// Reminder Tests
// ============================================================

describeLiveWithProject("Reminder API", ({ getClient, getTestProject }) => {
  it("creates task with single reminder", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const title = generateTestName("task-reminder");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      reminders: [
        {
          id: "694044a2725bb97301a131ef", // Client-generated ID
          trigger: "TRIGGER:-PT15M", // 15 minutes before
        },
      ],
    });
    testProject.trackTask(task.id);

    expect(task.id).toBeDefined();
    expect(task.title).toBe(title);

    // Fetch the task to verify reminders persisted
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.reminders).toBeDefined();
    expect(found?.reminders?.length).toBeGreaterThan(0);
    // API may replace ID, but trigger should match
    expect(found?.reminders?.[0]?.trigger).toBe("TRIGGER:-PT15M");
  });

  it("creates task with multiple reminders", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const title = generateTestName("task-multi-reminder");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      reminders: [
        {
          id: "694044a2725bb97301a131e1",
          trigger: "TRIGGER:PT0S", // On time
        },
        {
          id: "694044a2725bb97301a131e2",
          trigger: "TRIGGER:-PT60M", // 1 hour before
        },
        {
          id: "694044a2725bb97301a131e3",
          trigger: "TRIGGER:-PT1440M", // 1 day before
        },
      ],
    });
    testProject.trackTask(task.id);

    expect(task.id).toBeDefined();

    // Fetch and verify all reminders persisted
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.reminders).toBeDefined();
    expect(found?.reminders?.length).toBe(3);

    // Verify triggers match (order may vary)
    const triggers = found?.reminders?.map((r) => r.trigger).sort();
    expect(triggers).toContain("TRIGGER:PT0S");
    expect(triggers).toContain("TRIGGER:-PT60M");
    expect(triggers).toContain("TRIGGER:-PT1440M");
  });

  it("updates task to add reminders", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create task without reminders
    const title = generateTestName("task");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
    });
    testProject.trackTask(task.id);

    // Update to add reminders
    await client.updateTask({
      id: task.id,
      reminders: [
        {
          id: "694044a2725bb97301a131e4",
          trigger: "TRIGGER:-PT30M", // 30 minutes before
        },
      ],
    });

    // Verify reminders were added
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found?.reminders).toBeDefined();
    expect(found?.reminders?.length).toBeGreaterThan(0);
    expect(found?.reminders?.[0]?.trigger).toBe("TRIGGER:-PT30M");
  });

  it("updates task to clear reminders", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create task with reminders
    const title = generateTestName("task-clear-reminder");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      reminders: [
        {
          id: "694044a2725bb97301a131e5",
          trigger: "TRIGGER:-PT15M",
        },
      ],
    });
    testProject.trackTask(task.id);

    // Update to clear reminders
    await client.updateTask({
      id: task.id,
      reminders: [],
    });

    // Verify reminders were cleared
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.reminders?.length ?? 0).toBe(0);
  });

  it("verifies reminders persist across fetch operations", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const title = generateTestName("task-persist");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      reminders: [
        {
          id: "694044a2725bb97301a131e6",
          trigger: "TRIGGER:-PT120M", // 2 hours before
        },
      ],
    });
    testProject.trackTask(task.id);

    // Fetch multiple times to ensure persistence
    for (let i = 0; i < 2; i++) {
      const tasks = await client.getTasks();
      const found = tasks.find((t) => t.id === task.id);

      expect(found).toBeDefined();
      expect(found?.reminders).toBeDefined();
      expect(found?.reminders?.length).toBeGreaterThan(0);
      expect(found?.reminders?.[0]?.trigger).toBe("TRIGGER:-PT120M");
    }
  });
});

// ============================================================
// Project Management Tests
// ============================================================

describeLiveWithProject("Project API", ({ getClient, getTestProject }) => {
  it("creates a project", async () => {
    const client = getClient();

    const name = generateTestName("project");
    const project = await client.createProject({
      name,
      color: "#FF5733",
    });

    expect(project.id).toBeDefined();
    expect(project.name).toBe(name);

    // Clean up the extra project we created
    await client.deleteProjects([project.id]);
  });

  it("updates a project", async () => {
    const client = getClient();

    // Create a project
    const name = generateTestName("project");
    const project = await client.createProject({ name });

    // Update it
    const newName = generateTestName("project-updated");
    const updated = await client.updateProject({
      id: project.id,
      name: newName,
      color: "#00FF00",
    });

    expect(updated.id).toBe(project.id);
    expect(updated.name).toBe(newName);

    // Clean up
    await client.deleteProjects([project.id]);
  });

  it("lists projects including test project", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const projects = await client.getProjects();

    expect(projects.length).toBeGreaterThan(0);

    const found = projects.find(p => p.id === testProject.getProjectId());
    expect(found).toBeDefined();
  });

  it("gets inbox ID", async () => {
    const client = getClient();

    const inboxId = await client.getInbox();

    expect(inboxId).toBeDefined();
    expect(typeof inboxId).toBe("string");
  });
});

// ============================================================
// Project Group Tests
// ============================================================

describeLiveWithProject("Project Group API", ({ getClient, getTestProject }) => {
  it("creates a project group", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const name = generateTestName("group");
    const group = await client.createProjectGroup({ name });
    testProject.trackGroup(group.id);

    expect(group.id).toBeDefined();
    expect(group.name).toBe(name);
  });

  it("updates a project group", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a group
    const name = generateTestName("group");
    const group = await client.createProjectGroup({ name });
    testProject.trackGroup(group.id);

    // Update it
    const newName = generateTestName("group-updated");
    const updated = await client.updateProjectGroup({
      id: group.id,
      name: newName,
    });

    expect(updated.id).toBe(group.id);
    expect(updated.name).toBe(newName);
  });

  it("lists project groups", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a group to ensure there's at least one
    const name = generateTestName("group");
    const group = await client.createProjectGroup({ name });
    testProject.trackGroup(group.id);

    const groups = await client.getProjectGroups();

    expect(groups.length).toBeGreaterThan(0);

    const found = groups.find(g => g.id === group.id);
    expect(found).toBeDefined();
  });
});

// ============================================================
// Tag Tests
// ============================================================

describeLiveWithProject("Tag API", ({ getClient, getTestProject }) => {
  it("creates a tag", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const name = generateTestName("tag");
    const tag = await client.createTag({
      name,
      color: "#FF0000",
    });
    testProject.trackTag(name);

    expect(tag.name).toBe(name);
  });

  it("updates a tag", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a tag
    const name = generateTestName("tag");
    await client.createTag({ name });
    testProject.trackTag(name);

    // Update it
    const updated = await client.updateTag({
      name,
      color: "#00FF00",
    });

    expect(updated.name).toBe(name);
    expect(updated.color).toBe("#00FF00");
  });

  it("renames a tag", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a tag
    const oldName = generateTestName("tag");
    await client.createTag({ name: oldName });

    // Rename it
    const newName = generateTestName("tag-renamed");
    await client.renameTag(oldName, newName);
    testProject.trackTag(newName); // Track the new name for cleanup

    // Verify the old name is gone and new name exists
    const tags = await client.getTags();
    const oldFound = tags.find(t => t.name === oldName);
    const newFound = tags.find(t => t.name === newName);

    expect(oldFound).toBeUndefined();
    expect(newFound).toBeDefined();
  });

  it("lists tags", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a tag to ensure there's at least one
    const name = generateTestName("tag");
    await client.createTag({ name });
    testProject.trackTag(name);

    const tags = await client.getTags();

    expect(tags.length).toBeGreaterThan(0);

    const found = tags.find(t => t.name === name);
    expect(found).toBeDefined();
  });

  it("deletes a tag", async () => {
    const client = getClient();

    // Create a tag
    const name = generateTestName("tag");
    await client.createTag({ name });

    // Delete it (don't track since we're testing deletion)
    await client.deleteTag(name);

    // Verify it's gone
    const tags = await client.getTags();
    const found = tags.find(t => t.name === name);

    expect(found).toBeUndefined();
  });
});

// ============================================================
// Schema Validation Tests
// ============================================================

describeLiveWithProject("Schema Validation", ({ getClient }) => {
  it("validates batch response against schema", async () => {
    const client = getClient();

    // This will throw if schema validation fails (validation: "strict")
    const batch = await client.getBatch();

    expect(batch).toBeDefined();
    // Basic structure checks
    expect(Array.isArray(batch.projectProfiles ?? [])).toBe(true);
    expect(Array.isArray(batch.tags ?? [])).toBe(true);
  });

  it("validates user profile against schema", async () => {
    const client = getClient();

    const profile = await client.getProfile();

    expect(profile).toBeDefined();
    // Profile should have at least some identifying info
    expect(profile.username ?? profile.email ?? profile.id).toBeDefined();
  });

  it("validates user status against schema", async () => {
    const client = getClient();

    const status = await client.getUserStatus();

    expect(status).toBeDefined();
  });
});
