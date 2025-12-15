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

  it("creates project in a folder", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a folder first
    const folderName = generateTestName("folder");
    const folder = await client.createProjectGroup({ name: folderName });
    testProject.trackGroup(folder.id);

    // Create a project in that folder
    const projectName = generateTestName("project");
    const project = await client.createProject({
      name: projectName,
      groupId: folder.id,
    });

    expect(project.id).toBeDefined();
    expect(project.groupId).toBe(folder.id);

    // Clean up the project
    await client.deleteProjects([project.id]);
  });

  it("moves project to different folder", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create two folders
    const folder1Name = generateTestName("folder1");
    const folder1 = await client.createProjectGroup({ name: folder1Name });
    testProject.trackGroup(folder1.id);

    const folder2Name = generateTestName("folder2");
    const folder2 = await client.createProjectGroup({ name: folder2Name });
    testProject.trackGroup(folder2.id);

    // Create a project in folder1
    const projectName = generateTestName("project");
    const project = await client.createProject({
      name: projectName,
      groupId: folder1.id,
    });

    expect(project.groupId).toBe(folder1.id);

    // Move project to folder2
    await client.updateProject({
      id: project.id,
      groupId: folder2.id,
    });

    // Verify the move by fetching projects
    const projects = await client.getProjects();
    const updatedProject = projects.find(p => p.id === project.id);

    expect(updatedProject).toBeDefined();
    expect(updatedProject?.groupId).toBe(folder2.id);

    // Clean up the project
    await client.deleteProjects([project.id]);
  });

  it("clearing groupId does not remove project from folder (API limitation)", async () => {
    // NOTE: The TickTick API does not support removing a project from a folder
    // by setting groupId to empty string or null. The API silently ignores this.
    // This test documents the current API behavior.
    const client = getClient();
    const testProject = getTestProject();

    // Create a folder
    const folderName = generateTestName("folder");
    const folder = await client.createProjectGroup({ name: folderName });
    testProject.trackGroup(folder.id);

    // Create a project in that folder
    const projectName = generateTestName("project");
    const project = await client.createProject({
      name: projectName,
      groupId: folder.id,
    });

    expect(project.groupId).toBe(folder.id);

    // Attempt to remove from folder by setting groupId to empty string
    await client.updateProject({
      id: project.id,
      groupId: "",
    });

    // Verify the project STILL has its folder (API ignores empty groupId)
    const projects = await client.getProjects();
    const updatedProject = projects.find(p => p.id === project.id);

    expect(updatedProject).toBeDefined();
    // groupId is NOT cleared - the API ignores empty string
    expect(updatedProject?.groupId).toBe(folder.id);

    // Clean up the project
    await client.deleteProjects([project.id]);
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
