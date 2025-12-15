/**
 * Repeat/recurrence utilities for TickTick tasks.
 * 
 * Converts human-readable repeat patterns to RRULE format (RFC 5545).
 * 
 * Supported patterns:
 * - Simple: "daily", "weekly", "monthly", "yearly"
 * - Weekly with days: "weekly:mon,wed,fri"
 * - With interval: "daily:3" (every 3 days), "weekly:2" (every 2 weeks)
 * - Monthly by day of month: "monthly:15" (on the 15th)
 * - Monthly by weekday: "monthly:first-mon", "monthly:last-fri"
 * 
 * Note: For monthly, single numbers 1-31 are interpreted as day of month,
 * not interval. Use "monthly" for simple monthly repeat.
 * 
 * End conditions (separate options):
 * - Until date: --repeat-until 2026-01-24
 * - Count: --repeat-count 10
 */

/**
 * Standard value for repeatFrom field.
 * Observed from TickTick web app - appears to be constant across all repeat types.
 */
export const REPEAT_FROM_DEFAULT = "2" as const;

/** Day name to RRULE abbreviation mapping */
const DAY_MAP: Record<string, string> = {
  sun: "SU",
  sunday: "SU",
  mon: "MO",
  monday: "MO",
  tue: "TU",
  tuesday: "TU",
  wed: "WE",
  wednesday: "WE",
  thu: "TH",
  thursday: "TH",
  fri: "FR",
  friday: "FR",
  sat: "SA",
  saturday: "SA",
};

/** Ordinal to RRULE prefix mapping */
const ORDINAL_MAP: Record<string, string> = {
  first: "1",
  second: "2",
  third: "3",
  fourth: "4",
  last: "-1",
  "1st": "1",
  "2nd": "2",
  "3rd": "3",
  "4th": "4",
};

/** RRULE abbreviation to human-readable day name */
const RRULE_DAY_TO_NAME: Record<string, string> = {
  SU: "Sun",
  MO: "Mon",
  TU: "Tue",
  WE: "Wed",
  TH: "Thu",
  FR: "Fri",
  SA: "Sat",
};

/** Frequency to human-readable name */
const FREQ_TO_NAME: Record<string, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export interface RepeatOptions {
  /** Until date in YYYY-MM-DD format */
  until?: string;
  /** Number of occurrences */
  count?: number;
}

export interface ParsedRepeat {
  /** RRULE string without the "RRULE:" prefix */
  rrule: string;
  /** Full repeatFlag value with "RRULE:" prefix */
  repeatFlag: string;
}

/**
 * Parse a human-readable repeat pattern into RRULE format.
 * 
 * @param pattern - Human-readable pattern (e.g., "daily", "weekly:mon,wed,fri")
 * @param options - End conditions (until date or count)
 * @returns ParsedRepeat with rrule and repeatFlag
 * @throws Error if pattern is invalid
 * 
 * @example
 * parseRepeatPattern("daily")
 * // => { rrule: "FREQ=DAILY;INTERVAL=1", repeatFlag: "RRULE:FREQ=DAILY;INTERVAL=1" }
 * 
 * @example
 * parseRepeatPattern("weekly:mon,wed,fri", { count: 10 })
 * // => { rrule: "FREQ=WEEKLY;INTERVAL=1;COUNT=10;BYDAY=MO,WE,FR", ... }
 */
export function parseRepeatPattern(
  pattern: string,
  options: RepeatOptions = {}
): ParsedRepeat {
  const normalized = pattern.toLowerCase().trim();
  
  // Split pattern into base and modifier (e.g., "weekly:mon,wed,fri" -> ["weekly", "mon,wed,fri"])
  // Handle "weekly:2:mon,fri" by only splitting on first colon
  const colonIndex = normalized.indexOf(":");
  const base = colonIndex === -1 ? normalized : normalized.slice(0, colonIndex);
  const modifier = colonIndex === -1 ? undefined : normalized.slice(colonIndex + 1).trim();
  
  let rruleParts: string[] = [];
  
  switch (base) {
    case "daily":
      rruleParts = buildDailyRrule(modifier);
      break;
    case "weekly":
      rruleParts = buildWeeklyRrule(modifier);
      break;
    case "monthly":
      rruleParts = buildMonthlyRrule(modifier);
      break;
    case "yearly":
      rruleParts = buildYearlyRrule(modifier);
      break;
    default:
      throw new Error(
        `Invalid repeat pattern: "${pattern}". ` +
        `Use: daily, weekly, monthly, yearly, or weekly:mon,wed,fri`
      );
  }
  
  // Add end conditions
  if (options.until) {
    const untilDate = formatUntilDate(options.until);
    rruleParts.push(`UNTIL=${untilDate}`);
  } else if (options.count !== undefined) {
    if (options.count < 1) {
      throw new Error("Repeat count must be at least 1");
    }
    rruleParts.push(`COUNT=${options.count}`);
  }
  
  const rrule = rruleParts.join(";");
  return {
    rrule,
    repeatFlag: `RRULE:${rrule}`,
  };
}

/**
 * Build RRULE parts for daily repeat.
 */
function buildDailyRrule(modifier?: string): string[] {
  const interval = parseInterval(modifier) || 1;
  return [`FREQ=DAILY`, `INTERVAL=${interval}`];
}

/**
 * Build RRULE parts for weekly repeat.
 * 
 * Modifier can be:
 * - undefined: every week
 * - "2": every 2 weeks
 * - "mon,wed,fri": specific days
 * - "2:mon,wed,fri": every 2 weeks on specific days
 */
function buildWeeklyRrule(modifier?: string): string[] {
  const parts = [`FREQ=WEEKLY`];
  
  if (!modifier) {
    parts.push(`INTERVAL=1`);
    return parts;
  }
  
  // Check if modifier contains days
  const dayPattern = /[a-z]{2,}/i;
  
  if (dayPattern.test(modifier)) {
    // Parse interval and days
    // Format: "2:mon,wed,fri" or "mon,wed,fri"
    const intervalMatch = modifier.match(/^(\d+):/);
    const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;
    const daysStr = intervalMatch ? modifier.slice(intervalMatch[0].length) : modifier;
    
    parts.push(`INTERVAL=${interval}`);
    
    const days = parseDays(daysStr);
    if (days.length > 0) {
      parts.push(`BYDAY=${days.join(",")}`);
    }
  } else {
    // Just an interval number
    const interval = parseInt(modifier, 10);
    if (isNaN(interval) || interval < 1) {
      throw new Error(`Invalid weekly interval: "${modifier}"`);
    }
    parts.push(`INTERVAL=${interval}`);
  }
  
  return parts;
}

/**
 * Build RRULE parts for monthly repeat.
 * 
 * Modifier can be:
 * - undefined: every month
 * - "15": on the 15th of each month (numbers 1-31 = day of month)
 * - "first-mon": first Monday of each month
 * - "last-fri": last Friday of each month
 * 
 * Note: Single numbers are interpreted as day of month, not interval.
 * For simple monthly repeat, use "monthly" without modifier.
 */
function buildMonthlyRrule(modifier?: string): string[] {
  const parts = [`FREQ=MONTHLY`];
  
  if (!modifier) {
    parts.push(`INTERVAL=1`);
    return parts;
  }
  
  // Check for ordinal-day pattern (e.g., "first-mon", "last-fri")
  const ordinalDayMatch = modifier.match(/^(first|second|third|fourth|last|1st|2nd|3rd|4th)-([a-z]+)$/i);
  if (ordinalDayMatch) {
    const ordinal = ORDINAL_MAP[ordinalDayMatch[1].toLowerCase()];
    const day = DAY_MAP[ordinalDayMatch[2].toLowerCase()];
    
    if (!ordinal) {
      throw new Error(`Invalid ordinal: "${ordinalDayMatch[1]}"`);
    }
    if (!day) {
      throw new Error(`Invalid day: "${ordinalDayMatch[2]}"`);
    }
    
    parts.push(`INTERVAL=1`);
    parts.push(`BYDAY=${ordinal}${day}`);
    return parts;
  }
  
  // Check for day of month (1-31)
  const dayOfMonth = parseInt(modifier, 10);
  if (!isNaN(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 31) {
    parts.push(`INTERVAL=1`);
    parts.push(`BYMONTHDAY=${dayOfMonth}`);
    return parts;
  }
  
  // Just an interval
  const interval = parseInt(modifier, 10);
  if (!isNaN(interval) && interval >= 1) {
    parts.push(`INTERVAL=${interval}`);
    return parts;
  }
  
  throw new Error(
    `Invalid monthly modifier: "${modifier}". ` +
    `Use: a number (interval or day of month), or ordinal-day like "first-mon"`
  );
}

/**
 * Build RRULE parts for yearly repeat.
 */
function buildYearlyRrule(modifier?: string): string[] {
  const interval = parseInterval(modifier) || 1;
  return [`FREQ=YEARLY`, `INTERVAL=${interval}`];
}

/**
 * Parse an interval string to number.
 */
function parseInterval(modifier?: string): number | undefined {
  if (!modifier) return undefined;
  const interval = parseInt(modifier, 10);
  if (isNaN(interval) || interval < 1) {
    throw new Error(`Invalid interval: "${modifier}"`);
  }
  return interval;
}

/**
 * Parse comma-separated day names into RRULE day abbreviations.
 */
function parseDays(daysStr: string): string[] {
  const dayNames = daysStr.split(",").map(d => d.trim().toLowerCase());
  const rruleDays: string[] = [];
  
  for (const dayName of dayNames) {
    const rruleDay = DAY_MAP[dayName];
    if (!rruleDay) {
      throw new Error(
        `Invalid day: "${dayName}". ` +
        `Use: sun, mon, tue, wed, thu, fri, sat`
      );
    }
    rruleDays.push(rruleDay);
  }
  
  return rruleDays;
}

/**
 * Format a date string to RRULE UNTIL format (YYYYMMDD).
 */
function formatUntilDate(dateStr: string): string {
  // Remove any dashes and validate format
  const cleaned = dateStr.replace(/-/g, "");
  
  // Validate it looks like a date (8 digits)
  if (!/^\d{8}$/.test(cleaned)) {
    throw new Error(
      `Invalid until date: "${dateStr}". Use YYYY-MM-DD format.`
    );
  }
  
  // Basic sanity check on date values
  const year = parseInt(cleaned.slice(0, 4), 10);
  const month = parseInt(cleaned.slice(4, 6), 10);
  const day = parseInt(cleaned.slice(6, 8), 10);
  
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(
      `Invalid until date: "${dateStr}". Date values out of range.`
    );
  }
  
  return cleaned;
}

/**
 * Format a repeatFlag (RRULE) to human-readable string.
 * 
 * @param repeatFlag - RRULE string (e.g., "RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR")
 * @returns Human-readable string (e.g., "Weekly on Mon, Wed, Fri")
 * 
 * @example
 * formatRepeatFlag("RRULE:FREQ=DAILY;INTERVAL=1")
 * // => "Daily"
 * 
 * @example
 * formatRepeatFlag("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR")
 * // => "Every 2 weeks on Mon, Fri"
 */
export function formatRepeatFlag(repeatFlag: string | null | undefined): string | null {
  if (!repeatFlag) return null;
  
  // Remove "RRULE:" prefix if present
  const rrule = repeatFlag.replace(/^RRULE:/i, "");
  
  // Parse RRULE parts into key-value pairs
  const parts: Record<string, string> = {};
  for (const part of rrule.split(";")) {
    const [key, value] = part.split("=");
    if (key && value) {
      parts[key.toUpperCase()] = value;
    }
  }
  
  const freq = parts.FREQ;
  if (!freq) return repeatFlag; // Return original if can't parse
  
  const interval = parseInt(parts.INTERVAL || "1", 10);
  const byDay = parts.BYDAY;
  const byMonthDay = parts.BYMONTHDAY;
  const count = parts.COUNT;
  const until = parts.UNTIL;
  
  // Build human-readable string
  let result: string;
  
  // Frequency with interval
  if (interval === 1) {
    result = FREQ_TO_NAME[freq] || freq;
  } else {
    const freqWord = freq === "DAILY" ? "days" :
                     freq === "WEEKLY" ? "weeks" :
                     freq === "MONTHLY" ? "months" :
                     freq === "YEARLY" ? "years" : freq.toLowerCase();
    result = `Every ${interval} ${freqWord}`;
  }
  
  // Add day specification
  if (byDay) {
    const days = formatByDay(byDay);
    result += ` on ${days}`;
  } else if (byMonthDay) {
    result += ` on day ${byMonthDay}`;
  }
  
  // Add end condition
  if (count) {
    result += ` (${count} times)`;
  } else if (until) {
    result += ` (until ${formatUntilForDisplay(until)})`;
  }
  
  return result;
}

/**
 * Format BYDAY value for display.
 * 
 * @param byDay - RRULE BYDAY value (e.g., "MO,WE,FR" or "1MO" or "-1FR")
 */
function formatByDay(byDay: string): string {
  const days = byDay.split(",");
  const formatted: string[] = [];
  
  for (const day of days) {
    // Check for ordinal prefix (e.g., "1MO", "-1FR")
    const ordinalMatch = day.match(/^(-?\d+)([A-Z]{2})$/);
    if (ordinalMatch) {
      const ordinal = ordinalMatch[1];
      const dayAbbr = ordinalMatch[2];
      const dayName = RRULE_DAY_TO_NAME[dayAbbr] || dayAbbr;
      
      const ordinalName = ordinal === "1" ? "first" :
                          ordinal === "2" ? "second" :
                          ordinal === "3" ? "third" :
                          ordinal === "4" ? "fourth" :
                          ordinal === "-1" ? "last" : `#${ordinal}`;
      formatted.push(`${ordinalName} ${dayName}`);
    } else {
      const dayName = RRULE_DAY_TO_NAME[day] || day;
      formatted.push(dayName);
    }
  }
  
  return formatted.join(", ");
}

/**
 * Format UNTIL date for display.
 */
function formatUntilForDisplay(until: string): string {
  // UNTIL is in format YYYYMMDD or YYYYMMDDTHHMMSSZ
  const dateStr = until.slice(0, 8);
  if (dateStr.length === 8) {
    const year = dateStr.slice(0, 4);
    const month = dateStr.slice(4, 6);
    const day = dateStr.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
  return until;
}

/**
 * Validate that a pattern string is a valid repeat pattern.
 * 
 * @param pattern - Pattern to validate
 * @returns true if valid, false otherwise
 */
export function isValidRepeatPattern(pattern: string): boolean {
  try {
    parseRepeatPattern(pattern);
    return true;
  } catch {
    return false;
  }
}
