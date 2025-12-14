import { describe, expect, mock, test, beforeEach } from "bun:test";
import { server, http, HttpResponse } from "../setup/msw.js";

const API_BASE = "https://api.ticktick.com/api/v2";

const createClient = async () => {
  const { TickTickClient } = await import("../../src/api/client.js");
  return new TickTickClient("user", "token", true);
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
    expect(elapsed).toBeGreaterThanOrEqual(1000);
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

  test("createTask throws ClientError when id2error present", async () => {
    server.use(
      http.post(`${API_BASE}/batch/task`, () =>
        HttpResponse.json({ id2error: { foo: "bad" } }, { status: 200 })
      )
    );

    const client = await createClient();
    await expect(client.createTask({ title: "oops" })).rejects.toThrow("Failed to create task");
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
