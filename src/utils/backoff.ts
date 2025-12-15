/**
 * Exponential backoff utility for retrying operations.
 *
 * Used by both the API client and integration tests.
 */

export interface BackoffOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Jitter factor 0-1 to randomize delay (default: 0.1) */
  jitter?: number;
}

const DEFAULT_OPTIONS: Required<BackoffOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: 0.1,
};

/**
 * Calculate delay for a given retry attempt using exponential backoff.
 *
 * @param attempt - Retry attempt number (0-indexed)
 * @param options - Backoff configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  options: BackoffOptions = {}
): number {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, opts.maxDelayMs);

  // Add jitter to prevent thundering herd
  const jitterRange = cappedDelay * opts.jitter;
  const jitterOffset = (Math.random() - 0.5) * 2 * jitterRange;

  return Math.max(0, cappedDelay + jitterOffset);
}

/**
 * Sleep for a specified duration.
 *
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Result of a retry operation.
 */
export type RetryResult<T> =
  | { success: true; data: T; attempts: number }
  | { success: false; error: Error; attempts: number };

/**
 * Retry an async operation with exponential backoff.
 *
 * @param fn - Async function to retry
 * @param shouldRetry - Function to determine if error is retryable
 * @param options - Backoff configuration
 * @returns Result with success/failure and attempt count
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: Error) => boolean,
  options: BackoffOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error = new Error("No attempts made");

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const data = await fn();
      return { success: true, data, attempts: attempt + 1 };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if this error type shouldn't be retried
      if (!shouldRetry(lastError)) {
        return { success: false, error: lastError, attempts: attempt + 1 };
      }

      // Don't sleep after the last attempt
      if (attempt < opts.maxRetries) {
        const delay = calculateBackoffDelay(attempt, opts);
        await sleep(delay);
      }
    }
  }

  return { success: false, error: lastError, attempts: opts.maxRetries + 1 };
}

/**
 * Check if an error is a rate limit error (HTTP 429).
 */
export function isRateLimitError(error: Error): boolean {
  return error.message.includes("429") || error.message.includes("Rate limit");
}
