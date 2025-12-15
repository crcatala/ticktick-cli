/**
 * Validation helpers for API responses.
 *
 * Provides configurable validation strategies:
 * - strict: throw on validation errors
 * - warn: log warnings, return partial data (drop invalid array items, strip invalid fields)
 * - off: skip validation entirely, return raw data
 */
import { z } from "zod/v4";

export type ValidationStrategy = "strict" | "warn" | "off";

export const DEFAULT_VALIDATION_STRATEGY: ValidationStrategy = "strict";

/**
 * Validation error with context about what failed.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.core.$ZodIssue[],
    public readonly entityType?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }

  /**
   * Format the error for user display.
   */
  formatForUser(): string {
    const issueLines = this.issues
      .slice(0, 5) // Limit to first 5 issues
      .map((issue) => {
        const path = issue.path.join(".");
        return `  - ${path ? `${path}: ` : ""}${issue.message}`;
      })
      .join("\n");

    const moreCount = this.issues.length - 5;
    const more = moreCount > 0 ? `\n  ... and ${moreCount} more issues` : "";

    return `${this.message}\n${issueLines}${more}`;
  }
}

/**
 * Log a validation warning to stderr.
 */
function logWarning(message: string, issues: z.core.$ZodIssue[], entityType?: string): void {
  const prefix = entityType ? `[${entityType}] ` : "";
  const issueCount = issues.length;
  const summary = issues
    .slice(0, 3)
    .map((i) => {
      const path = i.path.join(".");
      return path ? `${path}: ${i.message}` : i.message;
    })
    .join("; ");

  const more = issueCount > 3 ? ` (+${issueCount - 3} more)` : "";
  console.warn(`[warn] ${prefix}${message}: ${summary}${more}`);
}

/**
 * Validate a single object against a schema.
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @param strategy - Validation strategy
 * @param entityType - Optional entity type for error messages
 * @returns Validated data
 */
export function validateOne<T>(
  schema: z.ZodType<T>,
  data: unknown,
  strategy: ValidationStrategy,
  entityType?: string
): T {
  if (strategy === "off") {
    return data as T;
  }

  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  if (strategy === "strict") {
    throw new ValidationError(
      `${entityType ?? "Response"} validation failed`,
      result.error.issues,
      entityType
    );
  }

  // warn mode: log and return raw data
  // Note: We return raw data because stripping fields from a failed parse
  // could leave required fields missing. The caller expects T shape.
  logWarning("Validation failed, returning unvalidated data", result.error.issues, entityType);
  return data as T;
}

/**
 * Validate an array of objects, handling each item individually.
 *
 * In warn mode, invalid items are dropped and warnings are logged.
 * In strict mode, any invalid item causes an error.
 * In off mode, returns data as-is.
 *
 * @param schema - Zod schema for individual items
 * @param data - Array of data to validate
 * @param strategy - Validation strategy
 * @param entityType - Optional entity type for error messages
 * @returns Array of validated items
 */
export function validateArray<T>(
  schema: z.ZodType<T>,
  data: unknown,
  strategy: ValidationStrategy,
  entityType?: string
): T[] {
  if (strategy === "off") {
    return (data as T[]) ?? [];
  }

  if (!Array.isArray(data)) {
    const issue: z.core.$ZodIssue = {
      code: "invalid_type",
      expected: "array",
      path: [],
      message: `Expected array but got ${typeof data}`,
    };

    if (strategy === "strict") {
      throw new ValidationError(
        `${entityType ?? "Response"} expected array but got ${typeof data}`,
        [issue],
        entityType
      );
    }

    logWarning(`Expected array but got ${typeof data}, returning empty array`, [issue], entityType);
    return [];
  }

  if (strategy === "strict") {
    // In strict mode, validate all items and throw on first error
    const results: T[] = [];
    for (let i = 0; i < data.length; i++) {
      const result = schema.safeParse(data[i]);
      if (!result.success) {
        // Add index to error paths for context
        const issuesWithPath = result.error.issues.map((issue) => ({
          ...issue,
          path: [i, ...issue.path],
        }));
        throw new ValidationError(
          `${entityType ?? "Item"} validation failed at index ${i}`,
          issuesWithPath,
          entityType
        );
      }
      results.push(result.data);
    }
    return results;
  }

  // warn mode: validate each item, keep valid ones, log warnings for invalid
  const results: T[] = [];
  const failures: Array<{ index: number; issues: z.core.$ZodIssue[] }> = [];

  for (let i = 0; i < data.length; i++) {
    const result = schema.safeParse(data[i]);
    if (result.success) {
      results.push(result.data);
    } else {
      failures.push({ index: i, issues: result.error.issues });
    }
  }

  if (failures.length > 0) {
    const indices = failures
      .slice(0, 5)
      .map((f) => f.index)
      .join(", ");
    const more = failures.length > 5 ? ` (+${failures.length - 5} more)` : "";
    console.warn(
      `[warn] ${entityType ?? "Array"}: ${failures.length}/${data.length} items failed validation and were skipped (indices: ${indices}${more})`
    );
  }

  return results;
}
