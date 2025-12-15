/**
 * Unit tests for task filtering and lookup utilities.
 *
 * Tests the actual implementations from src/commands/task-filters.ts
 * and src/utils/priority.ts
 */
import { describe, it, expect } from "bun:test";
import {
  filterByProject,
  filterByTag,
  filterByPriority,
  findTaskById,
} from "../../../src/commands/task-filters.js";
import { parsePriority, PRIORITY_MAP } from "../../../src/utils/priority.js";
import { createMockTask } from "./helpers.js";

describe("Task Filters", () => {
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

    it("handles empty input array", () => {
      const filtered = filterByProject([], "proj-1");
      expect(filtered).toEqual([]);
    });

    it("handles tasks with undefined projectId", () => {
      const tasks = [
        createMockTask({ id: "1", projectId: undefined }),
        createMockTask({ id: "2", projectId: "proj-1" }),
      ];

      const filtered = filterByProject(tasks, "proj-1");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("2");
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

    it("handles empty input array", () => {
      const filtered = filterByTag([], "work");
      expect(filtered).toEqual([]);
    });

    it("is case-sensitive for tag matching", () => {
      const tasks = [
        createMockTask({ id: "1", tags: ["Work"] }),
        createMockTask({ id: "2", tags: ["work"] }),
      ];

      // Tag matching should be case-sensitive
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
      expect(filterByPriority(tasks, "hIgH")).toHaveLength(1);
    });

    it("returns all tasks for unknown priority", () => {
      const tasks = [
        createMockTask({ id: "1", priority: 5 }),
        createMockTask({ id: "2", priority: 3 }),
      ];

      const filtered = filterByPriority(tasks, "invalid");

      expect(filtered).toHaveLength(2);
    });

    it("handles empty input array", () => {
      const filtered = filterByPriority([], "high");
      expect(filtered).toEqual([]);
    });

    it("handles tasks with undefined priority", () => {
      const tasks = [
        createMockTask({ id: "1", priority: undefined }),
        createMockTask({ id: "2", priority: 0 }),
      ];

      const filtered = filterByPriority(tasks, "none");

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("2");
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

    it("returns empty when filters eliminate all tasks", () => {
      const tasks = [
        createMockTask({ id: "1", projectId: "proj-1", tags: ["work"] }),
        createMockTask({ id: "2", projectId: "proj-2", tags: ["urgent"] }),
      ];

      let filtered = filterByProject(tasks, "proj-1");
      filtered = filterByTag(filtered, "urgent");

      expect(filtered).toHaveLength(0);
    });
  });
});

describe("Priority Utilities", () => {
  describe("PRIORITY_MAP", () => {
    it("contains expected priority values", () => {
      expect(PRIORITY_MAP.high).toBe(5);
      expect(PRIORITY_MAP.medium).toBe(3);
      expect(PRIORITY_MAP.low).toBe(1);
      expect(PRIORITY_MAP.none).toBe(0);
    });

    it("has exactly 4 priority levels", () => {
      expect(Object.keys(PRIORITY_MAP)).toHaveLength(4);
    });
  });

  describe("parsePriority", () => {
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
      expect(parsePriority("NONE")).toBe(0);
    });

    it("returns 0 for unknown priority", () => {
      expect(parsePriority("invalid")).toBe(0);
      expect(parsePriority("")).toBe(0);
      expect(parsePriority("critical")).toBe(0);
    });
  });
});

describe("Task ID Lookup", () => {
  describe("findTaskById", () => {
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

    it("handles empty array", () => {
      const found = findTaskById([], "task-123");
      expect(found).toBeUndefined();
    });

    it("handles tasks with undefined id", () => {
      const tasks = [
        createMockTask({ id: undefined, title: "No ID" }),
        createMockTask({ id: "task-123", title: "Has ID" }),
      ];

      const found = findTaskById(tasks, "task-123");
      expect(found?.title).toBe("Has ID");
    });

    it("returns first match when multiple tasks have same prefix", () => {
      const tasks = [
        createMockTask({ id: "task-a-111", title: "First" }),
        createMockTask({ id: "task-a-222", title: "Second" }),
      ];

      const found = findTaskById(tasks, "task-a");

      // Should return the first match
      expect(found?.title).toBe("First");
    });
  });
});
