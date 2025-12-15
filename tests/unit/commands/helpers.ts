/**
 * Test helpers for command unit tests.
 *
 * Provides utilities for creating mock data and testing command logic.
 */
import type { Task, Project, Tag } from "../../../src/api/types.js";

// Re-export shared test utilities
export { stripAnsi } from "../../utils/test-helpers.js";

/**
 * Create a mock task for testing.
 */
export function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-123",
    title: "Test Task",
    content: "Task content",
    projectId: "project-456",
    priority: 0,
    status: 0,
    tags: [],
    createdTime: "2025-01-01T00:00:00.000+0000",
    modifiedTime: "2025-01-01T00:00:00.000+0000",
    ...overrides,
  };
}

/**
 * Create a mock project for testing.
 */
export function createMockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-123",
    name: "Test Project",
    color: "#000000",
    sortOrder: 0,
    ...overrides,
  };
}

/**
 * Create a mock tag for testing.
 */
export function createMockTag(overrides: Partial<Tag> = {}): Tag {
  return {
    name: "test-tag",
    color: "#ff0000",
    sortOrder: 0,
    ...overrides,
  };
}

