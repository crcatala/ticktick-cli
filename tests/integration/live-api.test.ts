/**
 * Live integration tests for TickTick API.
 *
 * These tests exercise the real TickTick v2 API and require:
 * - RUN_LIVE_TESTS=1
 * - TICKTICK_TOKEN=<valid session token>
 *
 * Run with: RUN_LIVE_TESTS=1 TICKTICK_TOKEN=xxx bun test tests/integration/live-api.test.ts
 */
import { expect, it } from "bun:test";
import {
  describeLiveWithProject,
  generateTestName,
  apiDelay,
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

    await apiDelay();
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
    await apiDelay();

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

    await apiDelay();
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
    await apiDelay();

    // Complete it
    await client.completeTask(task.id);
    await apiDelay();

    // Verify it's in closed tasks
    const closedTasks = await client.getClosedTasks("Completed");
    const found = closedTasks.find(t => t.id === task.id);
    expect(found).toBeDefined();

    await apiDelay();
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
    await apiDelay();

    await client.completeTask(task.id);
    await apiDelay();

    // Reopen it
    await client.reopenTask(task.id);
    await apiDelay();

    // Verify it's back in active tasks
    const tasks = await client.getTasks();
    const found = tasks.find(t => t.id === task.id);
    expect(found).toBeDefined();
    expect(found?.status).toBe(0);

    await apiDelay();
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
    await apiDelay();

    // Delete it (don't track since we're testing deletion)
    await client.deleteTasks([task.id]);
    await apiDelay();

    // Verify it's gone from active tasks
    const tasks = await client.getTasks();
    const found = tasks.find(t => t.id === task.id);
    expect(found).toBeUndefined();

    await apiDelay();
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
    await apiDelay();
    await client.deleteProjects([project.id]);

    await apiDelay();
  });

  it("updates a project", async () => {
    const client = getClient();

    // Create a project
    const name = generateTestName("project");
    const project = await client.createProject({ name });
    await apiDelay();

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
    await apiDelay();
    await client.deleteProjects([project.id]);

    await apiDelay();
  });

  it("lists projects including test project", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const projects = await client.getProjects();

    expect(projects.length).toBeGreaterThan(0);

    const found = projects.find(p => p.id === testProject.getProjectId());
    expect(found).toBeDefined();

    await apiDelay();
  });

  it("gets inbox ID", async () => {
    const client = getClient();

    const inboxId = await client.getInbox();

    expect(inboxId).toBeDefined();
    expect(typeof inboxId).toBe("string");

    await apiDelay();
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

    await apiDelay();
  });

  it("updates a project group", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a group
    const name = generateTestName("group");
    const group = await client.createProjectGroup({ name });
    testProject.trackGroup(group.id);
    await apiDelay();

    // Update it
    const newName = generateTestName("group-updated");
    const updated = await client.updateProjectGroup({
      id: group.id,
      name: newName,
    });

    expect(updated.id).toBe(group.id);
    expect(updated.name).toBe(newName);

    await apiDelay();
  });

  it("lists project groups", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a group to ensure there's at least one
    const name = generateTestName("group");
    const group = await client.createProjectGroup({ name });
    testProject.trackGroup(group.id);
    await apiDelay();

    const groups = await client.getProjectGroups();

    expect(groups.length).toBeGreaterThan(0);

    const found = groups.find(g => g.id === group.id);
    expect(found).toBeDefined();

    await apiDelay();
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

    await apiDelay();
  });

  it("updates a tag", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a tag
    const name = generateTestName("tag");
    await client.createTag({ name });
    testProject.trackTag(name);
    await apiDelay();

    // Update it
    const updated = await client.updateTag({
      name,
      color: "#00FF00",
    });

    expect(updated.name).toBe(name);
    expect(updated.color).toBe("#00FF00");

    await apiDelay();
  });

  it("renames a tag", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a tag
    const oldName = generateTestName("tag");
    await client.createTag({ name: oldName });
    await apiDelay();

    // Rename it
    const newName = generateTestName("tag-renamed");
    await client.renameTag(oldName, newName);
    testProject.trackTag(newName); // Track the new name for cleanup
    await apiDelay();

    // Verify the old name is gone and new name exists
    const tags = await client.getTags();
    const oldFound = tags.find(t => t.name === oldName);
    const newFound = tags.find(t => t.name === newName);

    expect(oldFound).toBeUndefined();
    expect(newFound).toBeDefined();

    await apiDelay();
  });

  it("lists tags", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a tag to ensure there's at least one
    const name = generateTestName("tag");
    await client.createTag({ name });
    testProject.trackTag(name);
    await apiDelay();

    const tags = await client.getTags();

    expect(tags.length).toBeGreaterThan(0);

    const found = tags.find(t => t.name === name);
    expect(found).toBeDefined();

    await apiDelay();
  });

  it("deletes a tag", async () => {
    const client = getClient();

    // Create a tag
    const name = generateTestName("tag");
    await client.createTag({ name });
    await apiDelay();

    // Delete it (don't track since we're testing deletion)
    await client.deleteTag(name);
    await apiDelay();

    // Verify it's gone
    const tags = await client.getTags();
    const found = tags.find(t => t.name === name);

    expect(found).toBeUndefined();

    await apiDelay();
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

    await apiDelay();
  });

  it("validates user profile against schema", async () => {
    const client = getClient();

    const profile = await client.getProfile();

    expect(profile).toBeDefined();
    // Profile should have at least some identifying info
    expect(profile.username ?? profile.email ?? profile.id).toBeDefined();

    await apiDelay();
  });

  it("validates user status against schema", async () => {
    const client = getClient();

    const status = await client.getUserStatus();

    expect(status).toBeDefined();

    await apiDelay();
  });
});
