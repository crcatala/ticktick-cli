/**
 * Secure credential storage using system keyring.
 *
 * Uses keytar for cross-platform keyring access:
 * - macOS: Keychain
 * - Windows: Credential Manager
 * - Linux: Secret Service (libsecret)
 *
 * Note: keytar is loaded lazily to avoid requiring libsecret
 * when using plaintext config storage (--use-config).
 */

const SERVICE_NAME = "ticktick-cli";

/**
 * Lazy-load keytar only when needed.
 * This allows --use-config to work without keytar dependencies.
 */
async function getKeytar() {
  try {
    const keytar = await import("keytar");
    return keytar.default;
  } catch {
    throw new Error(
      "Failed to load keytar. On Linux, install libsecret-1-dev: sudo apt-get install libsecret-1-dev\n" +
      "Or use --use-config flag to store credentials in plaintext config file."
    );
  }
}

/**
 * Get token from system keyring.
 */
export async function getToken(username: string): Promise<string | null> {
  try {
    const keytar = await getKeytar();
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
  const keytar = await getKeytar();
  await keytar.setPassword(SERVICE_NAME, username, token);
}

/**
 * Delete token from system keyring.
 */
export async function deleteToken(username: string): Promise<void> {
  try {
    const keytar = await getKeytar();
    await keytar.deletePassword(SERVICE_NAME, username);
  } catch {
    // Ignore if token doesn't exist
  }
}
