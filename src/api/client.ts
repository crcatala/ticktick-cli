/**
 * TickTick API client.
 *
 * Provides methods for interacting with the TickTick v2 API.
 */
import { getAuth } from "../config/config.js";
import { AuthError, ApiError, ClientError } from "../utils/errors.js";
import { BASE_URL, ENDPOINTS } from "./endpoints.js";
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
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  token?: string;
}

/**
 * Generate a unique device ID for the X-Device header.
 * TickTick uses this to identify client sessions.
 *
 * Format: 24-char hex string matching MongoDB ObjectId structure:
 * - Bytes 0-3 (8 hex chars): Unix timestamp in seconds
 * - Bytes 4-8 (10 hex chars): Random value
 * - Bytes 9-11 (6 hex chars): Counter
 *
 * Total: 12 bytes = 24 hex characters
 */
function generateDeviceId(): string {
  // 4 bytes (8 hex chars): Unix timestamp
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  // 5 bytes (10 hex chars): Random value
  const random = Array.from({ length: 10 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  // 3 bytes (6 hex chars): Counter
  const counter = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  return timestamp + random + counter;
}

/**
 * TickTick API client class.
 */
export class TickTickClient {
  private username: string;
  private token: string;
  private deviceId: string;

  constructor(username: string, token: string) {
    this.username = username;
    this.token = token;
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
   * Make an API request.
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { method = "GET", body } = options;

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ApiError(response.status, text);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
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
    return this.request<UserProfile>(ENDPOINTS.PROFILE);
  }

  /**
   * Get user status (subscription info).
   */
  async getUserStatus(): Promise<UserStatus> {
    return this.request<UserStatus>(ENDPOINTS.STATUS);
  }

  /**
   * Get user statistics.
   */
  async getUserStats(): Promise<UserStats> {
    return this.request<UserStats>(ENDPOINTS.STATS);
  }

  // ============================================================
  // Sync methods
  // ============================================================

  /**
   * Get full state snapshot (all tasks, projects, tags, etc.).
   */
  async getBatch(): Promise<BatchResponse> {
    return this.request<BatchResponse>(ENDPOINTS.BATCH);
  }

  // ============================================================
  // Task methods
  // ============================================================

  /**
   * Get all active tasks.
   */
  async getTasks(): Promise<Task[]> {
    const batch = await this.getBatch();
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
    const endpoint = `${ENDPOINTS.CLOSED_TASKS}?status=${status}`;
    const tasks = await this.request<Task[]>(endpoint);

    if (projectId) {
      return tasks.filter((t) => t.projectId === projectId);
    }
    return tasks;
  }

  /**
   * Create a new task.
   */
  async createTask(task: TaskCreate): Promise<Task> {
    const taskWithId = {
      ...task,
      id: crypto.randomUUID(),
    };

    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_TASK,
      {
        method: "POST",
        body: { add: [taskWithId] },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to create task: ${errors[0]}`);
    }

    return taskWithId as Task;
  }

  /**
   * Update an existing task.
   */
  async updateTask(task: TaskUpdate): Promise<Task> {
    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_TASK,
      {
        method: "POST",
        body: { update: [task] },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to update task: ${errors[0]}`);
    }

    return task as Task;
  }

  /**
   * Delete tasks.
   */
  async deleteTasks(taskIds: string[]): Promise<void> {
    const deletes = taskIds.map((taskId) => ({ taskId }));

    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_TASK,
      {
        method: "POST",
        body: { delete: deletes },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to delete tasks: ${errors[0]}`);
    }
  }

  /**
   * Mark a task as complete.
   */
  async completeTask(taskId: string): Promise<void> {
    await this.updateTask({ id: taskId, status: 2 });
  }

  /**
   * Mark a task as abandoned.
   */
  async abandonTask(taskId: string): Promise<void> {
    await this.updateTask({ id: taskId, status: -1 });
  }

  /**
   * Reopen a closed task.
   */
  async reopenTask(taskId: string): Promise<void> {
    await this.updateTask({ id: taskId, status: 0 });
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
   */
  async createProject(project: ProjectCreate): Promise<Project> {
    const projectWithId = {
      ...project,
      id: crypto.randomUUID(),
    };

    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_PROJECT,
      {
        method: "POST",
        body: { add: [projectWithId] },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to create project: ${errors[0]}`);
    }

    return projectWithId as Project;
  }

  /**
   * Update an existing project.
   */
  async updateProject(project: ProjectUpdate): Promise<Project> {
    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_PROJECT,
      {
        method: "POST",
        body: { update: [project] },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to update project: ${errors[0]}`);
    }

    return project as Project;
  }

  /**
   * Delete projects.
   */
  async deleteProjects(projectIds: string[]): Promise<void> {
    const deletes = projectIds.map((id) => ({ id }));

    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_PROJECT,
      {
        method: "POST",
        body: { delete: deletes },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to delete projects: ${errors[0]}`);
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
    return batch.projectGroups ?? [];
  }

  /**
   * Create a new project group.
   */
  async createProjectGroup(group: ProjectGroupCreate): Promise<ProjectGroup> {
    const groupWithId = {
      ...group,
      id: crypto.randomUUID(),
    };

    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_PROJECT_GROUP,
      {
        method: "POST",
        body: { add: [groupWithId] },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to create group: ${errors[0]}`);
    }

    return groupWithId as ProjectGroup;
  }

  /**
   * Update an existing project group.
   */
  async updateProjectGroup(group: ProjectGroupUpdate): Promise<ProjectGroup> {
    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_PROJECT_GROUP,
      {
        method: "POST",
        body: { update: [group] },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to update group: ${errors[0]}`);
    }

    return group as ProjectGroup;
  }

  /**
   * Delete project groups.
   */
  async deleteProjectGroups(groupIds: string[]): Promise<void> {
    const deletes = groupIds.map((id) => ({ id }));

    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_PROJECT_GROUP,
      {
        method: "POST",
        body: { delete: deletes },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to delete groups: ${errors[0]}`);
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
    return batch.tags ?? [];
  }

  /**
   * Create a new tag.
   */
  async createTag(tag: TagCreate): Promise<Tag> {
    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_TAG,
      {
        method: "POST",
        body: { add: [tag] },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to create tag: ${errors[0]}`);
    }

    return tag as Tag;
  }

  /**
   * Update an existing tag.
   */
  async updateTag(tag: TagUpdate): Promise<Tag> {
    const response = await this.request<BatchOperationResponse>(
      ENDPOINTS.BATCH_TAG,
      {
        method: "POST",
        body: { update: [tag] },
      }
    );

    if (response.id2error && Object.keys(response.id2error).length > 0) {
      const errors = Object.values(response.id2error);
      throw new ClientError(`Failed to update tag: ${errors[0]}`);
    }

    return tag as Tag;
  }

  /**
   * Rename a tag.
   */
  async renameTag(oldName: string, newName: string): Promise<void> {
    await this.request(ENDPOINTS.TAG_RENAME, {
      method: "POST",
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
}

/**
 * Get a configured client instance from stored auth.
 */
export async function getClient(): Promise<TickTickClient> {
  const auth = await getAuth();
  if (!auth) {
    throw new AuthError("Not logged in. Run 'ticktick auth login' first.");
  }
  return new TickTickClient(auth.username, auth.token);
}

/**
 * Login to TickTick and get a session token.
 *
 * @param username - TickTick username/email
 * @param password - Account password
 * @param totpCode - Optional TOTP code for 2FA
 * @param verbose - Enable debug logging
 */
export async function login(
  username: string,
  password: string,
  totpCode?: string,
  verbose = false
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

  let result: LoginResponse;
  try {
    result = JSON.parse(text) as LoginResponse;
  } catch {
    throw new ApiError(response.status, text);
  }

  // Check for error in response body (TickTick returns 500 for auth failures)
  if (result.errorCode) {
    if (verbose) {
      console.log(`[debug] Error code: ${result.errorCode}`);
    }
    if (result.errorCode === "username_password_not_match") {
      throw new AuthError("Invalid username or password");
    }
    if (result.errorCode === "need_2fa" || result.errorCode === "totp_verify_failed") {
      result.need2FA = true;
      if (!totpCode) {
        return result;
      }
      throw new AuthError("2FA verification failed");
    }
    throw new ApiError(response.status, result.errorCode);
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
