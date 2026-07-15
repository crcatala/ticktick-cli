import { describe, expect, it } from "bun:test";
import { prepareTaskKindConversion } from "../types.js";
import type { Task } from "../types.js";

describe("prepareTaskKindConversion", () => {
  const task: Task = {
    id: "task-1",
    projectId: "project-1",
    title: "Research notes",
    content: "Keep this",
    kind: "TEXT",
    priority: 5,
    progress: 40,
    dueDate: "2026-07-20T04:00:00.000+0000",
    startDate: "2026-07-10T04:00:00.000+0000",
    isAllDay: true,
    tags: ["work"],
    reminders: [{ id: "reminder-1", trigger: "TRIGGER:PT0S" }],
    repeatFlag: "RRULE:FREQ=DAILY",
    items: [{ id: "item-1", title: "Child", status: 0, sortOrder: 0 }],
    sortOrder: -100,
    timeZone: "America/Detroit",
  };

  it("normalizes task-only metadata when converting to a note", () => {
    const converted = prepareTaskKindConversion(task, "NOTE");

    expect(converted).toMatchObject({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      content: task.content,
      kind: "NOTE",
      startDate: task.startDate,
      isAllDay: true,
      sortOrder: task.sortOrder,
      timeZone: task.timeZone,
      items: [],
      reminders: [],
      priority: 0,
      progress: 0,
      tags: [],
      dueDate: null,
      repeatFlag: null,
      repeatFrom: null,
      assignee: null,
    });
  });

  it("applies the same normalization when converting back to a task", () => {
    const converted = prepareTaskKindConversion({ ...task, kind: "NOTE" }, "TEXT");

    expect(converted.kind).toBe("TEXT");
    expect(converted.content).toBe(task.content);
    expect(converted.startDate).toBe(task.startDate);
    expect(converted.items).toEqual([]);
    expect(converted.tags).toEqual([]);
  });
});
