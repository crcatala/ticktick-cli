/**
 * Unit tests for the createThrottledClient helper.
 */
import { describe, expect, it, mock } from "bun:test";
import { createThrottledClient, DEFAULT_API_DELAY } from "../helpers/live-test.js";
import type { TickTickClient } from "../../src/api/client.js";

// Create a mock client for testing
function createMockClient(): TickTickClient {
  return {
    getTasks: mock(() => Promise.resolve([])),
    getProjects: mock(() => Promise.resolve([])),
    createTask: mock(() => Promise.resolve({ id: "task-1", title: "Test" })),
    someProperty: "value",
  } as unknown as TickTickClient;
}

describe("createThrottledClient", () => {
  it("adds delay after async method calls", async () => {
    const mockClient = createMockClient();
    const delayMs = 100;
    const throttled = createThrottledClient(mockClient, delayMs);

    const start = performance.now();
    await throttled.getTasks();
    const elapsed = performance.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(delayMs - 10); // Allow small timing variance
    expect(mockClient.getTasks).toHaveBeenCalledTimes(1);
  });

  it("preserves return values from methods", async () => {
    const mockClient = createMockClient();
    const throttled = createThrottledClient(mockClient, 10);

    const result = await throttled.createTask({ title: "Test" });

    expect(result).toEqual({ id: "task-1", title: "Test" });
  });

  it("passes arguments through to original method", async () => {
    const mockClient = createMockClient();
    const throttled = createThrottledClient(mockClient, 10);

    await throttled.createTask({ title: "My Task", projectId: "proj-1" });

    expect(mockClient.createTask).toHaveBeenCalledWith({
      title: "My Task",
      projectId: "proj-1",
    });
  });

  it("uses DEFAULT_API_DELAY when no delay specified", async () => {
    const mockClient = createMockClient();
    const throttled = createThrottledClient(mockClient);

    const start = performance.now();
    await throttled.getTasks();
    const elapsed = performance.now() - start;

    // Should use default delay (500ms typically)
    expect(elapsed).toBeGreaterThanOrEqual(DEFAULT_API_DELAY - 50);
  });

  it("does not affect non-function properties", () => {
    const mockClient = createMockClient();
    const throttled = createThrottledClient(mockClient, 10);

    // Access a non-function property - should return it directly
    expect((throttled as unknown as { someProperty: string }).someProperty).toBe("value");
  });

  it("accumulates delays across multiple calls", async () => {
    const mockClient = createMockClient();
    const delayMs = 50;
    const throttled = createThrottledClient(mockClient, delayMs);

    const start = performance.now();
    await throttled.getTasks();
    await throttled.getProjects();
    await throttled.getTasks();
    const elapsed = performance.now() - start;

    // Should have ~150ms of delays (3 calls * 50ms each)
    expect(elapsed).toBeGreaterThanOrEqual(delayMs * 3 - 30);
  });
});
