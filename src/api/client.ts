/**
 * TickTick API client.
 *
 * Provides methods for interacting with the TickTick v2 API.
 */
import { getAuth } from "../config/config.js";
import { AuthError, ApiError, ClientError } from "../utils/errors.js";
import { calculateBackoffDelay, sleep } from "../utils/backoff.js";
import { BASE_URL, ENDPOINTS } from "./endpoints.js";
import {
  validateOne,
  validateArray,
  type ValidationStrategy,
  DEFAULT_VALIDATION_STRATEGY,
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
} from "../schemas/index.js";
import type {
  Task,
  Project,
  ProjectGroup,
  Tag,
  UserProfile,
  UserStatus,
  UserStats,
  BatchResponse,
  BatchOperationResponse,
  LoginResponse,
  TaskCreate,
  TaskUpdate,
  ProjectCreate,
  ProjectUpdate,
  ProjectGroupCreate,
  ProjectGroupUpdate,
  TagCreate,
  TagUpdate,
} from "./types.js";

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string;
}

/**
 * Generate a unique device ID for the X-Device header.
 * TickTick uses this to identify client sessions.
 *
 * Format: 24-char hex string matching MongoDB ObjectId structure:
 * - Bytes 0-3 (8 hex chars): Unix timestamp in seconds
 * - Bytes 4-8 (10 hex chars): Random value (cryptographically secure)
 * - Bytes 9-11 (6 hex chars): Counter
 *
 * Total: 12 bytes = 24 hex characters
 */
/**
 * Generate a MongoDB ObjectId-style ID.
 *
 * Format: 24-char hex string:
 * - Bytes 0-3 (8 hex chars): Unix timestamp in seconds
 * - Bytes 4-8 (10 hex chars): Random value
 * - Bytes 9-11 (6 hex chars): Counter/random
 *
 * This format is required by the TickTick API for task/project/group IDs.
 */
function generateObjectId(): string {
  // 4 bytes (8 hex chars): Unix timestamp
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");

  // 5 bytes (10 hex chars): Cryptographically secure random value
  const randomBytes = new Uint8Array(5);
  crypto.getRandomValues(randomBytes);
  const random = Array.from(randomBytes, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  // 3 bytes (6 hex chars): Counter (using random for simplicity)
  const counterBytes = new Uint8Array(3);
  crypto.getRandomValues(counterBytes);
  const counter = Array.from(counterBytes, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return timestamp + random + counter;
}

/**
 * Generate a unique device ID for the X-Device header.
 * Uses the same ObjectId format that TickTick expects.
 */
function generateDeviceId(): string {
  return generateObjectId();
}

/**
 * Options for creating a TickTick client.
 */
export interface TickTickClientOptions {
  debug?: boolean;
  validation?: ValidationStrategy;
}

/**
 * TickTick API client class.
 */
export class TickTickClient {
  private username: string;
  private token: string;
  private deviceId: string;
  private debug: boolean;
  private validation: ValidationStrategy;

  constructor(username: string, token: string, options: TickTickClientOptions = {}) {
    this.username = username;
    this.token = token;
    this.debug = options.debug ?? false;
    this.validation = options.validation ?? DEFAULT_VALIDATION_STRATEGY;
    // Use a stable device ID for the lifetime of the client/session.
    // TickTick associates the session cookie with the X-Device payload;
    // regenerating this per-request causes the server to invalidate the session
    // and return 401 "Session expired".
    this.deviceId = generateDeviceId();
  }

  /**
   * Get default headers for API requests.
   * TickTick's V2 API requires browser-like headers and session cookie.
   */
  private get headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (rv:145.0) Firefox/145.0",
      "Cookie": `t=${this.token}`,
      "X-Device": JSON.stringify({
        platform: "web",
        version: 6430,
        id: this.deviceId,
      }),
    };
  }

  /**
   * Make an API request with retry logic for rate limiting.
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    retryCount = 0
  ): Promise<T> {
    const { method = "GET", body } = options;
    const url = `${BASE_URL}${endpoint}`;
    const maxRetries = 3;

    if (this.debug) {
      console.log(`[debug] ${method} ${url}${retryCount > 0 ? ` (retry ${retryCount})` : ""}`);
      if (body) {
        console.log(`[debug] Request body:`, JSON.stringify(body, null, 2));
      }
    }

    const response = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (this.debug) {
      console.log(`[debug] Response status: ${response.status}`);
    }

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retryCount < maxRetries) {
      const delay = calculateBackoffDelay(retryCount);
      if (this.debug) {
        console.log(`[debug] Rate limited. Retrying in ${delay}ms...`);
      }
      await sleep(delay);
      return this.request<T>(endpoint, options, retryCount + 1);
    }

    if (!response.ok) {
      const text = await response.text();
      if (this.debug) {
        console.log(`[debug] Error response:`, text);
      }

      // Provide helpful message for rate limiting
      if (response.status === 429) {
        throw new ApiError(
          response.status,
          "Rate limit exceeded. Please wait a moment before trying again."
        );
      }

      throw new ApiError(response.status, text);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const data = await response.json();
      if (this.debug) {
        console.log(`[debug] Response data:`, JSON.stringify(data, null, 2).slice(0, 500));
      }
      return data as T;
    }

    return {} as T;
  }

  // ============================================================
  // User methods
  // ============================================================

  /**
   * Get user profile.
   */
  async getProfile(): Promise<UserProfile> {
    const data = await this.request<unknown>(ENDPOINTS.PROFILE);
    return validateOne(UserProfileSchema, data, this.validation, "UserProfile");
  }

  /**
   * Get user status (subscription info).
   */
  async getUserStatus(): Promise<UserStatus> {
    const data = await this.request<unknown>(ENDPOINTS.STATUS);
    return validateOne(UserStatusSchema, data, this.validation, "UserStatus");
  }

  /**
   * Get user statistics.
   */
  async getUserStats(): Promise<UserStats> {
    const data = await this.request<unknown>(ENDPOINTS.STATS);
    return validateOne(UserStatsSchema, data, this.validation, "UserStats");
  }

  // ============================================================
  // Sync methods
  // ============================================================

  /**
   * Get full state snapshot (all tasks, projects, tags, etc.).
   */
  async getBatch(): Promise<BatchResponse> {
    const data = await this.request<unknown>(ENDPOINTS.BATCH);
    return validateOne(BatchResponseSchema, data, this.validation, "BatchResponse");
  }

  // ============================================================
  // Task methods
  // ============================================================

  /**
   * Get all active tasks.
   */
  async getTasks(): Promise<Task[]> {
    const batch = await this.getBatch();
    // Tasks are already validated as part of BatchResponse
    return batch.syncTaskBean?.update ?? [];
  }

  /**
   * Get closed tasks.
   *
   * @param status - "Completed" or "Abandoned"
   * @param projectId - Optional project ID to filter by
   */
  async getClosedTasks(
    status: "Completed" | "Abandoned" = "Completed",
    projectId?: string
  ): Promise<Task[]> {
    // Match web app query format: from=&to=&status=X
    const endpoint = `${ENDPOINTS.CLOSED_TASKS}?from=&to=&status=${status}`;
    const data = await this.request<unknown>(endpoint);
    const tasks = validateArray(TaskSchema, data, this.validation, "Task");

    if (projectId) {
      return tasks.filter((t) => t.projectId === projectId);
    }
    return tasks;
  }

  /**
   * Create a new task.
   * Returns the task with generated ID and etag if available.
   * Note: API doesn't return full task object; some fields may only be populated after refetching.
   */
  async createTask(task: TaskCreate): Promise<Task> {
    // Generate a temporary ID for the request
    const tempId = generateObjectId();
    const taskWithId: Task = {
      ...task,
      id: tempId,
    };

    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_TASK,
      {
        method: "POST",
        body: { add: [taskWithId] },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to create task: ${errorMessages.join("; ")}`);
    }

    // The API may return a different ID than what we sent.
    // Check id2etag for the real ID mapping, or fetch to find the created task.
    if (response.id2etag) {
      const ids = Object.keys(response.id2etag);
      // If we get back an ID different from what we sent, use that
      const realId = ids.find(id => id !== tempId) || ids[0];
      if (realId) {
        taskWithId.id = realId;
        taskWithId.etag = response.id2etag[realId];
        return taskWithId;
      }
      // If the temp ID is in the response, the API accepted our ID
      if (response.id2etag[tempId]) {
        taskWithId.etag = response.id2etag[tempId];
        return taskWithId;
      }
    }

    // Fallback: fetch tasks to find the one we just created by title
    // This handles the case where the API assigns a completely different ID
    const allTasks = await this.getTasks();
    const createdTask = allTasks.find(t => 
      t.title === task.title && 
      t.projectId === task.projectId
    );
    if (createdTask) {
      return createdTask;
    }

    // If we still can't find it, return what we have
    return taskWithId;
  }

  /**
   * Update an existing task.
   * Returns the updated task data with etag if available.
   * Note: API doesn't return full task object; refetch if you need all current fields.
   */
  async updateTask(task: TaskUpdate): Promise<Task> {
    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_TASK,
      {
        method: "POST",
        body: { update: [task] },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to update task: ${errorMessages.join("; ")}`);
    }

    // Construct return object with etag if available
    const updatedTask: Task = { ...task };
    if (response.id2etag && task.id) {
      updatedTask.etag = response.id2etag[task.id];
    }

    return updatedTask;
  }

  /**
   * Delete tasks.
   * @param taskIds - Array of task IDs to delete
   * @param projectId - Optional project ID (required by some API versions)
   */
  async deleteTasks(taskIds: string[], projectId: string): Promise<void> {
    const deletes = taskIds.map((taskId) => ({
      taskId,
      projectId,
    }));

    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_TASK,
      {
        method: "POST",
        body: { delete: deletes },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to delete tasks: ${errorMessages.join("; ")}`);
    }
  }

  /**
   * Mark a task as complete.
   * Requires status=2, completedTime, and projectId to be set.
   */
  async completeTask(taskId: string, projectId: string): Promise<void> {
    const completedTime = new Date().toISOString();
    await this.updateTask({ 
      id: taskId, 
      projectId,
      status: 2,
      completedTime,
    });
  }

  /**
   * Mark a task as abandoned.
   * Requires status=-1, completedTime, and projectId to be set.
   */
  async abandonTask(taskId: string, projectId: string): Promise<void> {
    const completedTime = new Date().toISOString();
    await this.updateTask({ 
      id: taskId, 
      projectId,
      status: -1,
      completedTime,
    });
  }

  /**
   * Reopen a closed task.
   */
  async reopenTask(taskId: string, projectId: string): Promise<void> {
    await this.updateTask({ id: taskId, projectId, status: 0 });
  }

  /**
   * Set parent for a task (make it a subtask).
   */
  async setTaskParent(taskId: string, parentId: string): Promise<void> {
    await this.request(ENDPOINTS.BATCH_TASK, {
      method: "POST",
      body: { parentSet: [{ id: taskId, parentId }] },
    });
  }

  /**
   * Remove parent from a task.
   */
  async unsetTaskParent(taskId: string): Promise<void> {
    await this.request(ENDPOINTS.BATCH_TASK, {
      method: "POST",
      body: { parentUnset: [{ id: taskId }] },
    });
  }

  // ============================================================
  // Project methods
  // ============================================================

  /**
   * Get all projects.
   */
  async getProjects(): Promise<Project[]> {
    const batch = await this.getBatch();
    // Projects are already validated as part of BatchResponse
    return batch.projectProfiles ?? [];
  }

  /**
   * Get inbox project ID.
   */
  async getInbox(): Promise<string | null> {
    const batch = await this.getBatch();
    return batch.inboxId ?? null;
  }

  /**
   * Create a new project.
   * Returns the project with generated ID and etag if available.
   */
  async createProject(project: ProjectCreate): Promise<Project> {
    const projectWithId: Project = {
      ...project,
      id: generateObjectId(),
    };

    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_PROJECT,
      {
        method: "POST",
        body: { add: [projectWithId] },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to create project: ${errorMessages.join("; ")}`);
    }

    // Add etag if returned by API
    if (response.id2etag && projectWithId.id) {
      projectWithId.etag = response.id2etag[projectWithId.id];
    }

    return projectWithId;
  }

  /**
   * Update an existing project.
   * Returns the updated project data with etag if available.
   */
  async updateProject(project: ProjectUpdate): Promise<Project> {
    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_PROJECT,
      {
        method: "POST",
        body: { update: [project] },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to update project: ${errorMessages.join("; ")}`);
    }

    // Construct return object with etag if available
    const updatedProject: Project = { ...project };
    if (response.id2etag && project.id) {
      updatedProject.etag = response.id2etag[project.id];
    }

    return updatedProject;
  }

  /**
   * Delete projects.
   * Uses the /batch/order endpoint with orderByType payload structure.
   */
  async deleteProjects(projectIds: string[]): Promise<void> {
    // Uses same format as groups: { add: [], update: [], delete: ["id1", "id2"] }
    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_PROJECT,
      {
        method: "POST",
        body: { add: [], update: [], delete: projectIds },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to delete projects: ${errorMessages.join("; ")}`);
    }
  }

  // ============================================================
  // Project Group methods
  // ============================================================

  /**
   * Get all project groups.
   */
  async getProjectGroups(): Promise<ProjectGroup[]> {
    const batch = await this.getBatch();
    // Project groups are already validated as part of BatchResponse
    return batch.projectGroups ?? [];
  }

  /**
   * Create a new project group.
   * Returns the group with generated ID and etag if available.
   */
  async createProjectGroup(group: ProjectGroupCreate): Promise<ProjectGroup> {
    const groupWithId: ProjectGroup = {
      ...group,
      id: generateObjectId(),
    };

    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_PROJECT_GROUP,
      {
        method: "POST",
        body: { add: [groupWithId] },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to create group: ${errorMessages.join("; ")}`);
    }

    // Add etag if returned by API
    if (response.id2etag && groupWithId.id) {
      groupWithId.etag = response.id2etag[groupWithId.id];
    }

    return groupWithId;
  }

  /**
   * Update an existing project group.
   * Returns the updated group data with etag if available.
   */
  async updateProjectGroup(group: ProjectGroupUpdate): Promise<ProjectGroup> {
    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_PROJECT_GROUP,
      {
        method: "POST",
        body: { update: [group] },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to update group: ${errorMessages.join("; ")}`);
    }

    // Construct return object with etag if available
    const updatedGroup: ProjectGroup = { ...group };
    if (response.id2etag && group.id) {
      updatedGroup.etag = response.id2etag[group.id];
    }

    return updatedGroup;
  }

  /**
   * Delete project groups.
   * Uses array of IDs directly (not objects with id property).
   */
  async deleteProjectGroups(groupIds: string[]): Promise<void> {
    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_PROJECT_GROUP,
      {
        method: "POST",
        body: { add: [], update: [], delete: groupIds },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to delete groups: ${errorMessages.join("; ")}`);
    }
  }

  // ============================================================
  // Tag methods
  // ============================================================

  /**
   * Get all tags.
   */
  async getTags(): Promise<Tag[]> {
    const batch = await this.getBatch();
    // Tags are already validated as part of BatchResponse
    return batch.tags ?? [];
  }

  /**
   * Create a new tag.
   * Returns the tag with etag if available.
   */
  async createTag(tag: TagCreate): Promise<Tag> {
    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_TAG,
      {
        method: "POST",
        body: { add: [tag] },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to create tag: ${errorMessages.join("; ")}`);
    }

    // Construct return object with etag if available
    const createdTag: Tag = { ...tag };
    if (response.id2etag && tag.name) {
      createdTag.etag = response.id2etag[tag.name];
    }

    return createdTag;
  }

  /**
   * Update an existing tag.
   * Returns the updated tag data with etag if available.
   */
  async updateTag(tag: TagUpdate): Promise<Tag> {
    const data = await this.request<unknown>(
      ENDPOINTS.BATCH_TAG,
      {
        method: "POST",
        body: { update: [tag] },
      }
    );
    const response = validateOne(
      BatchOperationResponseSchema,
      data,
      this.validation,
      "BatchOperationResponse"
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errorMessages = Object.entries(response.id2error).map(
        ([id, msg]) => `${id}: ${msg}`
      );
      throw new ClientError(`Failed to update tag: ${errorMessages.join("; ")}`);
    }

    // Construct return object with etag if available
    const updatedTag: Tag = { ...tag };
    if (response.id2etag && tag.name) {
      updatedTag.etag = response.id2etag[tag.name];
    }

    return updatedTag;
  }

  /**
   * Rename a tag.
   * Note: Uses PUT method per TickTick API (not POST).
   */
  async renameTag(oldName: string, newName: string): Promise<void> {
    await this.request(ENDPOINTS.TAG_RENAME, {
      method: "PUT",
      body: { name: oldName, newName },
    });
  }

  /**
   * Delete a tag.
   */
  async deleteTag(name: string): Promise<void> {
    await this.request(`${ENDPOINTS.TAG_DELETE}/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }

  /**
   * Empty the trash (permanently delete all trashed items).
   */
  async emptyTrash(): Promise<void> {
    await this.request(ENDPOINTS.TRASH_CLEANUP, {
      method: "DELETE",
    });
  }
}

/**
 * Options for getting a client instance.
 */
export interface GetClientOptions {
  debug?: boolean;
  validation?: ValidationStrategy;
}

/**
 * Get a configured client instance from stored auth.
 * @param options - Client options (debug mode, validation strategy)
 */
export async function getClient(options: GetClientOptions = {}): Promise<TickTickClient> {
  const auth = await getAuth();
  if (!auth) {
    throw new AuthError("Not logged in. Run 'ticktick auth login' first.");
  }
  // Allow debug mode via environment variable
  const debugMode = options.debug || process.env.TICKTICK_DEBUG === "1";
  return new TickTickClient(auth.username, auth.token, {
    debug: debugMode,
    validation: options.validation,
  });
}

/**
 * Login to TickTick and get a session token.
 *
 * @param username - TickTick username/email
 * @param password - Account password
 * @param totpCode - Optional TOTP code for 2FA
 * @param verbose - Enable debug logging
 * @param validation - Validation strategy for response
 */
export async function login(
  username: string,
  password: string,
  totpCode?: string,
  verbose = false,
  validation: ValidationStrategy = DEFAULT_VALIDATION_STRATEGY
): Promise<LoginResponse> {
  const body: Record<string, string> = { username, password };
  if (totpCode) {
    body.token = totpCode;
  }

  const url = `${BASE_URL}${ENDPOINTS.LOGIN}`;
  // TickTick's undocumented V2 API requires browser-like headers.
  // X-Device identifies the client; version 6430 is the current web app version.
  const deviceId = generateDeviceId();
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (rv:145.0) Firefox/145.0",
    "Content-Type": "application/json",
    "X-Device": JSON.stringify({
      platform: "web",
      version: 6430,
      id: deviceId,
    }),
  };

  if (verbose) {
    console.log(`[debug] POST ${url}`);
    console.log(`[debug] Headers: ${JSON.stringify(headers, null, 2)}`);
    console.log(`[debug] Body: ${JSON.stringify({ ...body, password: `[${password.length} chars]` })}`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (verbose) {
    console.log(`[debug] X-Device id: ${deviceId}`);
  }

  if (verbose) {
    console.log(`[debug] Response status: ${response.status}`);
    console.log(`[debug] Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}`);
  }

  // Parse response body
  const text = await response.text();

  if (verbose) {
    console.log(`[debug] Response body: ${text.slice(0, 500)}`);
  }

  let rawResult: unknown;
  try {
    rawResult = JSON.parse(text);
  } catch {
    throw new ApiError(response.status, text);
  }

  // Validate the response
  const result = validateOne(LoginResponseSchema, rawResult, validation, "LoginResponse");

  // Check for error in response body (TickTick returns 500 for auth failures)
  if (result.errorCode) {
    if (verbose) {
      console.log(`[debug] Error code: ${result.errorCode}`);
    }

    // Handle specific error codes
    switch (result.errorCode) {
      case "username_password_not_match":
        throw new AuthError("Invalid username or password");

      case "need_2fa":
        if (!totpCode) {
          // Return response indicating 2FA is needed
          return { ...result, need2FA: true };
        }
        throw new AuthError("2FA code required but not provided");

      case "totp_verify_failed":
        throw new AuthError("2FA verification failed - invalid code");

      case "account_locked":
        throw new AuthError("Account is locked - too many failed attempts");

      case "account_disabled":
        throw new AuthError("Account has been disabled");

      default:
        throw new ApiError(response.status, `Login failed: ${result.errorCode}`);
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, text);
  }

  // Token can be in response body or Set-Cookie header. Prefer body.token, then sid, then cookie.
  if (!result.token && result.sid) {
    result.token = result.sid;
  }

  const setCookie = response.headers.get("set-cookie");
  if (!result.token && setCookie) {
    const tokenMatch = setCookie.match(/t=([^;]+)/);
    if (tokenMatch) {
      result.token = tokenMatch[1];
    }
  }

  if (!result.token) {
    throw new AuthError("Login succeeded but no session token was returned");
  }

  if (verbose) {
    console.log(`[debug] Token received: ${result.token ? "yes" : "no"}`);
  }

  return result;
}
