/**
 * Schema exports for TickTick API validation.
 */

// Schemas and types
export {
  // Nested schemas
  ChecklistItemSchema,
  ReminderSchema,
  // Core entity schemas
  TaskSchema,
  ProjectSchema,
  ProjectGroupSchema,
  TagSchema,
  // User schemas
  UserProfileSchema,
  UserStatusSchema,
  UserStatsSchema,
  // Batch/sync schemas
  SyncTaskBeanSchema,
  BatchResponseSchema,
  BatchOperationResponseSchema,
  // Auth schemas
  LoginResponseSchema,
  // Types
  type ChecklistItem,
  type Reminder,
  type Task,
  type Project,
  type ProjectGroup,
  type Tag,
  type UserProfile,
  type UserStatus,
  type UserStats,
  type SyncTaskBean,
  type BatchResponse,
  type BatchOperationResponse,
  type LoginResponse,
} from "./v2.js";

// Validation utilities
export {
  validateOne,
  validateArray,
  ValidationError,
  type ValidationStrategy,
  DEFAULT_VALIDATION_STRATEGY,
} from "./validate.js";
