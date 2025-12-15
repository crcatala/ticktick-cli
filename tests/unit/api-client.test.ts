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
});
