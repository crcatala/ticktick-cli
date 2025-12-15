/**
 * Priority utilities for TickTick tasks.
 *
 * TickTick uses numeric priority values:
 * - 5: High
 * - 3: Medium
 * - 1: Low
 * - 0: None (default)
 */

/**
 * Map of priority names to their numeric values.
 */
export const PRIORITY_MAP: Record<string, number> = {
  high: 5,
  medium: 3,
  low: 1,
  none: 0,
};

/**
 * Parse a priority string to its numeric value.
 * Returns 0 (none) for unknown priority strings.
 *
 * @param name - Priority name (high, medium, low, none)
 * @returns Numeric priority value
 */
export function parsePriority(name: string): number {
  return PRIORITY_MAP[name.toLowerCase()] ?? 0;
}
