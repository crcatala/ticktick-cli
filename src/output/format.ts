/**
 * Output formatting utilities.
 */
import { colors, pc } from "./colors.js";

/**
 * Print an error message to stderr.
 */
export function printError(message: string): void {
  console.error(colors.error(`Error: ${message}`));
}

/**
 * Print a success message.
 */
export function printSuccess(message: string): void {
  console.log(colors.success(`✓ ${message}`));
}

/**
 * Print a warning message.
 */
export function printWarning(message: string): void {
  console.log(colors.warning(`Warning: ${message}`));
}

/**
 * Print an info message.
 */
export function printInfo(message: string): void {
  console.log(message);
}

/**
 * Print data as JSON.
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Print key-value pairs in a formatted way.
 */
export function printKeyValue(
  data: Record<string, string | number | null | undefined>,
  order?: string[]
): void {
  const keys = order ?? Object.keys(data);
  const maxKeyLength = Math.max(...keys.map((k) => k.length));

  for (const key of keys) {
    const value = data[key] ?? "-";
    const paddedKey = key.padEnd(maxKeyLength);
    console.log(`${pc.dim(paddedKey)}  ${value}`);
  }
}

/**
 * Truncate an ID for display.
 */
export function truncateId(id: string | null | undefined, length = 8): string {
  if (!id) return "-";
  return id.length > length ? id.slice(0, length) : id;
}

/**
 * Format priority for display.
 */
export function formatPriority(priority: number | null | undefined): string {
  switch (priority) {
    case 5:
      return colors.error("High");
    case 3:
      return colors.warning("Medium");
    case 1:
      return colors.info("Low");
    case 0:
    default:
      return pc.dim("None");
  }
}

/**
 * Print checklist items with checkboxes.
 */
export function printChecklistItems(
  items: Array<{
    id?: string | null;
    title?: string | null;
    status?: number | null;
    sortOrder?: number | null;
  }>
): void {
  const sorted = [...items].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  for (const item of sorted) {
    const checkbox = item.status === 1 ? "☑" : "☐";
    const shortId = item.id?.slice(0, 8) ?? "?";
    console.log(`  ${checkbox} [${shortId}] ${item.title ?? "(untitled)"}`);
  }
}
