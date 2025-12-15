/**
 * Zod schemas for TickTick API v2 responses.
 *
 * These schemas validate and type API responses at runtime.
 * All schemas use .passthrough() to allow unknown fields from API changes.
 *
 * Note: We use .nullish() instead of .optional() because the TickTick API
 * frequently returns explicit `null` values for absent fields, not just
 * omitting them. `.nullish()` accepts both `null` and `undefined`.
 */
import { z } from "zod/v4";

// ============================================================
// Nested/shared schemas
// ============================================================

export const ChecklistItemSchema = z
  .object({
    id: z.string().nullish(),
    title: z.string().nullish(),
    status: z.number().nullish(),
    completedTime: z.string().nullish(),
    sortOrder: z.number().nullish(),
  })
  .passthrough();

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const ReminderSchema = z
  .object({
    id: z.string().nullish(),
    trigger: z.string().nullish(),
  })
  .passthrough();

export type Reminder = z.infer<typeof ReminderSchema>;

// ============================================================
// Core entity schemas
// ============================================================

export const TaskSchema = z
  .object({
    id: z.string(),
    title: z.string().nullish(),
    content: z.string().nullish(),
    desc: z.string().nullish(),
    projectId: z.string().nullish(),
    priority: z.number().nullish(),
    status: z.number().nullish(),
    dueDate: z.string().nullish(),
    startDate: z.string().nullish(),
    timeZone: z.string().nullish(),
    isAllDay: z.boolean().nullish(),
    reminder: z.string().nullish(),
    reminders: z.array(ReminderSchema).nullish(),
    repeatFlag: z.string().nullish(),
    sortOrder: z.number().nullish(),
    items: z.array(ChecklistItemSchema).nullish(),
    tags: z.array(z.string()).nullish(),
    parentId: z.string().nullish(),
    childIds: z.array(z.string()).nullish(),
    progress: z.number().nullish(),
    createdTime: z.string().nullish(),
    modifiedTime: z.string().nullish(),
    completedTime: z.string().nullish(),
    deletedTime: z.string().nullish(),
    etag: z.string().nullish(),
    kind: z.string().nullish(),
  })
  .passthrough();

export type Task = z.infer<typeof TaskSchema>;

export const ProjectSchema = z
  .object({
    id: z.string(),
    name: z.string().nullish(),
    color: z.string().nullish(),
    sortOrder: z.number().nullish(),
    kind: z.string().nullish(),
    viewMode: z.string().nullish(),
    permission: z.string().nullish(),
    groupId: z.string().nullish(),
    closed: z.boolean().nullish(),
    etag: z.string().nullish(),
    modifiedTime: z.string().nullish(),
  })
  .passthrough();

export type Project = z.infer<typeof ProjectSchema>;

export const ProjectGroupSchema = z
  .object({
    id: z.string(),
    name: z.string().nullish(),
    sortOrder: z.number().nullish(),
    etag: z.string().nullish(),
  })
  .passthrough();

export type ProjectGroup = z.infer<typeof ProjectGroupSchema>;

export const TagSchema = z
  .object({
    name: z.string(),
    label: z.string().nullish(),
    color: z.string().nullish(),
    sortOrder: z.number().nullish(),
    sortType: z.string().nullish(),
    parent: z.string().nullish(),
    etag: z.string().nullish(),
  })
  .passthrough();

export type Tag = z.infer<typeof TagSchema>;

// ============================================================
// User schemas
// ============================================================

export const UserProfileSchema = z
  .object({
    id: z.string().nullish(),
    extenalId: z.string().nullish(), // Note: typo in TickTick API - "extenal" not "external"
    username: z.string().nullish(),
    name: z.string().nullish(),
    email: z.string().nullish(),
    avatar: z.string().nullish(),
    phone: z.string().nullish(),
    timeZone: z.string().nullish(),
    pro: z.boolean().nullish(),
    freeTrial: z.boolean().nullish(),
    createdTime: z.string().nullish(),
  })
  .passthrough();

export type UserProfile = z.infer<typeof UserProfileSchema>;

export const UserStatusSchema = z
  .object({
    userId: z.string().nullish(),
    pro: z.boolean().nullish(),
    proExpire: z.string().nullish(),
    freeTrial: z.boolean().nullish(),
    freeTrialExpire: z.string().nullish(),
    lastCheckIn: z.string().nullish(),
    subscriptionType: z.string().nullish(),
    productId: z.string().nullish(),
  })
  .passthrough();

export type UserStatus = z.infer<typeof UserStatusSchema>;

export const UserStatsSchema = z
  .object({
    checklistCount: z.number().nullish(),
    completedCount: z.number().nullish(),
    date: z.string().nullish(),
    deletedCount: z.number().nullish(),
    dueTodayCount: z.number().nullish(),
    normalCount: z.number().nullish(),
    noteCount: z.number().nullish(),
    overdueCount: z.number().nullish(),
  })
  .passthrough();

export type UserStats = z.infer<typeof UserStatsSchema>;

// ============================================================
// Batch/sync schemas
// ============================================================

export const SyncTaskBeanSchema = z
  .object({
    update: z.array(TaskSchema).nullish(),
    delete: z.array(z.string()).nullish(),
  })
  .passthrough();

export type SyncTaskBean = z.infer<typeof SyncTaskBeanSchema>;

export const BatchResponseSchema = z
  .object({
    syncTaskBean: SyncTaskBeanSchema.nullish(),
    projectProfiles: z.array(ProjectSchema).nullish(),
    projectGroups: z.array(ProjectGroupSchema).nullish(),
    tags: z.array(TagSchema).nullish(),
    inboxId: z.string().nullish(),
    checkPoint: z.number().nullish(),
  })
  .passthrough();

export type BatchResponse = z.infer<typeof BatchResponseSchema>;

export const BatchOperationResponseSchema = z
  .object({
    id2etag: z.record(z.string(), z.string()).nullish(),
    id2error: z.record(z.string(), z.string()).nullish(),
  })
  .passthrough();

export type BatchOperationResponse = z.infer<typeof BatchOperationResponseSchema>;

// ============================================================
// Auth schemas
// ============================================================

export const LoginResponseSchema = z
  .object({
    token: z.string().nullish(),
    sid: z.string().nullish(), // alternate session token in some responses
    userId: z.string().nullish(),
    username: z.string().nullish(),
    inboxId: z.string().nullish(),
    pro: z.boolean().nullish(),
    freeTrial: z.boolean().nullish(),
    error: z.string().nullish(),
    errorCode: z.string().nullish(),
    need2FA: z.boolean().nullish(),
  })
  .passthrough();

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
