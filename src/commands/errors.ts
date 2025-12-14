/**
 * Error handling utilities for commands.
 */
import { printError } from "../output/index.js";
import { AuthError, ApiError, ClientError } from "../utils/errors.js";

/**
 * Wrap an async command action with error handling.
 */
export function handleError<T extends unknown[]>(
  fn: (...args: T) => Promise<void>
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await fn(...args);
    } catch (error) {
      if (error instanceof AuthError) {
        printError(error.message);
        process.exit(1);
      }

      if (error instanceof ApiError) {
        if (error.status === 401) {
          printError("Session expired. Run 'ticktick auth login' to re-authenticate.");
        } else {
          printError(`API error: ${error.message}`);
        }
        process.exit(1);
      }

      if (error instanceof ClientError) {
        printError(error.message);
        process.exit(1);
      }

      if (error instanceof Error) {
        if (error.message.includes("ECONNREFUSED") || error.message.includes("fetch failed")) {
          printError("Connection failed. Check your internet connection.");
        } else {
          printError(error.message);
        }
        process.exit(1);
      }

      printError("An unexpected error occurred");
      process.exit(1);
    }
  };
}
