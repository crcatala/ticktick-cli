/**
 * Zod schemas for TickTick API v2 responses.
 *
 * These schemas validate and type API responses at runtime.
 * All schemas use .passthrough() to allow unknown fields from API changes.
 */
import { z } from "zod/v4";

// ============================================================
// Nested/shared schemas
// ============================================================

export const ChecklistItemSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    status: z.number().optional(),
    completedTime: z.string().optional(),
    sortOrder: z.number().optional(),
  })
  .passthrough();

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ReminderSchema = z
  .object({
    id: z.string().optional(),
    trigger: z.string().optional(),
  })
  .passthrough();

export type Reminder = z.infer<typeof ReminderSchema>;

// ============================================================
// Core entity schemas
// ============================================================

export const TaskSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    content: z.string().optional(),
    desc: z.string().optional(),
    projectId: z.string().optional(),
    priority: z.number().optional(),
    status: z.number().optional(),
    dueDate: z.string().optional(),
    startDate: z.string().optional(),
    timeZone: z.string().optional(),
    isAllDay: z.boolean().optional(),
    reminder: z.string().optional(),
    reminders: z.array(ReminderSchema).optional(),
    repeatFlag: z.string().optional(),
    sortOrder: z.number().optional(),
    items: z.array(ChecklistItemSchema).optional(),
    tags: z.array(z.string()).optional(),
    parentId: z.string().optional(),
    childIds: z.array(z.string()).optional(),
    progress: z.number().optional(),
    createdTime: z.string().optional(),
    modifiedTime: z.string().optional(),
    completedTime: z.string().optional(),
    deletedTime: z.string().optional(),
    etag: z.string().optional(),
    kind: z.string().optional(),
  })
  .passthrough();

export type Task = z.infer<typeof TaskSchema>;

export const ProjectSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    color: z.string().optional(),
    sortOrder: z.number().optional(),
    kind: z.string().optional(),
    viewMode: z.string().optional(),
    permission: z.string().optional(),
    groupId: z.string().optional(),
    closed: z.boolean().optional(),
    etag: z.string().optional(),
    modifiedTime: z.string().optional(),
  })
  .passthrough();

export type Project = z.infer<typeof ProjectSchema>;

export const ProjectGroupSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    sortOrder: z.number().optional(),
    etag: z.string().optional(),
  })
  .passthrough();

export type ProjectGroup = z.infer<typeof ProjectGroupSchema>;

export const TagSchema = z
  .object({
    name: z.string(),
    label: z.string().optional(),
    color: z.string().optional(),
    sortOrder: z.number().optional(),
    sortType: z.string().optional(),
    parent: z.string().optional(),
    etag: z.string().optional(),
  })
  .passthrough();

export type Tag = z.infer<typeof TagSchema>;

// ============================================================
// User schemas
// ============================================================

export const UserProfileSchema = z
  .object({
    id: z.string().optional(),
    extenalId: z.string().optional(), // Note: typo in TickTick API - "extenal" not "external"
    username: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    avatar: z.string().optional(),
    phone: z.string().optional(),
    timeZone: z.string().optional(),
    pro: z.boolean().optional(),
    freeTrial: z.boolean().optional(),
    createdTime: z.string().optional(),
  })
  .passthrough();

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserStatusSchema = z
  .object({
    userId: z.string().optional(),
    pro: z.boolean().optional(),
    proExpire: z.string().optional(),
    freeTrial: z.boolean().optional(),
    freeTrialExpire: z.string().optional(),
    lastCheckIn: z.string().optional(),
    subscriptionType: z.string().optional(),
    productId: z.string().optional(),
  })
  .passthrough();

export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserStatsSchema = z
  .object({
    checklistCount: z.number().optional(),
    completedCount: z.number().optional(),
    date: z.string().optional(),
    deletedCount: z.number().optional(),
    dueTodayCount: z.number().optional(),
    normalCount: z.number().optional(),
    noteCount: z.number().optional(),
    overdueCount: z.number().optional(),
  })
  .passthrough();

export type UserStats = z.infer<typeof UserStatsSchema>;

// ============================================================
// Batch/sync schemas
// ============================================================

export const SyncTaskBeanSchema = z
  .object({
    update: z.array(TaskSchema).optional(),
    delete: z.array(z.string()).optional(),
  })
  .passthrough();

export type SyncTaskBean = z.infer<typeof SyncTaskBeanSchema>;

export const BatchResponseSchema = z
  .object({
    syncTaskBean: SyncTaskBeanSchema.optional(),
    projectProfiles: z.array(ProjectSchema).optional(),
    projectGroups: z.array(ProjectGroupSchema).optional(),
    tags: z.array(TagSchema).optional(),
    inboxId: z.string().optional(),
    checkPoint: z.number().optional(),
  })
  .passthrough();

export type BatchResponse = z.infer<typeof BatchResponseSchema>;

export const BatchOperationResponseSchema = z
  .object({
    id2etag: z.record(z.string(), z.string()).optional(),
    id2error: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export type BatchOperationResponse = z.infer<typeof BatchOperationResponseSchema>;

// ============================================================
// Auth schemas
// ============================================================

export const LoginResponseSchema = z
  .object({
    token: z.string().optional(),
    sid: z.string().optional(), // alternate session token in some responses
    userId: z.string().optional(),
    username: z.string().optional(),
    inboxId: z.string().optional(),
    pro: z.boolean().optional(),
    freeTrial: z.boolean().optional(),
    error: z.string().optional(),
    errorCode: z.string().optional(),
    need2FA: z.boolean().optional(),
  })
  .passthrough();

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
