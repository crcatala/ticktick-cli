/**
 * Test helpers for command unit tests.
 *
 * Provides utilities for creating mock data and testing command logic.
 */
import type { Task, Project, Tag } from "../../../src/api/types.js";

/**
 * Strip ANSI escape codes from a string.
 */
export const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

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

/**
 * Output capture helper for testing print functions.
 */
export interface OutputCapture {
  logs: string[];
  errors: string[];
  restore: () => void;
}

/**
 * Capture console.log and console.error output.
 */
export function captureOutput(): OutputCapture {
  const logs: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };

  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };

  return {
    logs,
    errors,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
    },
  };
}
