/**
 * Date formatting utilities.
 */

/**
 * Format a date string or timestamp for display.
 */
export function formatDate(date: string | number | null | undefined): string {
  if (!date) return "-";

  const d = typeof date === "number" ? new Date(date) : new Date(date);
  if (isNaN(d.getTime())) return "-";

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Format a date as ISO date string (YYYY-MM-DD).
 */
export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Parse a date string that could be relative (today, tomorrow, +3d) or absolute.
 */
export function parseDate(input: string): Date | null {
  const lower = input.toLowerCase().trim();

  // Relative dates
  if (lower === "today") {
    return new Date();
  }
  if (lower === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }

  // +Nd format (e.g., +3d for 3 days from now)
  const relativeMatch = lower.match(/^\+(\d+)d$/);
  if (relativeMatch) {
    const days = parseInt(relativeMatch[1], 10);
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  // Try parsing as ISO date
  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}
