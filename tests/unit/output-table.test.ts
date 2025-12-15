import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { stripAnsi } from "../utils/test-helpers.js";
import type { Project, ProjectGroup } from "../../src/api/types.js";

// We need to capture console output for table tests
let consoleSpy: ReturnType<typeof mock>;
let originalLog: typeof console.log;

beforeEach(() => {
  originalLog = console.log;
  consoleSpy = mock(() => {});
  console.log = consoleSpy;
});

afterEach(() => {
  console.log = originalLog;
});

const getOutput = (): string[] => {
  return consoleSpy.mock.calls.map((args: unknown[]) => stripAnsi(String(args[0])));
};

describe("printProjectsTable", () => {
  test("displays folder column with folder names when groups provided", async () => {
    const { printProjectsTable } = await import("../../src/output/table.js");

    const projects: Project[] = [
      { id: "proj-1", name: "Project A", kind: "TASK", color: "#FF0000", groupId: "group-1" },
      { id: "proj-2", name: "Project B", kind: "TASK", color: "#00FF00", groupId: "group-2" },
    ];
    const groups: ProjectGroup[] = [
      { id: "group-1", name: "Work Folder" },
      { id: "group-2", name: "Personal Folder" },
    ];

    printProjectsTable(projects, groups);

    const output = getOutput();
    expect(output.some(line => line.includes("Folder"))).toBeTrue(); // Header
    expect(output.some(line => line.includes("Work Folder"))).toBeTrue();
    expect(output.some(line => line.includes("Personal Folder"))).toBeTrue();
  });

  test("shows truncated ID when group not found", async () => {
    const { printProjectsTable } = await import("../../src/output/table.js");

    const projects: Project[] = [
      { id: "proj-1", name: "Project A", kind: "TASK", groupId: "unknown-group-id-12345" },
    ];
    const groups: ProjectGroup[] = []; // Empty groups

    printProjectsTable(projects, groups);

    const output = getOutput();
    // Should show truncated ID since group not found
    expect(output.some(line => line.includes("unknown-"))).toBeTrue();
  });

  test("shows dash for projects without folder", async () => {
    const { printProjectsTable } = await import("../../src/output/table.js");

    const projects: Project[] = [
      { id: "proj-1", name: "Project A", kind: "TASK" }, // No groupId
    ];

    printProjectsTable(projects);

    const output = getOutput();
    // The folder column should show "-"
    const dataRow = output.find(line => line.includes("Project A"));
    expect(dataRow).toBeDefined();
  });

  test("works without groups parameter", async () => {
    const { printProjectsTable } = await import("../../src/output/table.js");

    const projects: Project[] = [
      { id: "proj-1", name: "Project A", kind: "TASK", groupId: "group-1" },
    ];

    // Should not throw when groups not provided
    expect(() => printProjectsTable(projects)).not.toThrow();
  });
});

describe("printProjectsByFolder", () => {
  test("groups projects by folder with headers", async () => {
    const { printProjectsByFolder } = await import("../../src/output/table.js");

    const projects: Project[] = [
      { id: "proj-1", name: "Project A", kind: "TASK", groupId: "group-1" },
      { id: "proj-2", name: "Project B", kind: "TASK", groupId: "group-1" },
      { id: "proj-3", name: "Project C", kind: "TASK", groupId: "group-2" },
    ];
    const groups: ProjectGroup[] = [
      { id: "group-1", name: "Work" },
      { id: "group-2", name: "Personal" },
    ];

    printProjectsByFolder(projects, groups);

    const output = getOutput();
    // Should have folder headers
    expect(output.some(line => line.includes("📁 Work"))).toBeTrue();
    expect(output.some(line => line.includes("📁 Personal"))).toBeTrue();
  });

  test("shows (No Folder) section for ungrouped projects", async () => {
    const { printProjectsByFolder } = await import("../../src/output/table.js");

    const projects: Project[] = [
      { id: "proj-1", name: "Grouped Project", kind: "TASK", groupId: "group-1" },
      { id: "proj-2", name: "Ungrouped Project", kind: "TASK" }, // No groupId
    ];
    const groups: ProjectGroup[] = [
      { id: "group-1", name: "Work" },
    ];

    printProjectsByFolder(projects, groups);

    const output = getOutput();
    expect(output.some(line => line.includes("(No Folder)"))).toBeTrue();
  });

  test("sorts folders alphabetically with No Folder last", async () => {
    const { printProjectsByFolder } = await import("../../src/output/table.js");

    const projects: Project[] = [
      { id: "proj-1", name: "P1", kind: "TASK", groupId: "group-z" },
      { id: "proj-2", name: "P2", kind: "TASK", groupId: "group-a" },
      { id: "proj-3", name: "P3", kind: "TASK" }, // No folder
    ];
    const groups: ProjectGroup[] = [
      { id: "group-z", name: "Zebra" },
      { id: "group-a", name: "Alpha" },
    ];

    printProjectsByFolder(projects, groups);

    const output = getOutput();
    const alphaIndex = output.findIndex(line => line.includes("📁 Alpha"));
    const zebraIndex = output.findIndex(line => line.includes("📁 Zebra"));
    const noFolderIndex = output.findIndex(line => line.includes("(No Folder)"));

    expect(alphaIndex).toBeLessThan(zebraIndex);
    expect(zebraIndex).toBeLessThan(noFolderIndex);
  });
});

describe("printProjectsTableSimple", () => {
  test("does not include folder column", async () => {
    const { printProjectsTableSimple } = await import("../../src/output/table.js");

    const projects: Project[] = [
      { id: "proj-1", name: "Project A", kind: "TASK", groupId: "group-1" },
    ];

    printProjectsTableSimple(projects);

    const output = getOutput();
    // Header should not contain "Folder"
    expect(output[0]).not.toContain("Folder");
    // Should have ID, Name, Kind, Color
    expect(output[0]).toContain("ID");
    expect(output[0]).toContain("Name");
    expect(output[0]).toContain("Kind");
    expect(output[0]).toContain("Color");
  });
});
