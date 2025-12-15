/**
 * Shared test utilities.
 *
 * Common helpers used across multiple test files.
 */

/**
 * Strip ANSI escape codes from a string.
 * Useful for testing console output that includes color codes.
 *
 * @param str - String potentially containing ANSI codes
 * @returns String with all ANSI escape codes removed
 */
export const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");
