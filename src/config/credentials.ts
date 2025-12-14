/**
 * Secure credential storage using system keyring.
 *
 * Uses keytar for cross-platform keyring access:
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service (libsecret)
 */
import keytar from "keytar";

const SERVICE_NAME = "ticktick-cli";

/**
 * Get token from system keyring.
 */
export async function getToken(username: string): Promise<string | null> {
  try {
    return await keytar.getPassword(SERVICE_NAME, username);
  } catch {
    return null;
  }
}

/**
 * Set token in system keyring.
 */
export async function setToken(
  username: string,
  token: string
): Promise<void> {
  await keytar.setPassword(SERVICE_NAME, username, token);
}

/**
 * Delete token from system keyring.
 */
export async function deleteToken(username: string): Promise<void> {
  try {
    await keytar.deletePassword(SERVICE_NAME, username);
  } catch {
    // Ignore if token doesn't exist
  }
}
