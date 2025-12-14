/**
 * Configuration management for TickTick CLI.
 *
 * Handles reading and writing configuration to ~/.config/ticktick-cli/config.json.
 * Also supports reading legacy TOML config from Python version for migration.
 * Supports both secure keyring storage (default) and plaintext config storage.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { getToken, setToken, deleteToken } from "./credentials.js";
import { ConfigError } from "../utils/errors.js";

const CONFIG_DIR = join(homedir(), ".config", "ticktick-cli");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");
const LEGACY_CONFIG_FILE = join(CONFIG_DIR, "config.toml");

export interface AuthConfig {
  username: string;
  storage: "keyring" | "config";
  token?: string;
}

export interface DefaultsConfig {
  project?: string;
}

export interface Config {
  auth?: AuthConfig;
  defaults?: DefaultsConfig;
}

/**
 * Ensure config directory exists with secure permissions (700).
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Parse simple TOML config (legacy Python format).
 * Only handles the basic structure we need for migration.
 */
function parseLegacyToml(content: string): Config {
  const config: Config = {};
  let currentSection = "";

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Section header
    const sectionMatch = trimmed.match(/^\[(\w+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Key-value pair
    const kvMatch = trimmed.match(/^(\w+)\s*=\s*"?([^"]*)"?$/);
    if (kvMatch && currentSection) {
      const [, key, value] = kvMatch;
      if (currentSection === "auth") {
        config.auth = config.auth ?? { username: "", storage: "config" };
        if (key === "username") config.auth.username = value;
        if (key === "token") config.auth.token = value;
        if (key === "storage") config.auth.storage = value as "keyring" | "config";
      } else if (currentSection === "defaults") {
        config.defaults = config.defaults ?? {};
        if (key === "project") config.defaults.project = value;
      }
    }
  }

  return config;
}

/**
 * Load configuration from file.
 * Tries JSON first, then falls back to legacy TOML for migration.
 */
export function loadConfig(): Config {
  // Try JSON config first
  if (existsSync(CONFIG_FILE)) {
    try {
      const content = readFileSync(CONFIG_FILE, "utf-8");
      return JSON.parse(content) as Config;
    } catch (error) {
      throw new ConfigError(`Failed to parse config file: ${error}`);
    }
  }

  // Fall back to legacy TOML config (from Python version)
  if (existsSync(LEGACY_CONFIG_FILE)) {
    try {
      const content = readFileSync(LEGACY_CONFIG_FILE, "utf-8");
      return parseLegacyToml(content);
    } catch (error) {
      throw new ConfigError(`Failed to parse legacy config file: ${error}`);
    }
  }

  return {};
}

/**
 * Save configuration to file with secure permissions (600).
 */
export function saveConfig(config: Config): void {
  ensureConfigDir();

  const content = JSON.stringify(config, null, 2);
  writeFileSync(CONFIG_FILE, content, { mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600);
}

/**
 * Get the current authentication storage type.
 */
export function getStorageType(): "keyring" | "config" | null {
  const config = loadConfig();
  if (!config.auth?.username) {
    return null;
  }
  return config.auth.storage ?? "keyring";
}

/**
 * Get authentication credentials.
 *
 * Checks keyring first (if storage=keyring), then falls back to plaintext config.
 */
export async function getAuth(): Promise<{
  username: string;
  token: string;
} | null> {
  const config = loadConfig();
  const auth = config.auth;

  if (!auth?.username) {
    return null;
  }

  const storage = auth.storage ?? "keyring";

  if (storage === "keyring") {
    const token = await getToken(auth.username);
    if (token) {
      return { username: auth.username, token };
    }
    return null;
  }

  // Plaintext config storage
  if (auth.token) {
    return { username: auth.username, token: auth.token };
  }

  return null;
}

/**
 * Set authentication credentials.
 *
 * @param username - TickTick username/email
 * @param token - Session token from v2 API
 * @param useConfig - If true, store token in plaintext config (insecure)
 */
export async function setAuth(
  username: string,
  token: string,
  useConfig = false
): Promise<void> {
  const config = loadConfig();

  if (useConfig) {
    // Store in plaintext config (less secure)
    config.auth = {
      username,
      token,
      storage: "config",
    };
  } else {
    // Store in keyring (secure)
    await setToken(username, token);
    config.auth = {
      username,
      storage: "keyring",
    };
  }

  saveConfig(config);
}

/**
 * Clear authentication credentials from both keyring and config.
 */
export async function clearAuth(): Promise<void> {
  const config = loadConfig();
  const username = config.auth?.username;

  // Clear from keyring if username exists
  if (username) {
    await deleteToken(username);
  }

  // Clear from config
  delete config.auth;
  saveConfig(config);
}

/**
 * Get default project for new tasks.
 */
export function getDefaultProject(): string | null {
  const config = loadConfig();
  return config.defaults?.project ?? null;
}

/**
 * Set default project for new tasks.
 */
export function setDefaultProject(projectId: string | null): void {
  const config = loadConfig();

  if (projectId) {
    config.defaults = config.defaults ?? {};
    config.defaults.project = projectId;
  } else {
    delete config.defaults?.project;
    if (config.defaults && Object.keys(config.defaults).length === 0) {
      delete config.defaults;
    }
  }

  saveConfig(config);
}
