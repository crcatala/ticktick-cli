/**
 * Reminder parsing and formatting utilities.
 *
 * TickTick uses ISO 8601 duration format with a TRIGGER: prefix for reminders.
 * Reminders are specified as offsets from the task's start/due time.
 *
 * Examples:
 * - TRIGGER:PT0S = on time (0 seconds)
 * - TRIGGER:-PT15M = 15 minutes before
 * - TRIGGER:-PT60M = 1 hour before
 * - TRIGGER:-PT1440M = 1 day before (24 hours)
 */

import type { Reminder } from "../api/types.js";

/**
 * Generate a MongoDB ObjectId-style ID for a reminder.
 * Same format used by TickTick API (24-char hex string).
 *
 * Note: This is a best-effort client-side implementation using cryptographically
 * secure random values. The TickTick API may replace these IDs with server-generated
 * ones, but this format matches the expected 24-character hex structure.
 */
function generateReminderId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");

  const randomBytes = new Uint8Array(5);
  crypto.getRandomValues(randomBytes);
  const random = Array.from(randomBytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  const counterBytes = new Uint8Array(3);
  crypto.getRandomValues(counterBytes);
  const counter = Array.from(counterBytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");

  return timestamp + random + counter;
}

/**
 * Parse a reminder time string into ISO 8601 duration format with TRIGGER: prefix.
 *
 * Supported formats:
 * - "on-time" or "0" = TRIGGER:PT0S (reminder at task time)
 * - "15m" = TRIGGER:-PT15M (15 minutes before)
 * - "1h" = TRIGGER:-PT60M (1 hour before)
 * - "2h30m" = TRIGGER:-PT150M (2 hours 30 minutes before)
 * - "1d" = TRIGGER:-PT1440M (1 day before)
 * - "2d" = TRIGGER:-PT2880M (2 days before)
 *
 * @param input - User-provided time string
 * @returns ISO 8601 duration string with TRIGGER: prefix, or null if invalid
 */
export function parseReminderTime(input: string): string | null {
  const lower = input.toLowerCase().trim();

  // On-time reminder
  if (lower === "on-time" || lower === "ontime" || lower === "0") {
    return "TRIGGER:PT0S";
  }

  // Parse relative time format: XdXhXm (days, hours, minutes)
  let totalMinutes = 0;

  // Match days (e.g., "1d")
  const daysMatch = lower.match(/(\d+)d/);
  if (daysMatch) {
    totalMinutes += parseInt(daysMatch[1], 10) * 24 * 60;
  }

  // Match hours (e.g., "1h")
  const hoursMatch = lower.match(/(\d+)h/);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
  }

  // Match minutes (e.g., "15m")
  const minutesMatch = lower.match(/(\d+)m/);
  if (minutesMatch) {
    totalMinutes += parseInt(minutesMatch[1], 10);
  }

  // If we parsed any time component, return the trigger
  if (totalMinutes > 0) {
    return `TRIGGER:-PT${totalMinutes}M`;
  }

  // Invalid format
  return null;
}

/**
 * Create a reminder object with a generated ID and parsed trigger.
 *
 * @param timeStr - User-provided time string (e.g., "15m", "1h", "on-time")
 * @returns Reminder object, or null if timeStr is invalid
 */
export function createReminder(timeStr: string): Reminder | null {
  const trigger = parseReminderTime(timeStr);
  if (!trigger) {
    return null;
  }

  return {
    id: generateReminderId(),
    trigger,
  };
}

/**
 * Format a reminder trigger for display.
 *
 * @param trigger - ISO 8601 duration string with TRIGGER: prefix
 * @returns Human-readable string
 */
export function formatReminderTrigger(trigger: string | null | undefined): string {
  if (!trigger) return "-";

  // Remove TRIGGER: prefix
  const duration = trigger.replace(/^TRIGGER:/, "");

  // On-time
  if (duration === "PT0S") {
    return "On time";
  }

  // Parse negative duration (e.g., -PT15M, -PT60M, -PT1440M)
  const match = duration.match(/^-PT(\d+)M$/);
  if (match) {
    const totalMinutes = parseInt(match[1], 10);

    // Convert to days, hours, minutes
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    return parts.length > 0 ? `${parts.join(" ")} before` : "On time";
  }

  // Unknown format, return as-is
  return trigger;
}
