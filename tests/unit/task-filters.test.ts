/**
 * Tests for task filtering utilities.
 */
import { describe, it, expect } from "bun:test";
import {
  filterByProject,
  filterByTag,
  filterByPriority,
  filterBySearch,
  findTaskById,
  resolveProjectId,
} from "../../src/commands/task-filters.js";
import type { Task, Project } from "../../src/api/types.js";

// Helper to create mock tasks
function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task123",
    title: "Test Task",
    content: null,
    desc: null,
    projectId: "project123",
    priority: 0,
    status: 0,
    tags: [],
    items: [],
    ...overrides,
  };
}

// Helper to create mock projects
function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project123",
    name: "Test Project",
    ...overrides,
  };
}

describe("filterBySearch", () => {
  it("matches text in title (case-insensitive)", () => {
    const tasks = [
      createTask({ id: "1", title: "Buy groceries" }),
      createTask({ id: "2", title: "Call mom" }),
      createTask({ id: "3", title: "Review GROCERIES list" }),
    ];

    const results = filterBySearch(tasks, "groceries");

    expect(results).toHaveLength(2);
    expect(results.map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("matches text in content", () => {
    const tasks = [
      createTask({ id: "1", title: "Meeting", content: "Discuss budget" }),
      createTask({ id: "2", title: "Meeting", content: "Discuss roadmap" }),
    ];

    const results = filterBySearch(tasks, "budget");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("matches text in description (desc field)", () => {
    const tasks = [
      createTask({ id: "1", title: "Task", desc: "Important deadline approaching" }),
      createTask({ id: "2", title: "Task", desc: "Low priority" }),
    ];

    const results = filterBySearch(tasks, "deadline");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("matches text in checklist items", () => {
    const tasks = [
      createTask({
        id: "1",
        title: "Shopping",
        items: [
          { id: "item1", title: "Buy milk", status: 0 },
          { id: "item2", title: "Buy bread", status: 0 },
        ],
      }),
      createTask({
        id: "2",
        title: "Errands",
        items: [{ id: "item3", title: "Pick up package", status: 0 }],
      }),
    ];

    const results = filterBySearch(tasks, "milk");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("does NOT match tags", () => {
    const tasks = [
      createTask({ id: "1", title: "Task", tags: ["urgent", "work"] }),
    ];

    const results = filterBySearch(tasks, "urgent");

    expect(results).toHaveLength(0);
  });

  it("supports case-sensitive search", () => {
    const tasks = [
      createTask({ id: "1", title: "URGENT task" }),
      createTask({ id: "2", title: "Urgent meeting" }),
      createTask({ id: "3", title: "urgent email" }),
    ];

    const results = filterBySearch(tasks, "URGENT", true);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
  });

  it("handles null/undefined fields gracefully", () => {
    const tasks = [
      createTask({ id: "1", title: null, content: null, desc: null, items: null }),
      createTask({ id: "2", title: "Has title", content: undefined }),
    ];

    const results = filterBySearch(tasks, "title");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2");
  });

  it("handles empty items array", () => {
    const tasks = [createTask({ id: "1", title: "Test", items: [] })];

    const results = filterBySearch(tasks, "test");

    expect(results).toHaveLength(1);
  });

  it("returns empty array when no matches", () => {
    const tasks = [
      createTask({ id: "1", title: "Buy groceries" }),
      createTask({ id: "2", title: "Call mom" }),
    ];

    const results = filterBySearch(tasks, "nonexistent");

    expect(results).toHaveLength(0);
  });

  it("matches across multiple fields", () => {
    const tasks = [
      createTask({
        id: "1",
        title: "Project planning",
        content: "Review timeline",
        desc: "Q1 goals",
        items: [{ id: "i1", title: "Create roadmap", status: 0 }],
      }),
    ];

    // Should match in title
    expect(filterBySearch(tasks, "planning")).toHaveLength(1);
    // Should match in content
    expect(filterBySearch(tasks, "timeline")).toHaveLength(1);
    // Should match in desc
    expect(filterBySearch(tasks, "goals")).toHaveLength(1);
    // Should match in items
    expect(filterBySearch(tasks, "roadmap")).toHaveLength(1);
  });

  it("returns all tasks for empty search query (no filtering)", () => {
    const tasks = [
      createTask({ id: "1", title: "Task one" }),
      createTask({ id: "2", title: "Task two" }),
    ];

    // Empty query means "no search filter" - returns all tasks
    expect(filterBySearch(tasks, "")).toHaveLength(2);
    expect(filterBySearch(tasks, "   ")).toHaveLength(2);
    expect(filterBySearch(tasks, "\t\n")).toHaveLength(2);
  });

  it("handles special regex characters in search", () => {
    const tasks = [
      createTask({ id: "1", title: "Task (important)" }),
      createTask({ id: "2", title: "Task [urgent]" }),
      createTask({ id: "3", title: "Price: $100" }),
    ];

    // These characters could break if we used regex
    expect(filterBySearch(tasks, "(important)")).toHaveLength(1);
    expect(filterBySearch(tasks, "[urgent]")).toHaveLength(1);
    expect(filterBySearch(tasks, "$100")).toHaveLength(1);
  });

  it("matches partial words", () => {
    const tasks = [
      createTask({ id: "1", title: "Development meeting" }),
      createTask({ id: "2", title: "Developer resources" }),
    ];

    const results = filterBySearch(tasks, "develop");

    expect(results).toHaveLength(2);
  });

  it("handles checklist items with null titles", () => {
    const tasks = [
      createTask({
        id: "1",
        title: "Task",
        items: [
          { id: "item1", title: null, status: 0 },
          { id: "item2", title: "Valid item", status: 0 },
        ],
      }),
    ];

    const results = filterBySearch(tasks, "Valid");

    expect(results).toHaveLength(1);
  });
});

describe("resolveProjectId", () => {
  const projects: Project[] = [
    createProject({ id: "abc123def456", name: "Work" }),
    createProject({ id: "xyz789uvw012", name: "Personal" }),
    createProject({ id: "inbox000001", name: "Inbox" }),
  ];

  it("resolves exact ID match", () => {
    const result = resolveProjectId(projects, "abc123def456");

    expect(result).toBe("abc123def456");
  });

  it("resolves ID prefix match", () => {
    const result = resolveProjectId(projects, "abc123");

    expect(result).toBe("abc123def456");
  });

  it("resolves project name (case-insensitive)", () => {
    expect(resolveProjectId(projects, "Work")).toBe("abc123def456");
    expect(resolveProjectId(projects, "work")).toBe("abc123def456");
    expect(resolveProjectId(projects, "WORK")).toBe("abc123def456");
  });

  it("returns undefined for non-existent project", () => {
    const result = resolveProjectId(projects, "nonexistent");

    expect(result).toBeUndefined();
  });

  it("prefers exact ID over prefix match", () => {
    const projectsWithSimilarIds: Project[] = [
      createProject({ id: "abc", name: "Short" }),
      createProject({ id: "abcdef", name: "Long" }),
    ];

    const result = resolveProjectId(projectsWithSimilarIds, "abc");

    expect(result).toBe("abc");
  });

  it("prefers ID match over name match", () => {
    const projectsWithMatchingName: Project[] = [
      createProject({ id: "work123", name: "Other" }),
      createProject({ id: "other456", name: "work123" }),
    ];

    const result = resolveProjectId(projectsWithMatchingName, "work123");

    expect(result).toBe("work123"); // Returns the one with matching ID
  });

  it("handles empty projects array", () => {
    const result = resolveProjectId([], "anything");

    expect(result).toBeUndefined();
  });

  it("handles projects with null names", () => {
    const projectsWithNullName: Project[] = [
      createProject({ id: "proj1", name: null }),
      createProject({ id: "proj2", name: "Valid" }),
    ];

    expect(resolveProjectId(projectsWithNullName, "Valid")).toBe("proj2");
    expect(resolveProjectId(projectsWithNullName, "proj1")).toBe("proj1");
  });

  it("does not match partial project names", () => {
    // Name matching should be exact (case-insensitive), not substring
    const result = resolveProjectId(projects, "Work Projects");

    expect(result).toBeUndefined();
  });
});

describe("filterByProject", () => {
  it("filters tasks by project ID", () => {
    const tasks = [
      createTask({ id: "1", projectId: "proj-a" }),
      createTask({ id: "2", projectId: "proj-b" }),
      createTask({ id: "3", projectId: "proj-a" }),
    ];

    const results = filterByProject(tasks, "proj-a");

    expect(results).toHaveLength(2);
    expect(results.map((t) => t.id)).toEqual(["1", "3"]);
  });
});

describe("filterByTag", () => {
  it("filters tasks by tag name", () => {
    const tasks = [
      createTask({ id: "1", tags: ["work", "urgent"] }),
      createTask({ id: "2", tags: ["personal"] }),
      createTask({ id: "3", tags: ["work"] }),
    ];

    const results = filterByTag(tasks, "work");

    expect(results).toHaveLength(2);
    expect(results.map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("handles tasks without tags", () => {
    const tasks = [
      createTask({ id: "1", tags: undefined }),
      createTask({ id: "2", tags: ["work"] }),
    ];

    const results = filterByTag(tasks, "work");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2");
  });
});

describe("filterByPriority", () => {
  it("filters tasks by priority name", () => {
    const tasks = [
      createTask({ id: "1", priority: 5 }), // high
      createTask({ id: "2", priority: 3 }), // medium
      createTask({ id: "3", priority: 5 }), // high
      createTask({ id: "4", priority: 0 }), // none
    ];

    const results = filterByPriority(tasks, "high");

    expect(results).toHaveLength(2);
    expect(results.map((t) => t.id)).toEqual(["1", "3"]);
  });

  it("returns all tasks for unknown priority", () => {
    const tasks = [
      createTask({ id: "1", priority: 5 }),
      createTask({ id: "2", priority: 3 }),
    ];

    const results = filterByPriority(tasks, "unknown");

    expect(results).toHaveLength(2);
  });
});

describe("findTaskById", () => {
  const tasks = [
    createTask({ id: "abc123def456" }),
    createTask({ id: "xyz789uvw012" }),
  ];

  it("finds task by exact ID", () => {
    const result = findTaskById(tasks, "abc123def456");

    expect(result?.id).toBe("abc123def456");
  });

  it("finds task by ID prefix", () => {
    const result = findTaskById(tasks, "abc123");

    expect(result?.id).toBe("abc123def456");
  });

  it("returns undefined when not found", () => {
    const result = findTaskById(tasks, "nonexistent");

    expect(result).toBeUndefined();
  });
});
