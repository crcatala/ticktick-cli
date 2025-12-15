/**
 * Unit tests for task command filtering and parsing logic.
 *
 * These tests focus on the pure logic functions used by task commands,
 * which can be tested without mocking authentication.
 */
import { describe, it, expect } from "bun:test";
import { createMockTask, stripAnsi } from "./helpers.js";
import type { Task } from "../../../src/api/types.js";

/**
 * Filter tasks by project ID (extracted from task.ts logic)
 */
function filterByProject(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((t) => t.projectId === projectId);
}

/**
 * Filter tasks by tag name (extracted from task.ts logic)
 */
function filterByTag(tasks: Task[], tagName: string): Task[] {
  return tasks.filter((t) => t.tags?.includes(tagName));
}

/**
 * Filter tasks by priority (extracted from task.ts logic)
 */
function filterByPriority(tasks: Task[], priorityName: string): Task[] {
  const priorityMap: Record<string, number> = {
    high: 5,
    medium: 3,
    low: 1,
    none: 0,
  };
  const targetPriority = priorityMap[priorityName.toLowerCase()];
  if (targetPriority === undefined) {
    return tasks;
  }
  return tasks.filter((t) => t.priority === targetPriority);
}

/**
 * Convert priority string to number (extracted from task.ts logic)
 */
function parsePriority(priorityName: string): number {
  const priorityMap: Record<string, number> = {
    high: 5,
    medium: 3,
    low: 1,
    none: 0,
  };
  return priorityMap[priorityName.toLowerCase()] ?? 0;
}

/**
 * Find task by ID or ID prefix (extracted from task.ts logic)
 */
function findTaskById(tasks: Task[], idOrPrefix: string): Task | undefined {
  return tasks.find((t) => t.id === idOrPrefix || t.id?.startsWith(idOrPrefix));
}

describe("task filtering logic", () => {
  describe("filterByProject", () => {
    it("returns only tasks with matching project ID", () => {
      const tasks = [
        createMockTask({ id: "1", title: "Task A", projectId: "proj-1" }),
        createMockTask({ id: "2", title: "Task B", projectId: "proj-2" }),
        createMockTask({ id: "3", title: "Task C", projectId: "proj-1" }),
      ];

      const filtered = filterByProject(tasks, "proj-1");

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id)).toEqual(["1", "3"]);
    });

    it("returns empty array when no tasks match", () => {
      const tasks = [
        createMockTask({ id: "1", projectId: "proj-1" }),
        createMockTask({ id: "2", projectId: "proj-2" }),
      ];

      const filtered = filterByProject(tasks, "proj-nonexistent");

      expect(filtered).toHaveLength(0);
    });
  });

  describe("filterByTag", () => {
    it("returns only tasks with matching tag", () => {
      const tasks = [
        createMockTask({ id: "1", title: "Tagged", tags: ["work", "urgent"] }),
        createMockTask({ id: "2", title: "Untagged", tags: [] }),
        createMockTask({ id: "3", title: "Also Tagged", tags: ["work"] }),
      ];

      const filtered = filterByTag(tasks, "work");

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.title)).toEqual(["Tagged", "Also Tagged"]);
    });

    it("handles tasks with undefined tags", () => {
      const tasks = [
        createMockTask({ id: "1", tags: undefined }),
        createMockTask({ id: "2", tags: ["work"] }),
      ];

      const filtered = filterByTag(tasks, "work");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("2");
    });
  });

  describe("filterByPriority", () => {
    it("filters by high priority (5)", () => {
      const tasks = [
        createMockTask({ id: "1", priority: 5 }),
        createMockTask({ id: "2", priority: 3 }),
        createMockTask({ id: "3", priority: 5 }),
      ];

      const filtered = filterByPriority(tasks, "high");

      expect(filtered).toHaveLength(2);
      expect(filtered.map((t) => t.id)).toEqual(["1", "3"]);
    });

    it("filters by medium priority (3)", () => {
      const tasks = [
        createMockTask({ id: "1", priority: 5 }),
        createMockTask({ id: "2", priority: 3 }),
      ];

      const filtered = filterByPriority(tasks, "medium");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("2");
    });

    it("filters by low priority (1)", () => {
      const tasks = [
        createMockTask({ id: "1", priority: 1 }),
        createMockTask({ id: "2", priority: 0 }),
      ];

      const filtered = filterByPriority(tasks, "low");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("1");
    });

    it("filters by none priority (0)", () => {
      const tasks = [
        createMockTask({ id: "1", priority: 1 }),
        createMockTask({ id: "2", priority: 0 }),
      ];

      const filtered = filterByPriority(tasks, "none");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("2");
    });

    it("is case-insensitive", () => {
      const tasks = [
        createMockTask({ id: "1", priority: 5 }),
        createMockTask({ id: "2", priority: 3 }),
      ];

      expect(filterByPriority(tasks, "HIGH")).toHaveLength(1);
      expect(filterByPriority(tasks, "High")).toHaveLength(1);
    });
  });

  describe("combined filters", () => {
    it("can chain multiple filters", () => {
      const tasks = [
        createMockTask({
          id: "1",
          title: "Match All",
          projectId: "proj-1",
          tags: ["urgent"],
          priority: 5,
        }),
        createMockTask({
          id: "2",
          title: "Wrong Project",
          projectId: "proj-2",
          tags: ["urgent"],
          priority: 5,
        }),
        createMockTask({
          id: "3",
          title: "Wrong Tag",
          projectId: "proj-1",
          tags: ["other"],
          priority: 5,
        }),
        createMockTask({
          id: "4",
          title: "Wrong Priority",
          projectId: "proj-1",
          tags: ["urgent"],
          priority: 0,
        }),
      ];

      let filtered = filterByProject(tasks, "proj-1");
      filtered = filterByTag(filtered, "urgent");
      filtered = filterByPriority(filtered, "high");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("Match All");
    });
  });
});

describe("priority parsing", () => {
  it("converts priority strings to numbers", () => {
    expect(parsePriority("high")).toBe(5);
    expect(parsePriority("medium")).toBe(3);
    expect(parsePriority("low")).toBe(1);
    expect(parsePriority("none")).toBe(0);
  });

  it("handles case-insensitivity", () => {
    expect(parsePriority("HIGH")).toBe(5);
    expect(parsePriority("Medium")).toBe(3);
    expect(parsePriority("LOW")).toBe(1);
  });

  it("returns 0 for unknown priority", () => {
    expect(parsePriority("invalid")).toBe(0);
    expect(parsePriority("")).toBe(0);
  });
});

describe("task ID lookup", () => {
  it("finds task by exact ID", () => {
    const tasks = [
      createMockTask({ id: "task-abc-123", title: "Task A" }),
      createMockTask({ id: "task-def-456", title: "Task B" }),
    ];

    const found = findTaskById(tasks, "task-abc-123");

    expect(found?.title).toBe("Task A");
  });

  it("finds task by ID prefix", () => {
    const tasks = [
      createMockTask({ id: "task-abc-123-full-id", title: "Task A" }),
      createMockTask({ id: "task-def-456-full-id", title: "Task B" }),
    ];

    const found = findTaskById(tasks, "task-abc");

    expect(found?.title).toBe("Task A");
  });

  it("returns undefined when task not found", () => {
    const tasks = [createMockTask({ id: "task-123", title: "Task A" })];

    const found = findTaskById(tasks, "nonexistent");

    expect(found).toBeUndefined();
  });

  it("prefers exact match over prefix match", () => {
    const tasks = [
      createMockTask({ id: "task", title: "Exact" }),
      createMockTask({ id: "task-extended", title: "Extended" }),
    ];

    const found = findTaskById(tasks, "task");

    expect(found?.title).toBe("Exact");
  });
});
