/**
 * TypeScript types for TickTick API.
 *
 * Response types are re-exported from schemas (with runtime validation).
 * Input types for create/update operations are defined here.
 */

// Re-export response types from schemas
export type {
  Task,
  ChecklistItem,
  Reminder,
  Project,
  ProjectGroup,
  Tag,
  UserProfile,
  UserStatus,
  UserStats,
  BatchResponse,
  BatchOperationResponse,
  LoginResponse,
} from "../schemas/index.js";

// Import response types for use within request helpers.
import type { Reminder, Task } from "../schemas/index.js";

export type TaskKind = "TEXT" | "NOTE";

// ============================================================
// Input types for create/update operations
// These are used for request bodies, not responses
// ============================================================

// Task create/update parameter types
export interface TaskCreate {
  title: string;
  projectId?: string;
  content?: string;
  /** `TEXT` for a task, `NOTE` for a note. */
  kind?: TaskKind;
  priority?: number;
  progress?: number;
  status?: number;
  items?: ChecklistItemInput[];
  dueDate?: string;
  startDate?: string;
  isAllDay?: boolean;
  reminder?: string;
  reminders?: Reminder[];
  tags?: string[];
  timeZone?: string;
  /** RRULE string for recurring tasks (e.g., "RRULE:FREQ=DAILY;INTERVAL=1") */
  repeatFlag?: string;
  /** First date of recurring task (ISO 8601 format) */
  repeatFirstDate?: string;
  /** Repeat mode - "2" appears to be standard value */
  repeatFrom?: string;
}

export interface ChecklistItemInput {
  id: string;
  title: string;
  status: number;
  sortOrder: number;
  completedTime?: string;
  [key: string]: unknown;  // Allow extra fields to match Task.items type
}

export interface TaskUpdate extends Partial<TaskCreate> {
  id: string;
  status?: number;
  completedTime?: string;
  items?: ChecklistItemInput[];
}

/**
 * Construct the full-object update TickTick's web app sends when switching an
 * item between a task and a note. Note conversion deliberately clears
 * task-only metadata; do not use a partial `{ kind }` update.
 */
export function prepareTaskKindConversion(task: Task, kind: TaskKind): Task {
  return {
    ...task,
    kind,
    items: [],
    reminders: [],
    reminder: null,
    repeatFlag: null,
    repeatFirstDate: null,
    exDate: [],
    priority: 0,
    tags: [],
    progress: 0,
    dueDate: null,
    // These fields are currently not modeled explicitly by TaskSchema, but
    // are retained by its passthrough type and sent by the web client.
    repeatFrom: null,
    assignee: null,
  };
}

// Project create/update parameter types
export interface ProjectCreate {
  name: string;
  color?: string;
  kind?: string;
  viewMode?: string;
  groupId?: string;
}

export interface ProjectUpdate extends Partial<ProjectCreate> {
  id: string;
}

// Tag create/update parameter types
export interface TagCreate {
  name: string;
  color?: string;
  parent?: string;
}

export interface TagUpdate extends Partial<TagCreate> {
  name: string;
}

// Project group create/update parameter types
export interface ProjectGroupCreate {
  name: string;
}

export interface ProjectGroupUpdate extends Partial<ProjectGroupCreate> {
  id: string;
}

// Login request type
export interface LoginRequest {
  username: string;
  password: string;
  token?: string;
}
