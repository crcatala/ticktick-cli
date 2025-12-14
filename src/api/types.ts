/**
 * TypeScript types for TickTick API responses.
 *
 * These types represent the v2 API response structures.
 * Fields are optional since the API may not always return all fields.
 */

export interface Task {
  id: string;
  title?: string;
  content?: string;
  desc?: string;
  projectId?: string;
  priority?: number;
  status?: number;
  dueDate?: string;
  startDate?: string;
  timeZone?: string;
  isAllDay?: boolean;
  reminder?: string;
  reminders?: Reminder[];
  repeatFlag?: string;
  sortOrder?: number;
  items?: ChecklistItem[];
  tags?: string[];
  parentId?: string;
  childIds?: string[];
  progress?: number;
  createdTime?: string;
  modifiedTime?: string;
  completedTime?: string;
  deletedTime?: string;
  etag?: string;
  kind?: string;
}

export interface ChecklistItem {
  id?: string;
  title?: string;
  status?: number;
  completedTime?: string;
  sortOrder?: number;
}

export interface Reminder {
  id?: string;
  trigger?: string;
}

export interface Project {
  id: string;
  name?: string;
  color?: string;
  sortOrder?: number;
  kind?: string;
  viewMode?: string;
  permission?: string;
  groupId?: string;
  closed?: boolean;
  etag?: string;
  modifiedTime?: string;
}

export interface ProjectGroup {
  id: string;
  name?: string;
  sortOrder?: number;
  etag?: string;
}

export interface Tag {
  name: string;
  label?: string;
  color?: string;
  sortOrder?: number;
  sortType?: string;
  parent?: string;
  etag?: string;
}

export interface UserProfile {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  avatar?: string;
  phone?: string;
  timeZone?: string;
  pro?: boolean;
  freeTrial?: boolean;
  createdTime?: string;
}

export interface UserStatus {
  userId?: string;
  pro?: boolean;
  proExpire?: string;
  freeTrial?: boolean;
  freeTrialExpire?: string;
  lastCheckIn?: string;
  subscriptionType?: string;
  productId?: string;
}

export interface UserStats {
  checklistCount?: number;
  completedCount?: number;
  date?: string;
  deletedCount?: number;
  dueTodayCount?: number;
  normalCount?: number;
  noteCount?: number;
  overdueCount?: number;
}

export interface BatchResponse {
  syncTaskBean?: {
    update?: Task[];
    delete?: string[];
  };
  projectProfiles?: Project[];
  projectGroups?: ProjectGroup[];
  tags?: Tag[];
  inboxId?: string;
  checkPoint?: number;
}

export interface BatchOperationResponse {
  id2etag?: Record<string, string>;
  id2error?: Record<string, string>;
}

export interface LoginRequest {
  username: string;
  password: string;
  token?: string;
}

export interface LoginResponse {
  token?: string;
  sid?: string; // seen in some TickTick responses as alternate session token
  userId?: string;
  username?: string;
  inboxId?: string;
  pro?: boolean;
  freeTrial?: boolean;
  error?: string;
  errorCode?: string;
  need2FA?: boolean;
}

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

export interface TaskUpdate extends Partial<TaskCreate> {
  id: string;
  status?: number;
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
