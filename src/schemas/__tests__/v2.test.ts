/**
 * Tests for Zod schemas - validates schema definitions work with known-good data.
 */
import { describe, it, expect } from "bun:test";
import {
  TaskSchema,
  ProjectSchema,
  ProjectGroupSchema,
  TagSchema,
  UserProfileSchema,
  UserStatusSchema,
  UserStatsSchema,
  BatchResponseSchema,
  BatchOperationResponseSchema,
  LoginResponseSchema,
  ChecklistItemSchema,
  ReminderSchema,
} from "../v2.js";

describe("TaskSchema", () => {
  it("parses a minimal task", () => {
    const task = { id: "task-123" };
    const result = TaskSchema.safeParse(task);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("task-123");
    }
  });

  it("parses a full task with all fields", () => {
    const task = {
      id: "task-123",
      title: "Test Task",
      content: "Task description",
      desc: "Additional description",
      projectId: "project-456",
      priority: 5,
      status: 0,
      dueDate: "2025-12-25T00:00:00.000+0000",
      startDate: "2025-12-20T00:00:00.000+0000",
      timeZone: "America/Los_Angeles",
      isAllDay: true,
      reminder: "TRIGGER:-PT15M",
      reminders: [{ id: "rem-1", trigger: "TRIGGER:-PT15M" }],
      repeatFlag: "RRULE:FREQ=DAILY",
      sortOrder: 100,
      items: [
        { id: "item-1", title: "Subtask", status: 0, sortOrder: 0 },
      ],
      tags: ["work", "urgent"],
      parentId: "parent-task",
      childIds: ["child-1", "child-2"],
      progress: 50,
      createdTime: "2025-12-01T00:00:00.000+0000",
      modifiedTime: "2025-12-14T00:00:00.000+0000",
      etag: "abc123",
      kind: "TEXT",
    };

    const result = TaskSchema.safeParse(task);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Test Task");
      expect(result.data.priority).toBe(5);
      expect(result.data.tags).toEqual(["work", "urgent"]);
      expect(result.data.items?.[0]?.title).toBe("Subtask");
    }
  });

  it("allows unknown fields with passthrough", () => {
    const task = {
      id: "task-123",
      unknownField: "should be preserved",
      anotherUnknown: 42,
    };

    const result = TaskSchema.safeParse(task);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).unknownField).toBe("should be preserved");
      expect((result.data as any).anotherUnknown).toBe(42);
    }
  });

  it("fails without required id field", () => {
    const task = { title: "No ID" };
    const result = TaskSchema.safeParse(task);
    expect(result.success).toBe(false);
  });
});

describe("ProjectSchema", () => {
  it("parses a minimal project", () => {
    const project = { id: "proj-123" };
    const result = ProjectSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it("parses a full project", () => {
    const project = {
      id: "proj-123",
      name: "Work",
      color: "#FF0000",
      sortOrder: 100,
      kind: "TASK",
      viewMode: "list",
      permission: "write",
      groupId: "group-1",
      closed: false,
      etag: "xyz789",
      modifiedTime: "2025-12-14T00:00:00.000+0000",
    };

    const result = ProjectSchema.safeParse(project);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Work");
      expect(result.data.color).toBe("#FF0000");
    }
  });
});

describe("ProjectGroupSchema", () => {
  it("parses a project group", () => {
    const group = {
      id: "group-123",
      name: "Personal Projects",
      sortOrder: 50,
      etag: "etag123",
    };

    const result = ProjectGroupSchema.safeParse(group);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Personal Projects");
    }
  });
});

describe("TagSchema", () => {
  it("parses a minimal tag", () => {
    const tag = { name: "urgent" };
    const result = TagSchema.safeParse(tag);
    expect(result.success).toBe(true);
  });

  it("parses a full tag", () => {
    const tag = {
      name: "work",
      label: "Work",
      color: "#0000FF",
      sortOrder: 10,
      sortType: "title",
      parent: "projects",
      etag: "tag-etag",
    };

    const result = TagSchema.safeParse(tag);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe("#0000FF");
      expect(result.data.parent).toBe("projects");
    }
  });

  it("fails without required name field", () => {
    const tag = { color: "#FF0000" };
    const result = TagSchema.safeParse(tag);
    expect(result.success).toBe(false);
  });
});

describe("UserProfileSchema", () => {
  it("parses a user profile", () => {
    const profile = {
      id: "user-123",
      extenalId: "ext-456", // Note: typo in TickTick API
      username: "testuser",
      name: "Test User",
      email: "test@example.com",
      avatar: "https://example.com/avatar.png",
      phone: "+1234567890",
      timeZone: "America/Los_Angeles",
      pro: true,
      freeTrial: false,
      createdTime: "2020-01-01T00:00:00.000+0000",
    };

    const result = UserProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe("testuser");
      expect(result.data.pro).toBe(true);
    }
  });

  it("allows empty profile (all optional)", () => {
    const profile = {};
    const result = UserProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
  });
});

describe("UserStatusSchema", () => {
  it("parses user status", () => {
    const status = {
      userId: "user-123",
      pro: true,
      proExpire: "2026-01-01T00:00:00.000+0000",
      freeTrial: false,
      lastCheckIn: "2025-12-14T00:00:00.000+0000",
      subscriptionType: "yearly",
      productId: "pro_yearly",
    };

    const result = UserStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.subscriptionType).toBe("yearly");
    }
  });
});

describe("UserStatsSchema", () => {
  it("parses user stats", () => {
    const stats = {
      checklistCount: 50,
      completedCount: 100,
      date: "2025-12-14",
      deletedCount: 10,
      dueTodayCount: 5,
      normalCount: 25,
      noteCount: 15,
      overdueCount: 2,
    };

    const result = UserStatsSchema.safeParse(stats);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.completedCount).toBe(100);
    }
  });
});

describe("BatchResponseSchema", () => {
  it("parses a full batch response", () => {
    const batch = {
      syncTaskBean: {
        update: [
          { id: "task-1", title: "Task 1" },
          { id: "task-2", title: "Task 2" },
        ],
        delete: ["task-deleted-1"],
      },
      projectProfiles: [
        { id: "proj-1", name: "Project 1" },
      ],
      projectGroups: [
        { id: "group-1", name: "Group 1" },
      ],
      tags: [
        { name: "tag1" },
      ],
      inboxId: "inbox-123",
      checkPoint: 1702500000000,
    };

    const result = BatchResponseSchema.safeParse(batch);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.syncTaskBean?.update?.length).toBe(2);
      expect(result.data.projectProfiles?.length).toBe(1);
      expect(result.data.inboxId).toBe("inbox-123");
    }
  });

  it("parses empty batch response", () => {
    const batch = {};
    const result = BatchResponseSchema.safeParse(batch);
    expect(result.success).toBe(true);
  });
});

describe("BatchOperationResponseSchema", () => {
  it("parses operation response with etags", () => {
    const response = {
      id2etag: {
        "task-1": "etag-1",
        "task-2": "etag-2",
      },
    };

    const result = BatchOperationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id2etag?.["task-1"]).toBe("etag-1");
    }
  });

  it("parses operation response with errors", () => {
    const response = {
      id2error: {
        "task-1": "Task not found",
      },
    };

    const result = BatchOperationResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id2error?.["task-1"]).toBe("Task not found");
    }
  });
});

describe("LoginResponseSchema", () => {
  it("parses successful login response", () => {
    const response = {
      token: "session-token-xyz",
      userId: "user-123",
      username: "testuser",
      inboxId: "inbox-123",
      pro: true,
      freeTrial: false,
    };

    const result = LoginResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe("session-token-xyz");
    }
  });

  it("parses login error response", () => {
    const response = {
      error: "Invalid credentials",
      errorCode: "username_password_not_match",
    };

    const result = LoginResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.errorCode).toBe("username_password_not_match");
    }
  });

  it("parses 2FA required response", () => {
    const response = {
      need2FA: true,
      errorCode: "need_2fa",
    };

    const result = LoginResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.need2FA).toBe(true);
    }
  });
});

describe("ChecklistItemSchema", () => {
  it("parses checklist item", () => {
    const item = {
      id: "item-1",
      title: "Subtask item",
      status: 0,
      sortOrder: 100,
    };

    const result = ChecklistItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });
});

describe("ReminderSchema", () => {
  it("parses reminder", () => {
    const reminder = {
      id: "rem-1",
      trigger: "TRIGGER:-PT15M",
    };

    const result = ReminderSchema.safeParse(reminder);
    expect(result.success).toBe(true);
  });
});
