import { describe, expect, mock, test, beforeEach } from "bun:test";
import { server, http, HttpResponse } from "../setup/msw.js";
import { BASE_URL } from "../../src/api/endpoints.js";

const API_BASE = BASE_URL;

const createClient = async () => {
  const { TickTickClient } = await import("../../src/api/client.js");
  return new TickTickClient("user", "token");
};

describe("TickTickClient", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("creates a browser-compatible device fingerprint with the default web version", async () => {
    const {
      createTickTickDeviceHeader,
      createTickTickWebHeaders,
      DEFAULT_TICKTICK_WEB_VERSION,
    } = await import("../../src/api/client.js");
    const deviceId = "0123456789abcdef01234567";
    const device = JSON.parse(createTickTickDeviceHeader(deviceId));
    const headers = createTickTickWebHeaders(deviceId, "session-token");

    expect(device).toEqual({
      platform: "web",
      os: "macOS 10.15.7",
      device: "Chrome 150.0.0.0",
      name: "",
      version: DEFAULT_TICKTICK_WEB_VERSION,
      id: deviceId,
      channel: "website",
      campaign: "",
      websocket: "",
    });
    expect(headers["User-Agent"]).toContain("Chrome/150.0.0.0");
    expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(headers.Cookie).toBe("t=session-token");
  });

  test("uses a valid TICKTICK_WEB_VERSION override", async () => {
    const { createTickTickDeviceHeader, DEFAULT_TICKTICK_WEB_VERSION } =
      await import("../../src/api/client.js");
    const deviceId = "0123456789abcdef01234567";

    expect(
      JSON.parse(
        createTickTickDeviceHeader(deviceId, { TICKTICK_WEB_VERSION: "9001" })
      ).version
    ).toBe(9001);
    expect(
      JSON.parse(
        createTickTickDeviceHeader(deviceId, { TICKTICK_WEB_VERSION: "invalid" })
      ).version
    ).toBe(DEFAULT_TICKTICK_WEB_VERSION);
  });

  test("request retries on 429 with exponential backoff", async () => {
    let callCount = 0;
    server.use(
      http.get(`${API_BASE}/user/profile`, () => {
        callCount += 1;
        if (callCount < 2) {
          return HttpResponse.json({ message: "slow down" }, { status: 429 });
        }
        return HttpResponse.json({ username: "user" });
      })
    );

    const client = await createClient();
    const start = performance.now();
    const profile = await client.getProfile();
    const elapsed = performance.now() - start;

    expect(profile.username).toBe("user");
    expect(callCount).toBe(2);
    // Backoff uses 1000ms base delay with 10% jitter, so minimum is ~900ms
    expect(elapsed).toBeGreaterThanOrEqual(850);
  }, 8000);

  test("createTask attaches generated id and etag", async () => {
    const ids: string[] = [];

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        const body = await request.json();
        ids.push(body.add[0].id);
        return HttpResponse.json({ id2etag: { [body.add[0].id]: "etag" } });
      })
    );

    const client = await createClient();
    const task = await client.createTask({ title: "Test" });

    expect(task.id).toBeDefined();
    expect(task.etag).toBe("etag");
    expect(ids).toHaveLength(1);
  });

  test("createTask generates MongoDB ObjectId format", async () => {
    let capturedId: string | undefined;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        const body = await request.json();
        capturedId = body.add[0].id;
        return HttpResponse.json({ id2etag: { [capturedId]: "etag" } });
      })
    );

    const client = await createClient();
    await client.createTask({ title: "Test" });

    expect(capturedId).toBeDefined();
    // MongoDB ObjectId format: 24 hex characters
    expect(capturedId).toMatch(/^[0-9a-f]{24}$/);
  });

  test("createTask throws ClientError when id2error present", async () => {
    server.use(
      http.post(`${API_BASE}/batch/task`, () =>
        HttpResponse.json({ id2error: { foo: "bad" } }, { status: 200 })
      )
    );

    const client = await createClient();
    await expect(client.createTask({ title: "oops" })).rejects.toThrow("Failed to create task");
  });

  test("deleteTasks sends projectId in request", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: {} });
      })
    );

    const client = await createClient();
    await client.deleteTasks(["task-123"], "project-456");

    expect(capturedBody).toEqual({
      delete: [{ taskId: "task-123", projectId: "project-456" }],
    });
  });

  test("completeTask sends status, projectId, and completedTime", async () => {
    let capturedBody: unknown;

    server.use(
      // Mock getTask call (needed since completeTask calls updateTask internally)
      http.get(`${API_BASE}/task/:taskId`, ({ params }) => {
        return HttpResponse.json({
          id: params.taskId,
          projectId: "project-456",
          title: "Task to complete",
          status: 0,
        });
      }),
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: {} });
      })
    );

    const client = await createClient();
    await client.completeTask("task-123", "project-456");

    const body = capturedBody as { update: Array<{ id: string; projectId: string; status: number; completedTime: string }> };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].projectId).toBe("project-456");
    expect(body.update[0].status).toBe(2);
    expect(body.update[0].completedTime).toBeDefined();
    // Verify completedTime is ISO format
    expect(new Date(body.update[0].completedTime).toISOString()).toBe(body.update[0].completedTime);
  });

  test("abandonTask sends status -1, projectId, and completedTime", async () => {
    let capturedBody: unknown;

    server.use(
      // Mock getTask call (needed since abandonTask calls updateTask internally)
      http.get(`${API_BASE}/task/:taskId`, ({ params }) => {
        return HttpResponse.json({
          id: params.taskId,
          projectId: "project-456",
          title: "Task to abandon",
          status: 0,
        });
      }),
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: {} });
      })
    );

    const client = await createClient();
    await client.abandonTask("task-123", "project-456");

    const body = capturedBody as { update: Array<{ id: string; projectId: string; status: number; completedTime: string }> };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].projectId).toBe("project-456");
    expect(body.update[0].status).toBe(-1);
    expect(body.update[0].completedTime).toBeDefined();
  });

  test("reopenTask sends status 0 and projectId", async () => {
    let capturedBody: unknown;

    server.use(
      // Mock getTask call (needed since reopenTask calls updateTask internally)
      http.get(`${API_BASE}/task/:taskId`, ({ params }) => {
        return HttpResponse.json({
          id: params.taskId,
          projectId: "project-456",
          title: "Task to reopen",
          status: 2,
        });
      }),
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: {} });
      })
    );

    const client = await createClient();
    await client.reopenTask("task-123", "project-456");

    const body = capturedBody as { update: Array<{ id: string; projectId: string; status: number }> };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].projectId).toBe("project-456");
    expect(body.update[0].status).toBe(0);
  });

  test("renameTag uses PUT method", async () => {
    let capturedMethod: string | undefined;
    let capturedBody: unknown;

    server.use(
      http.put(`${API_BASE}/tag/rename`, async ({ request }) => {
        capturedMethod = request.method;
        capturedBody = await request.json();
        return HttpResponse.json({});
      })
    );

    const client = await createClient();
    await client.renameTag("old-tag", "new-tag");

    expect(capturedMethod).toBe("PUT");
    expect(capturedBody).toEqual({ name: "old-tag", newName: "new-tag" });
  });

  test("emptyTrash uses DELETE method", async () => {
    let capturedMethod: string | undefined;

    server.use(
      http.delete(`${API_BASE}/trash/cleanUp`, ({ request }) => {
        capturedMethod = request.method;
        return HttpResponse.json({});
      })
    );

    const client = await createClient();
    await client.emptyTrash();

    expect(capturedMethod).toBe("DELETE");
  });

  test("login handles need_2fa response", async () => {
    server.use(
      http.post(`${API_BASE}/user/signon`, ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("wc")).toBe("true");
        expect(url.searchParams.get("remember")).toBe("true");
        return HttpResponse.json({ errorCode: "need_2fa" }, { status: 200 });
      })
    );

    const { login } = await import("../../src/api/client.js");
    const resp = await login("user", "pass");
    expect(resp.need2FA).toBeTrue();
  });

  test("createTask sends reminders array in request body", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "fakeid": "etag" } });
      })
    );

    const client = await createClient();
    await client.createTask({
      title: "Test with reminders",
      reminders: [
        { id: "694044a2725bb97301a131ef", trigger: "TRIGGER:-PT15M" },
        { id: "694044a2725bb97301a131f0", trigger: "TRIGGER:-PT60M" },
      ],
    });

    const body = capturedBody as { add: Array<{ title: string; reminders: Array<{ id: string; trigger: string }> }> };
    expect(body.add).toHaveLength(1);
    expect(body.add[0].title).toBe("Test with reminders");
    expect(body.add[0].reminders).toBeDefined();
    expect(body.add[0].reminders).toHaveLength(2);
    expect(body.add[0].reminders[0].id).toBe("694044a2725bb97301a131ef");
    expect(body.add[0].reminders[0].trigger).toBe("TRIGGER:-PT15M");
    expect(body.add[0].reminders[1].id).toBe("694044a2725bb97301a131f0");
    expect(body.add[0].reminders[1].trigger).toBe("TRIGGER:-PT60M");
  });

  test("updateTask sends reminders array in request body", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-123": "etag" } });
      })
    );

    const client = await createClient();
    await client.updateTask({
      id: "task-123",
      reminders: [
        { id: "694044a2725bb97301a131f1", trigger: "TRIGGER:-PT30M" },
      ],
    });

    const body = capturedBody as { update: Array<{ id: string; reminders: Array<{ id: string; trigger: string }> }> };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].reminders).toBeDefined();
    expect(body.update[0].reminders).toHaveLength(1);
    expect(body.update[0].reminders[0].id).toBe("694044a2725bb97301a131f1");
    expect(body.update[0].reminders[0].trigger).toBe("TRIGGER:-PT30M");
  });

  test("updateTask clears reminders with empty array", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-123": "etag" } });
      })
    );

    const client = await createClient();
    await client.updateTask({
      id: "task-123",
      reminders: [],
    });

    const body = capturedBody as { update: Array<{ id: string; reminders: unknown[] }> };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].reminders).toBeDefined();
    expect(body.update[0].reminders).toHaveLength(0);
  });

  test("createTask sends repeat fields in request body", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "fakeid": "etag" } });
      })
    );

    const client = await createClient();
    await client.createTask({
      title: "Daily standup",
      repeatFlag: "RRULE:FREQ=DAILY;INTERVAL=1",
      repeatFrom: "2",
      repeatFirstDate: "2025-12-20T09:00:00.000+0000",
    });

    const body = capturedBody as { add: Array<{ title: string; repeatFlag: string; repeatFrom: string; repeatFirstDate: string }> };
    expect(body.add).toHaveLength(1);
    expect(body.add[0].title).toBe("Daily standup");
    expect(body.add[0].repeatFlag).toBe("RRULE:FREQ=DAILY;INTERVAL=1");
    expect(body.add[0].repeatFrom).toBe("2");
    expect(body.add[0].repeatFirstDate).toBe("2025-12-20T09:00:00.000+0000");
  });

  test("createTask sends weekly repeat with specific days", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "fakeid": "etag" } });
      })
    );

    const client = await createClient();
    await client.createTask({
      title: "Team sync",
      repeatFlag: "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR",
      repeatFrom: "2",
      repeatFirstDate: "2025-12-16T10:00:00.000+0000",
    });

    const body = capturedBody as { add: Array<{ repeatFlag: string }> };
    expect(body.add[0].repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
  });

  test("createTask sends repeat with count limit", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "fakeid": "etag" } });
      })
    );

    const client = await createClient();
    await client.createTask({
      title: "Sprint retro",
      repeatFlag: "RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=10",
      repeatFrom: "2",
      repeatFirstDate: "2025-12-20T14:00:00.000+0000",
    });

    const body = capturedBody as { add: Array<{ repeatFlag: string }> };
    expect(body.add[0].repeatFlag).toContain("COUNT=10");
  });

  test("updateTask sends repeat fields to add recurrence", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-123": "etag" } });
      })
    );

    const client = await createClient();
    await client.updateTask({
      id: "task-123",
      repeatFlag: "RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15",
      repeatFrom: "2",
      repeatFirstDate: "2025-12-15T00:00:00.000+0000",
    });

    const body = capturedBody as { update: Array<{ id: string; repeatFlag: string; repeatFrom: string; repeatFirstDate: string }> };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15");
    expect(body.update[0].repeatFrom).toBe("2");
    expect(body.update[0].repeatFirstDate).toBe("2025-12-15T00:00:00.000+0000");
  });

  test("updateTask clears repeat with empty repeatFlag", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-123": "etag" } });
      })
    );

    const client = await createClient();
    await client.updateTask({
      id: "task-123",
      repeatFlag: "",
    });

    const body = capturedBody as { update: Array<{ id: string; repeatFlag: string }> };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].repeatFlag).toBe("");
  });

  test("convertTaskKind sends a normalized full-object update", async () => {
    let capturedBody: unknown;

    server.use(
      http.get(`${API_BASE}/task/:taskId`, ({ params }) =>
        HttpResponse.json({
          id: params.taskId,
          projectId: "project-456",
          title: "Test Task",
          content: "Keep this",
          priority: 5,
          progress: 50,
          dueDate: "2026-07-20T04:00:00.000+0000",
          tags: ["work"],
          reminders: [{ id: "reminder-1", trigger: "TRIGGER:PT0S" }],
          repeatFlag: "RRULE:FREQ=DAILY",
          items: [{ id: "item-1", title: "Checklist item", status: 0, sortOrder: 0 }],
        })
      ),
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-123": "new-etag" } });
      })
    );

    const client = await createClient();
    const task = await client.convertTaskKind("task-123", "project-456", "NOTE");
    const body = capturedBody as { update: Array<Record<string, unknown>> };

    expect(body.update).toHaveLength(1);
    expect(body.update[0]).toMatchObject({
      id: "task-123",
      projectId: "project-456",
      kind: "NOTE",
      content: "Keep this",
      priority: 0,
      progress: 0,
      dueDate: null,
      tags: [],
      reminders: [],
      repeatFlag: null,
      repeatFirstDate: null,
      repeatFrom: null,
      assignee: null,
      items: [],
    });
    expect(task.etag).toBe("new-etag");
  });

  test("getTask fetches single task with projectId query param", async () => {
    let capturedUrl: string | undefined;

    server.use(
      http.get(`${API_BASE}/task/:taskId`, ({ request, params }) => {
        capturedUrl = request.url;
        return HttpResponse.json({
          id: params.taskId,
          title: "Test Task",
          projectId: "project-456",
          items: [
            { id: "item-1", title: "Checklist item", status: 0, sortOrder: 0 },
          ],
        });
      })
    );

    const client = await createClient();
    const task = await client.getTask("task-123", "project-456");

    expect(capturedUrl).toContain("/task/task-123");
    expect(capturedUrl).toContain("projectId=project-456");
    expect(task.id).toBe("task-123");
    expect(task.title).toBe("Test Task");
    expect(task.items).toHaveLength(1);
    expect(task.items?.[0].title).toBe("Checklist item");
  });

  test("updateTask sends items array for checklist operations", async () => {
    let capturedBody: unknown;

    server.use(
      // Mock getTask call (needed since updateTask fetches full task when projectId provided)
      http.get(`${API_BASE}/task/:taskId`, ({ request, params }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("projectId")).toBe("project-456");
        return HttpResponse.json({
          id: params.taskId,
          projectId: "project-456",
          title: "Existing task",
          items: [],
        });
      }),
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-123": "new-etag" } });
      })
    );

    const client = await createClient();
    await client.updateTask({
      id: "task-123",
      projectId: "project-456",
      items: [
        { id: "item-1", title: "First item", status: 0, sortOrder: 0 },
        { id: "item-2", title: "Second item", status: 1, sortOrder: 100, completedTime: "2025-01-01T00:00:00.000Z" },
      ],
    });

    const body = capturedBody as {
      update: Array<{
        id: string;
        projectId: string;
        items: Array<{ id: string; title: string; status: number; sortOrder: number; completedTime?: string }>;
      }>;
    };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].projectId).toBe("project-456");
    expect(body.update[0].items).toHaveLength(2);
    expect(body.update[0].items[0]).toEqual({
      id: "item-1",
      title: "First item",
      status: 0,
      sortOrder: 0,
    });
    expect(body.update[0].items[1]).toEqual({
      id: "item-2",
      title: "Second item",
      status: 1,
      sortOrder: 100,
      completedTime: "2025-01-01T00:00:00.000Z",
    });
  });

  test("updateTask without items does not include items field", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-123": "new-etag" } });
      })
    );

    const client = await createClient();
    await client.updateTask({
      id: "task-123",
      title: "Updated title",
    });

    const body = capturedBody as { update: Array<{ id: string; title: string; items?: unknown }> };
    expect(body.update[0].id).toBe("task-123");
    expect(body.update[0].title).toBe("Updated title");
    expect(body.update[0].items).toBeUndefined();
  });

  // ============================================================
  // Project Group (Folder) Tests
  // ============================================================

  test("createProjectGroup generates ID and returns with etag", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/projectGroup`, async ({ request }) => {
        capturedBody = await request.json();
        const body = capturedBody as { add: Array<{ id: string; name: string }> };
        return HttpResponse.json({ id2etag: { [body.add[0].id]: "group-etag" } });
      })
    );

    const client = await createClient();
    const group = await client.createProjectGroup({ name: "My Folder" });

    expect(group.id).toBeDefined();
    expect(group.id).toMatch(/^[0-9a-f]{24}$/); // MongoDB ObjectId format
    expect(group.name).toBe("My Folder");
    expect(group.etag).toBe("group-etag");
  });

  test("updateProjectGroup sends update array", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/projectGroup`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "group-123": "updated-etag" } });
      })
    );

    const client = await createClient();
    await client.updateProjectGroup({ id: "group-123", name: "Renamed Folder" });

    const body = capturedBody as { update: Array<{ id: string; name: string }> };
    expect(body.update).toHaveLength(1);
    expect(body.update[0].id).toBe("group-123");
    expect(body.update[0].name).toBe("Renamed Folder");
  });

  test("deleteProjectGroups sends delete array with IDs", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/projectGroup`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: {} });
      })
    );

    const client = await createClient();
    await client.deleteProjectGroups(["group-123", "group-456"]);

    const body = capturedBody as { add: unknown[]; update: unknown[]; delete: string[] };
    expect(body.delete).toEqual(["group-123", "group-456"]);
    expect(body.add).toEqual([]);
    expect(body.update).toEqual([]);
  });

  test("getProjectGroups extracts groups from batch response", async () => {
    server.use(
      http.get(`${API_BASE}/batch/check/0`, () => {
        return HttpResponse.json({
          projectGroups: [
            { id: "group-1", name: "Folder A" },
            { id: "group-2", name: "Folder B" },
          ],
          projectProfiles: [],
          tags: [],
          syncTaskBean: { update: [] },
        });
      })
    );

    const client = await createClient();
    const groups = await client.getProjectGroups();

    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe("Folder A");
    expect(groups[1].name).toBe("Folder B");
  });

  // ============================================================
  // Project with Group/Folder Tests
  // ============================================================

  test("createProject with groupId sends groupId in request", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/project`, async ({ request }) => {
        capturedBody = await request.json();
        const body = capturedBody as { add: Array<{ id: string }> };
        return HttpResponse.json({ id2etag: { [body.add[0].id]: "proj-etag" } });
      })
    );

    const client = await createClient();
    await client.createProject({ name: "My Project", groupId: "folder-123" });

    const body = capturedBody as { add: Array<{ name: string; groupId: string }> };
    expect(body.add[0].name).toBe("My Project");
    expect(body.add[0].groupId).toBe("folder-123");
  });

  test("updateProject with groupId updates folder assignment", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/project`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "proj-123": "updated-etag" } });
      })
    );

    const client = await createClient();
    await client.updateProject({ id: "proj-123", groupId: "new-folder-456" });

    const body = capturedBody as { update: Array<{ id: string; groupId: string }> };
    expect(body.update[0].id).toBe("proj-123");
    expect(body.update[0].groupId).toBe("new-folder-456");
  });

  test("updateProject with NONE groupId removes from folder", async () => {
    // The TickTick API uses "NONE" as a magic value to remove a project from a folder
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/project`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "proj-123": "updated-etag" } });
      })
    );

    const client = await createClient();
    await client.updateProject({ id: "proj-123", groupId: "NONE" });

    const body = capturedBody as { update: Array<{ id: string; groupId: string }> };
    expect(body.update[0].id).toBe("proj-123");
    expect(body.update[0].groupId).toBe("NONE");
  });

  // ============================================================
  // Batch Operations Tests
  // ============================================================

  test("completeTasks sends multiple tasks in single request", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-1": "etag1", "task-2": "etag2" } });
      })
    );

    const client = await createClient();
    const result = await client.completeTasks([
      { taskId: "task-1", projectId: "proj-a" },
      { taskId: "task-2", projectId: "proj-b" },
    ]);

    const body = capturedBody as { update: Array<{ id: string; projectId: string; status: number; completedTime: string }> };
    expect(body.update).toHaveLength(2);
    expect(body.update[0].id).toBe("task-1");
    expect(body.update[0].projectId).toBe("proj-a");
    expect(body.update[0].status).toBe(2);
    expect(body.update[0].completedTime).toBeDefined();
    expect(body.update[1].id).toBe("task-2");
    expect(body.update[1].projectId).toBe("proj-b");
    expect(body.update[1].status).toBe(2);

    expect(result.succeeded).toEqual(["task-1", "task-2"]);
    expect(result.failed).toEqual([]);
  });

  test("completeTasks reports partial failures", async () => {
    server.use(
      http.post(`${API_BASE}/batch/task`, () => {
        return HttpResponse.json({
          id2etag: { "task-1": "etag1" },
          id2error: { "task-2": "Task not found" },
        });
      })
    );

    const client = await createClient();
    const result = await client.completeTasks([
      { taskId: "task-1", projectId: "proj-a" },
      { taskId: "task-2", projectId: "proj-b" },
    ]);

    expect(result.succeeded).toEqual(["task-1"]);
    expect(result.failed).toEqual([{ taskId: "task-2", error: "Task not found" }]);
  });

  test("abandonTasks sends multiple tasks with status -1", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-1": "etag1", "task-2": "etag2" } });
      })
    );

    const client = await createClient();
    const result = await client.abandonTasks([
      { taskId: "task-1", projectId: "proj-a" },
      { taskId: "task-2", projectId: "proj-b" },
    ]);

    const body = capturedBody as { update: Array<{ id: string; projectId: string; status: number; completedTime: string }> };
    expect(body.update).toHaveLength(2);
    expect(body.update[0].status).toBe(-1);
    expect(body.update[1].status).toBe(-1);

    expect(result.succeeded).toEqual(["task-1", "task-2"]);
    expect(result.failed).toEqual([]);
  });

  test("reopenTasks sends multiple tasks with status 0", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: { "task-1": "etag1", "task-2": "etag2" } });
      })
    );

    const client = await createClient();
    const result = await client.reopenTasks([
      { taskId: "task-1", projectId: "proj-a" },
      { taskId: "task-2", projectId: "proj-b" },
    ]);

    const body = capturedBody as { update: Array<{ id: string; projectId: string; status: number }> };
    expect(body.update).toHaveLength(2);
    expect(body.update[0].id).toBe("task-1");
    expect(body.update[0].status).toBe(0);
    expect(body.update[1].id).toBe("task-2");
    expect(body.update[1].status).toBe(0);
    // reopenTasks should NOT include completedTime
    expect((body.update[0] as Record<string, unknown>).completedTime).toBeUndefined();

    expect(result.succeeded).toEqual(["task-1", "task-2"]);
    expect(result.failed).toEqual([]);
  });

  test("deleteTasksBatch sends tasks from different projects", async () => {
    let capturedBody: unknown;

    server.use(
      http.post(`${API_BASE}/batch/task`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ id2etag: {} });
      })
    );

    const client = await createClient();
    const result = await client.deleteTasksBatch([
      { taskId: "task-1", projectId: "proj-a" },
      { taskId: "task-2", projectId: "proj-b" },
      { taskId: "task-3", projectId: "proj-a" },
    ]);

    const body = capturedBody as { delete: Array<{ taskId: string; projectId: string }> };
    expect(body.delete).toHaveLength(3);
    expect(body.delete[0]).toEqual({ taskId: "task-1", projectId: "proj-a" });
    expect(body.delete[1]).toEqual({ taskId: "task-2", projectId: "proj-b" });
    expect(body.delete[2]).toEqual({ taskId: "task-3", projectId: "proj-a" });

    expect(result.succeeded).toEqual(["task-1", "task-2", "task-3"]);
    expect(result.failed).toEqual([]);
  });

  test("deleteTasksBatch reports partial failures", async () => {
    server.use(
      http.post(`${API_BASE}/batch/task`, () => {
        return HttpResponse.json({
          id2etag: {},
          id2error: { "task-2": "Permission denied" },
        });
      })
    );

    const client = await createClient();
    const result = await client.deleteTasksBatch([
      { taskId: "task-1", projectId: "proj-a" },
      { taskId: "task-2", projectId: "proj-b" },
    ]);

    expect(result.succeeded).toEqual(["task-1"]);
    expect(result.failed).toEqual([{ taskId: "task-2", error: "Permission denied" }]);
  });
});
