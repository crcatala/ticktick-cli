/**
 * Authentication commands.
 */
import { Command } from "commander";
import { createInterface } from "readline";
import { login, getClient } from "../api/client.js";
import {
  getAuth,
  setAuth,
  clearAuth,
  getStorageType,
} from "../config/config.js";
import {
  printError,
  printSuccess,
  printWarning,
  printInfo,
  printJson,
  printKeyValue,
} from "../output/index.js";
import { AuthError, ApiError } from "../utils/errors.js";

/**
 * Prompt for input.
 */
async function prompt(message: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * Prompt for password with hidden input.
 * Uses raw mode to hide characters as they're typed.
 */
async function promptPassword(message: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(message);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    const onData = (char: string) => {
      const code = char.charCodeAt(0);

      // Handle Ctrl+C
      if (code === 3) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.exit(0);
      }

      // Handle Enter/Return
      if (code === 13 || code === 10) {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
        return;
      }

      // Handle Backspace/Delete
      if (code === 127 || code === 8) {
        if (password.length > 0) {
          password = password.slice(0, -1);
        }
        return;
      }

      // Add character to password (ignore control characters)
      if (code >= 32) {
        password += char;
      }
    };

    stdin.on('data', onData);
  });
}

/**
 * Generate TOTP code from secret.
 * Simple TOTP implementation for 2FA support.
 */
function generateTOTP(secret: string): string {
  // This is a simplified TOTP - in production use a library
  // For now, we'll accept manual TOTP input instead
  throw new Error(
    "Auto TOTP not implemented. Please provide the code manually via --totp-code."
  );
}

export function createAuthCommand(): Command {
  const auth = new Command("auth").description("Manage authentication");

  // login command
  auth
    .command("login")
    .description("Log in to TickTick")
    .option("-u, --username <email>", "TickTick username/email")
    .option("--totp-secret <secret>", "TOTP secret for 2FA (base32 encoded)")
    .option("--totp-code <code>", "TOTP code for 2FA")
    .option(
      "--use-config",
      "Store token in plaintext config instead of keyring (insecure)"
    )
    .option("-v, --verbose", "Show detailed debug output")
    .action(async (options) => {
      const verbose = options.verbose ?? false;

      try {
        let username = options.username;
        if (!username) {
          username = await prompt("Username/Email: ");
        }

        const password = await promptPassword("Password: ");

        if (verbose) {
          printInfo(`[debug] Username: ${username}`);
          printInfo(`[debug] Password length: ${password.length} chars`);
          printInfo(`[debug] Password empty: ${password.length === 0}`);
        }

        if (options.useConfig) {
          printWarning(
            "Using plaintext config storage. Token will be stored unencrypted."
          );
        }

        printInfo("Logging in to TickTick...");

        // Determine TOTP code if needed
        let totpCode = options.totpCode;
        if (options.totpSecret && !totpCode) {
          // Try to generate from secret
          try {
            totpCode = generateTOTP(options.totpSecret);
          } catch {
            printError("Could not generate TOTP. Please provide --totp-code.");
            process.exit(1);
          }
        }

        if (verbose) {
          printInfo(`[debug] TOTP code: ${totpCode ?? "(none)"}`);
        }

        // Attempt login
        const result = await login(username, password, totpCode, verbose);

        if (result.need2FA && !totpCode) {
          printError(
            "2FA is enabled. Provide --totp-code or --totp-secret."
          );
          process.exit(1);
        }

        if (!result.token) {
          printError("Login failed: No token received");
          process.exit(1);
        }

        if (verbose) {
          printInfo(`[debug] Using token length: ${result.token.length}`);
        }

        // Save credentials
        await setAuth(username, result.token, options.useConfig ?? false);

        // Try to get display name
        let displayName = username;
        try {
          const client = await getClient();
          const profile = await client.getProfile();
          displayName = profile.name || profile.username || username;
        } catch {
          // Profile fetch failed but login succeeded
        }

        printSuccess(`Logged in as ${displayName}`);
        const storageType = options.useConfig ? "config file" : "system keyring";
        printInfo(`Token stored in: ${storageType}`);
      } catch (error) {
        if (error instanceof AuthError) {
          printError(error.message);
        } else if (error instanceof ApiError) {
          if (error.status === 401) {
            printError("Invalid username or password");
          } else if (error.body.includes("2fa") || error.body.includes("totp")) {
            printError("2FA verification failed");
          } else {
            printError(`HTTP ${error.status}: ${error.body}`);
          }
        } else if (error instanceof Error) {
          printError(error.message);
        }
        process.exit(1);
      }
    });

  // logout command
  auth
    .command("logout")
    .description("Log out from TickTick")
    .action(async () => {
      const authData = await getAuth();
      if (!authData) {
        printInfo("Not logged in");
        return;
      }

      await clearAuth();
      printSuccess("Logged out successfully");
    });

  // status command
  auth
    .command("status")
    .description("Show authentication status and user info")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      const authData = await getAuth();
      const storageType = getStorageType();

      if (!authData) {
        if (options.json) {
          printJson({ authenticated: false });
        } else {
          printInfo("Not logged in. Run 'ticktick auth login' to log in.");
        }
        return;
      }

      try {
        const client = await getClient();
        const profile = await client.getProfile();

        if (options.json) {
          printJson({
            authenticated: true,
            username: authData.username,
            storage: storageType,
            profile,
          });
        } else {
          printSuccess(`Logged in as ${authData.username}`);
          printKeyValue(
            {
              Name: profile.name ?? "-",
              Email: profile.username ?? "-",
              "User ID": profile.id ?? "-",
              "Token Storage": storageType ?? "unknown",
            },
            ["Name", "Email", "User ID", "Token Storage"]
          );
        }
      } catch (error) {
        if (options.json) {
          printJson({
            authenticated: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        } else {
          printWarning("Token may be expired");
          printInfo("Run 'ticktick auth login' to re-authenticate.");
        }
      }
    });

  // whoami command (alias for status)
  auth
    .command("whoami")
    .description("Show current user (alias for status)")
    .option("--json", "Output as JSON")
    .action(async (options) => {
      // Delegate to status command
      const statusCmd = auth.commands.find((c) => c.name() === "status");
      if (statusCmd) {
        await statusCmd.parseAsync(["status", ...(options.json ? ["--json"] : [])], {
          from: "user",
        });
      }
    });

  return auth;
}
