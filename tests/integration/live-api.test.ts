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
  apiDelay,
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
// Note Tests
// ============================================================

describeLiveWithProject("Note API", ({ getClient, getTestProject }) => {
  it("creates a note and converts it back to a task", async () => {
    const client = getClient();
    let noteProjectId: string | undefined;
    let noteId: string | undefined;

    try {
      const noteProject = await client.createProject({
        name: generateTestName("note-project"),
        kind: "NOTE",
      });
      noteProjectId = noteProject.id;

      const title = generateTestName("note");
      const note = await client.createTask({
        title,
        projectId: noteProject.id,
        kind: "NOTE",
        content: "Live note content",
        items: [],
        reminders: [],
        tags: [],
        priority: 0,
        progress: 0,
        status: 0,
      });
      noteId = note.id;

      let fetched = await client.getTask(note.id, noteProject.id);
      expect(fetched.kind).toBe("NOTE");
      expect(fetched.title).toBe(title);
      expect(fetched.content).toBe("Live note content");

      await client.convertTaskKind(note.id, noteProject.id, "TEXT");
      fetched = await client.getTask(note.id, noteProject.id);
      expect(fetched.kind).toBe("TEXT");
      expect(fetched.content).toBe("Live note content");
    } finally {
      if (noteId && noteProjectId) {
        await client.deleteTasks([noteId], noteProjectId);
        await apiDelay();
      }
      if (noteProjectId) {
        await client.deleteProjects([noteProjectId]);
      }
    }
  });

  it("converts a task to a normalized note", async () => {
    const client = getClient();
    const testProject = getTestProject();
    const startDate = new Date(Date.now() + 86_400_000).toISOString();
    const task = await client.createTask({
      title: generateTestName("task-to-note"),
      projectId: testProject.getProjectId(),
      content: "Retained content",
      priority: 5,
      progress: 50,
      dueDate: startDate,
      startDate,
      isAllDay: true,
    });
    testProject.trackTask(task.id);

    await client.convertTaskKind(task.id, testProject.getProjectId(), "NOTE");
    const note = await client.getTask(task.id, testProject.getProjectId());

    expect(note.kind).toBe("NOTE");
    expect(note.title).toBe(task.title);
    expect(note.content).toBe("Retained content");
    expect(note.startDate).toBe(startDate);
    expect(note.isAllDay).toBe(true);
    expect(note.priority).toBe(0);
    expect(note.progress).toBe(0);
    expect(note.dueDate).toBeFalsy();
    expect(note.tags ?? []).toEqual([]);
    expect(note.items ?? []).toEqual([]);
    expect(note.reminders ?? []).toEqual([]);
    expect(note.repeatFlag).toBeFalsy();
  });
});

// ============================================================
// Batch Operations Tests
// ============================================================

describeLiveWithProject("Batch Task Operations", ({ getClient, getTestProject }) => {
  it("completes multiple tasks in a single batch", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create multiple tasks
    const tasks = [];
    for (let i = 0; i < 3; i++) {
      const task = await client.createTask({
        title: generateTestName(`batch-complete-${i}`),
        projectId: testProject.getProjectId(),
      });
      testProject.trackTask(task.id);
      tasks.push(task);
    }

    // Batch complete all tasks
    const result = await client.completeTasks(
      tasks.map(t => ({ taskId: t.id, projectId: testProject.getProjectId() }))
    );

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);

    // Verify all tasks are completed
    const closedTasks = await client.getClosedTasks("Completed");
    for (const task of tasks) {
      const found = closedTasks.find(t => t.id === task.id);
      expect(found).toBeDefined();
      expect(found?.status).toBe(2);
    }
  });

  it("abandons multiple tasks in a single batch", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create multiple tasks
    const tasks = [];
    for (let i = 0; i < 3; i++) {
      const task = await client.createTask({
        title: generateTestName(`batch-abandon-${i}`),
        projectId: testProject.getProjectId(),
      });
      testProject.trackTask(task.id);
      tasks.push(task);
    }

    // Batch abandon all tasks
    const result = await client.abandonTasks(
      tasks.map(t => ({ taskId: t.id, projectId: testProject.getProjectId() }))
    );

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);

    // Verify all tasks are abandoned
    const abandonedTasks = await client.getClosedTasks("Abandoned");
    for (const task of tasks) {
      const found = abandonedTasks.find(t => t.id === task.id);
      expect(found).toBeDefined();
      expect(found?.status).toBe(-1);
    }
  });

  it("reopens multiple completed tasks in a single batch", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create and complete multiple tasks
    const tasks = [];
    for (let i = 0; i < 3; i++) {
      const task = await client.createTask({
        title: generateTestName(`batch-reopen-${i}`),
        projectId: testProject.getProjectId(),
      });
      testProject.trackTask(task.id);
      await client.completeTask(task.id, testProject.getProjectId());
      tasks.push(task);
    }

    // Batch reopen all tasks
    const result = await client.reopenTasks(
      tasks.map(t => ({ taskId: t.id, projectId: testProject.getProjectId() }))
    );

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);

    // Verify all tasks are active again
    const activeTasks = await client.getTasks();
    for (const task of tasks) {
      const found = activeTasks.find(t => t.id === task.id);
      expect(found).toBeDefined();
      expect(found?.status).toBe(0);
    }
  });

  it("deletes multiple tasks in a single batch", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create multiple tasks (don't track - we're testing deletion)
    const tasks = [];
    for (let i = 0; i < 3; i++) {
      const task = await client.createTask({
        title: generateTestName(`batch-delete-${i}`),
        projectId: testProject.getProjectId(),
      });
      tasks.push(task);
    }

    // Batch delete all tasks
    const result = await client.deleteTasksBatch(
      tasks.map(t => ({ taskId: t.id, projectId: testProject.getProjectId() }))
    );

    expect(result.succeeded).toHaveLength(3);
    expect(result.failed).toHaveLength(0);

    // Verify all tasks are gone
    const activeTasks = await client.getTasks();
    for (const task of tasks) {
      const found = activeTasks.find(t => t.id === task.id);
      expect(found).toBeUndefined();
    }
  });

  it("handles batch operation with tasks from same project", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create tasks in the same project
    const task1 = await client.createTask({
      title: generateTestName("batch-same-proj-1"),
      projectId: testProject.getProjectId(),
    });
    testProject.trackTask(task1.id);

    const task2 = await client.createTask({
      title: generateTestName("batch-same-proj-2"),
      projectId: testProject.getProjectId(),
    });
    testProject.trackTask(task2.id);

    // Batch complete both
    const result = await client.completeTasks([
      { taskId: task1.id, projectId: testProject.getProjectId() },
      { taskId: task2.id, projectId: testProject.getProjectId() },
    ]);

    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });
});

// ============================================================
// Reminder Tests
// ============================================================

describeLiveWithProject("Reminder API", ({ getClient, getTestProject }) => {
  it("creates task with single reminder", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Reminders require a reference time (startDate or dueDate)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Tomorrow
    const startDate = futureDate.toISOString();

    const title = generateTestName("task-reminder");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
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

    // Reminders require a reference time
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2); // 2 days out
    const startDate = futureDate.toISOString();

    const title = generateTestName("task-multi-reminder");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
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

  // NOTE: The TickTick API does not support modifying existing reminders via update.
  // The API only supports:
  // - Creating tasks with reminders
  // - Clearing all reminders (empty array)
  // - NOT modifying existing reminder triggers or IDs
  //
  // This test verifies that reminders persist through other updates (like title changes)
  it("verifies reminders persist through task updates", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Reminders require a reference time
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const startDate = futureDate.toISOString();

    // Create task WITH reminders
    const title = generateTestName("task");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
      reminders: [
        {
          id: "694044a2725bb97301a131e9",
          trigger: "TRIGGER:-PT60M", // 1 hour before
        },
      ],
    });
    testProject.trackTask(task.id);

    // Update the task title (not reminders) to verify reminders persist
    await client.updateTask({
      id: task.id,
      title: generateTestName("task-updated"),
    });

    // Verify reminders were NOT cleared by the update
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found?.reminders).toBeDefined();
    expect(found?.reminders?.length).toBe(1);
    expect(found?.reminders?.[0]?.trigger).toBe("TRIGGER:-PT60M");
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

    // Reminders require a reference time
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const startDate = futureDate.toISOString();

    const title = generateTestName("task-persist");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
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
// Recurring Task Tests
// ============================================================

describeLiveWithProject("Recurring Task API", ({ getClient, getTestProject }) => {
  it("creates a daily recurring task", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Recurring tasks require a start/due date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const startDate = futureDate.toISOString();

    const title = generateTestName("recurring-daily");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
      repeatFlag: "RRULE:FREQ=DAILY;INTERVAL=1",
      repeatFrom: "2",
      repeatFirstDate: startDate,
    });
    testProject.trackTask(task.id);

    expect(task.id).toBeDefined();
    expect(task.title).toBe(title);

    // Verify repeat flag persisted
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.repeatFlag).toBe("RRULE:FREQ=DAILY;INTERVAL=1");
  });

  it("creates a weekly recurring task with specific days", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const startDate = futureDate.toISOString();

    const title = generateTestName("recurring-weekly");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
      repeatFlag: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR",
      repeatFrom: "2",
      repeatFirstDate: startDate,
    });
    testProject.trackTask(task.id);

    expect(task.id).toBeDefined();

    // Verify repeat flag persisted
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
  });

  it("creates a recurring task with count limit", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const startDate = futureDate.toISOString();

    const title = generateTestName("recurring-count");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
      repeatFlag: "RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=10",
      repeatFrom: "2",
      repeatFirstDate: startDate,
    });
    testProject.trackTask(task.id);

    expect(task.id).toBeDefined();

    // Verify repeat flag persisted
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.repeatFlag).toContain("COUNT=10");
  });

  it("creates a recurring task with until date", async () => {
    const client = getClient();
    const testProject = getTestProject();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const startDate = futureDate.toISOString();

    // End date 3 months from now
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);
    const untilDate = endDate.toISOString().slice(0, 10).replace(/-/g, "");

    const title = generateTestName("recurring-until");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
      repeatFlag: `RRULE:FREQ=MONTHLY;INTERVAL=1;UNTIL=${untilDate}`,
      repeatFrom: "2",
      repeatFirstDate: startDate,
    });
    testProject.trackTask(task.id);

    expect(task.id).toBeDefined();

    // Verify repeat flag persisted
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.repeatFlag).toContain("UNTIL=");
  });

  it("updates task to add repeat pattern", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a non-recurring task first
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const startDate = futureDate.toISOString();

    const title = generateTestName("task-add-repeat");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
    });
    testProject.trackTask(task.id);

    // Update to add repeat pattern
    // Note: projectId is required for the API to properly update repeat fields
    await client.updateTask({
      id: task.id,
      projectId: testProject.getProjectId(),
      repeatFlag: "RRULE:FREQ=DAILY;INTERVAL=1",
      repeatFrom: "2",
      repeatFirstDate: startDate,
    });

    // Verify repeat flag was added
    const tasks = await client.getTasks();
    const found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    expect(found?.repeatFlag).toBe("RRULE:FREQ=DAILY;INTERVAL=1");
  });

  it("updates task to clear repeat pattern", async () => {
    const client = getClient();
    const testProject = getTestProject();

    // Create a recurring task
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const startDate = futureDate.toISOString();

    const title = generateTestName("task-clear-repeat");
    const task = await client.createTask({
      title,
      projectId: testProject.getProjectId(),
      startDate,
      repeatFlag: "RRULE:FREQ=DAILY;INTERVAL=1",
      repeatFrom: "2",
      repeatFirstDate: startDate,
    });
    testProject.trackTask(task.id);

    // Verify it has a repeat flag
    let tasks = await client.getTasks();
    let found = tasks.find((t) => t.id === task.id);
    expect(found?.repeatFlag).toBe("RRULE:FREQ=DAILY;INTERVAL=1");

    // Update to clear repeat pattern
    // Note: projectId is required for the API to properly update repeat fields
    // TickTick API seems to need explicit null values to clear repeat fields
    await client.updateTask({
      id: task.id,
      projectId: testProject.getProjectId(),
      repeatFlag: null,
      repeatFrom: null,
      repeatFirstDate: null,
    } as Parameters<typeof client.updateTask>[0]);

    // Verify repeat flag was cleared
    tasks = await client.getTasks();
    found = tasks.find((t) => t.id === task.id);

    expect(found).toBeDefined();
    // repeatFlag should be empty/null/undefined after clearing
    // The API may return null, undefined, or empty string
    expect(found?.repeatFlag || null).toBeFalsy();
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

  it("removes project from folder using NONE", async () => {
    // The TickTick API uses "NONE" as a magic value to remove a project from a folder
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

    // Remove from folder by setting groupId to "NONE"
    await client.updateProject({
      id: project.id,
      groupId: "NONE",
    });

    // Verify the project no longer has a folder
    const projects = await client.getProjects();
    const updatedProject = projects.find(p => p.id === project.id);

    expect(updatedProject).toBeDefined();
    // groupId should be null/undefined after removal with "NONE"
    expect(updatedProject?.groupId).toBeFalsy();

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
