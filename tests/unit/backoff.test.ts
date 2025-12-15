/**
 * Unit tests for the backoff utility.
 */
import { describe, expect, it, mock, beforeEach } from "bun:test";
import {
  calculateBackoffDelay,
  sleep,
  withRetry,
  isRateLimitError,
} from "../../src/utils/backoff.js";

describe("calculateBackoffDelay", () => {
  it("returns base delay for first attempt", () => {
    // With jitter disabled
    const delay = calculateBackoffDelay(0, { jitter: 0 });
    expect(delay).toBe(1000);
  });

  it("doubles delay for each attempt", () => {
    const delay0 = calculateBackoffDelay(0, { jitter: 0 });
    const delay1 = calculateBackoffDelay(1, { jitter: 0 });
    const delay2 = calculateBackoffDelay(2, { jitter: 0 });

    expect(delay0).toBe(1000);
    expect(delay1).toBe(2000);
    expect(delay2).toBe(4000);
  });

  it("respects custom base delay", () => {
    const delay = calculateBackoffDelay(0, { baseDelayMs: 500, jitter: 0 });
    expect(delay).toBe(500);
  });

  it("caps delay at maxDelayMs", () => {
    const delay = calculateBackoffDelay(10, {
      baseDelayMs: 1000,
      maxDelayMs: 5000,
      jitter: 0,
    });
    expect(delay).toBe(5000);
  });

  it("applies jitter within expected range", () => {
    const baseDelay = 1000;
    const jitter = 0.1;
    const delays: number[] = [];

    // Run multiple times to test jitter distribution
    for (let i = 0; i < 100; i++) {
      delays.push(calculateBackoffDelay(0, { baseDelayMs: baseDelay, jitter }));
    }

    const min = Math.min(...delays);
    const max = Math.max(...delays);

    // With 10% jitter, values should be between 900 and 1100
    expect(min).toBeGreaterThanOrEqual(baseDelay * (1 - jitter));
    expect(max).toBeLessThanOrEqual(baseDelay * (1 + jitter));
    // Should have some variation
    expect(max - min).toBeGreaterThan(0);
  });

  it("never returns negative values", () => {
    const delay = calculateBackoffDelay(0, {
      baseDelayMs: 10,
      jitter: 1.0, // 100% jitter - could theoretically go negative
    });
    expect(delay).toBeGreaterThanOrEqual(0);
  });
});

describe("sleep", () => {
  it("waits for the specified duration", async () => {
    const start = performance.now();
    await sleep(100);
    const elapsed = performance.now() - start;

    // Allow some tolerance for timing
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(200);
  });
});

describe("withRetry", () => {
  it("returns success on first attempt if no error", async () => {
    const fn = mock(() => Promise.resolve("success"));

    const result = await withRetry(fn, () => true);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("success");
    }
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error", async () => {
    let attempts = 0;
    const fn = mock(() => {
      attempts++;
      if (attempts < 3) {
        return Promise.reject(new Error("retryable"));
      }
      return Promise.resolve("success");
    });

    const result = await withRetry(fn, () => true, {
      baseDelayMs: 10,
      jitter: 0,
    });

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("returns failure immediately for non-retryable error", async () => {
    const fn = mock(() => Promise.reject(new Error("fatal")));
    const shouldRetry = mock((error: Error) => error.message !== "fatal");

    const result = await withRetry(fn, shouldRetry, {
      baseDelayMs: 10,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("fatal");
    }
    expect(result.attempts).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("respects maxRetries limit", async () => {
    const fn = mock(() => Promise.reject(new Error("always fails")));

    const result = await withRetry(fn, () => true, {
      maxRetries: 2,
      baseDelayMs: 10,
      jitter: 0,
    });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3); // Initial + 2 retries
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("handles non-Error throws", async () => {
    const fn = mock(() => Promise.reject("string error"));

    const result = await withRetry(fn, () => false);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toBe("string error");
    }
  });
});

describe("isRateLimitError", () => {
  it("returns true for 429 errors", () => {
    expect(isRateLimitError(new Error("HTTP 429: Too Many Requests"))).toBe(true);
    expect(isRateLimitError(new Error("429"))).toBe(true);
  });

  it("returns true for rate limit message", () => {
    expect(isRateLimitError(new Error("Rate limit exceeded"))).toBe(true);
  });

  it("returns false for other errors", () => {
    expect(isRateLimitError(new Error("Not found"))).toBe(false);
    expect(isRateLimitError(new Error("401 Unauthorized"))).toBe(false);
  });
});
