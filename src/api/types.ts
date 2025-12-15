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

// ============================================================
// Input types for create/update operations
// These are used for request bodies, not responses
// ============================================================

// Task create/update parameter types
export interface TaskCreate {
  title: string;
  projectId?: string;
  content?: string;
  priority?: number;
  dueDate?: string;
  startDate?: string;
  isAllDay?: boolean;
  reminder?: string;
  tags?: string[];
  timeZone?: string;
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
