/**
 * Tests for repeat/recurrence utilities.
 */
import { describe, it, expect } from "bun:test";
import {
  parseRepeatPattern,
  formatRepeatFlag,
  isValidRepeatPattern,
} from "../repeat.js";

describe("parseRepeatPattern", () => {
  describe("daily patterns", () => {
    it("parses simple daily", () => {
      const result = parseRepeatPattern("daily");
      expect(result.repeatFlag).toBe("RRULE:FREQ=DAILY;INTERVAL=1");
    });

    it("parses daily with interval", () => {
      const result = parseRepeatPattern("daily:3");
      expect(result.repeatFlag).toBe("RRULE:FREQ=DAILY;INTERVAL=3");
    });

    it("handles case insensitivity", () => {
      const result = parseRepeatPattern("DAILY");
      expect(result.repeatFlag).toBe("RRULE:FREQ=DAILY;INTERVAL=1");
    });
  });

  describe("weekly patterns", () => {
    it("parses simple weekly", () => {
      const result = parseRepeatPattern("weekly");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1");
    });

    it("parses weekly with interval", () => {
      const result = parseRepeatPattern("weekly:2");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2");
    });

    it("parses weekly with single day", () => {
      const result = parseRepeatPattern("weekly:mon");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO");
    });

    it("parses weekly with multiple days", () => {
      const result = parseRepeatPattern("weekly:mon,wed,fri");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
    });

    it("parses weekly with interval and days", () => {
      const result = parseRepeatPattern("weekly:2:mon,fri");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,FR");
    });

    it("parses biweekly shorthand", () => {
      const result = parseRepeatPattern("weekly:2");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=2");
    });

    it("accepts full day names", () => {
      const result = parseRepeatPattern("weekly:monday,wednesday,friday");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
    });

    it("accepts mixed day name formats", () => {
      const result = parseRepeatPattern("weekly:mon,wednesday,fri");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR");
    });

    it("handles all days of week", () => {
      const result = parseRepeatPattern("weekly:sun,mon,tue,wed,thu,fri,sat");
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=SU,MO,TU,WE,TH,FR,SA");
    });
  });

  describe("monthly patterns", () => {
    it("parses simple monthly", () => {
      const result = parseRepeatPattern("monthly");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1");
    });

    it("parses monthly with day number as day of month (not interval)", () => {
      // Note: single numbers are interpreted as day of month, not interval
      // Use monthly for simple monthly repeat
      const result = parseRepeatPattern("monthly:3");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=3");
    });

    it("parses monthly on specific day of month", () => {
      const result = parseRepeatPattern("monthly:15");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15");
    });

    it("parses first day of month", () => {
      const result = parseRepeatPattern("monthly:1");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=1");
    });

    it("parses last day of month (31)", () => {
      const result = parseRepeatPattern("monthly:31");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=31");
    });

    it("parses first-monday pattern", () => {
      const result = parseRepeatPattern("monthly:first-mon");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=1MO");
    });

    it("parses last-friday pattern", () => {
      const result = parseRepeatPattern("monthly:last-fri");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=-1FR");
    });

    it("parses second-tuesday pattern", () => {
      const result = parseRepeatPattern("monthly:second-tue");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=2TU");
    });

    it("parses third-wednesday pattern", () => {
      const result = parseRepeatPattern("monthly:third-wed");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=3WE");
    });

    it("parses fourth-thursday pattern", () => {
      const result = parseRepeatPattern("monthly:fourth-thu");
      expect(result.repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=4TH");
    });

    it("accepts 1st, 2nd, 3rd, 4th ordinals", () => {
      expect(parseRepeatPattern("monthly:1st-mon").repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=1MO");
      expect(parseRepeatPattern("monthly:2nd-tue").repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=2TU");
      expect(parseRepeatPattern("monthly:3rd-wed").repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=3WE");
      expect(parseRepeatPattern("monthly:4th-thu").repeatFlag).toBe("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=4TH");
    });
  });

  describe("yearly patterns", () => {
    it("parses simple yearly", () => {
      const result = parseRepeatPattern("yearly");
      expect(result.repeatFlag).toBe("RRULE:FREQ=YEARLY;INTERVAL=1");
    });

    it("parses yearly with interval", () => {
      const result = parseRepeatPattern("yearly:2");
      expect(result.repeatFlag).toBe("RRULE:FREQ=YEARLY;INTERVAL=2");
    });
  });

  describe("end conditions", () => {
    it("adds UNTIL date", () => {
      const result = parseRepeatPattern("weekly:mon", { until: "2026-01-24" });
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;UNTIL=20260124");
    });

    it("adds COUNT", () => {
      const result = parseRepeatPattern("weekly:mon", { count: 10 });
      expect(result.repeatFlag).toBe("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO;COUNT=10");
    });

    it("prefers until over count when both provided", () => {
      const result = parseRepeatPattern("daily", { until: "2026-12-31", count: 10 });
      expect(result.repeatFlag).toBe("RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20261231");
      expect(result.repeatFlag).not.toContain("COUNT");
    });

    it("handles UNTIL with dashes", () => {
      const result = parseRepeatPattern("daily", { until: "2026-01-15" });
      expect(result.repeatFlag).toContain("UNTIL=20260115");
    });
  });

  describe("error handling", () => {
    it("throws on invalid base pattern", () => {
      expect(() => parseRepeatPattern("hourly")).toThrow(/Invalid repeat pattern/);
    });

    it("throws on invalid day name", () => {
      expect(() => parseRepeatPattern("weekly:xyz")).toThrow(/Invalid day/);
    });

    it("throws on invalid interval", () => {
      expect(() => parseRepeatPattern("daily:abc")).toThrow(/Invalid interval/);
    });

    it("throws on invalid until date format", () => {
      expect(() => parseRepeatPattern("daily", { until: "not-a-date" })).toThrow(/Invalid until date/);
    });

    it("throws on out-of-range until date", () => {
      expect(() => parseRepeatPattern("daily", { until: "2024-99-99" })).toThrow(/out of range/);
      expect(() => parseRepeatPattern("daily", { until: "1999-01-01" })).toThrow(/out of range/);
    });

    it("throws on count less than 1", () => {
      expect(() => parseRepeatPattern("daily", { count: 0 })).toThrow(/at least 1/);
    });

    it("throws on negative count", () => {
      expect(() => parseRepeatPattern("daily", { count: -5 })).toThrow(/at least 1/);
    });

    it("throws on invalid monthly modifier", () => {
      expect(() => parseRepeatPattern("monthly:invalid")).toThrow(/Invalid monthly modifier/);
    });

    it("throws on invalid ordinal-day pattern", () => {
      // "fifth-mon" doesn't match the ordinal-day regex, so gets generic error
      expect(() => parseRepeatPattern("monthly:fifth-mon")).toThrow(/Invalid monthly modifier/);
    });
  });
});

describe("formatRepeatFlag", () => {
  describe("simple patterns", () => {
    it("formats daily", () => {
      expect(formatRepeatFlag("RRULE:FREQ=DAILY;INTERVAL=1")).toBe("Daily");
    });

    it("formats weekly", () => {
      expect(formatRepeatFlag("RRULE:FREQ=WEEKLY;INTERVAL=1")).toBe("Weekly");
    });

    it("formats monthly", () => {
      expect(formatRepeatFlag("RRULE:FREQ=MONTHLY;INTERVAL=1")).toBe("Monthly");
    });

    it("formats yearly", () => {
      expect(formatRepeatFlag("RRULE:FREQ=YEARLY;INTERVAL=1")).toBe("Yearly");
    });
  });

  describe("intervals", () => {
    it("formats every 2 days", () => {
      expect(formatRepeatFlag("RRULE:FREQ=DAILY;INTERVAL=2")).toBe("Every 2 days");
    });

    it("formats every 2 weeks", () => {
      expect(formatRepeatFlag("RRULE:FREQ=WEEKLY;INTERVAL=2")).toBe("Every 2 weeks");
    });

    it("formats every 3 months", () => {
      expect(formatRepeatFlag("RRULE:FREQ=MONTHLY;INTERVAL=3")).toBe("Every 3 months");
    });

    it("formats every 5 years", () => {
      expect(formatRepeatFlag("RRULE:FREQ=YEARLY;INTERVAL=5")).toBe("Every 5 years");
    });
  });

  describe("with days", () => {
    it("formats weekly with single day", () => {
      expect(formatRepeatFlag("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO")).toBe("Weekly on Mon");
    });

    it("formats weekly with multiple days", () => {
      expect(formatRepeatFlag("RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR")).toBe("Weekly on Mon, Wed, Fri");
    });

    it("formats biweekly with days", () => {
      expect(formatRepeatFlag("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH")).toBe("Every 2 weeks on Tue, Thu");
    });

    it("formats monthly on specific day", () => {
      expect(formatRepeatFlag("RRULE:FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=15")).toBe("Monthly on day 15");
    });

    it("formats monthly first Monday", () => {
      expect(formatRepeatFlag("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=1MO")).toBe("Monthly on first Mon");
    });

    it("formats monthly last Friday", () => {
      expect(formatRepeatFlag("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=-1FR")).toBe("Monthly on last Fri");
    });

    it("formats monthly second Tuesday", () => {
      expect(formatRepeatFlag("RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=2TU")).toBe("Monthly on second Tue");
    });
  });

  describe("end conditions", () => {
    it("formats with count", () => {
      expect(formatRepeatFlag("RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=10")).toBe("Weekly (10 times)");
    });

    it("formats with until date", () => {
      expect(formatRepeatFlag("RRULE:FREQ=DAILY;INTERVAL=1;UNTIL=20260124")).toBe("Daily (until 2026-01-24)");
    });

    it("formats complex pattern with count", () => {
      expect(formatRepeatFlag("RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=5;BYDAY=MO,FR")).toBe("Every 2 weeks on Mon, Fri (5 times)");
    });
  });

  describe("edge cases", () => {
    it("returns null for null input", () => {
      expect(formatRepeatFlag(null)).toBe(null);
    });

    it("returns null for undefined input", () => {
      expect(formatRepeatFlag(undefined)).toBe(null);
    });

    it("returns null for empty string", () => {
      expect(formatRepeatFlag("")).toBe(null);
    });

    it("handles missing RRULE prefix", () => {
      expect(formatRepeatFlag("FREQ=DAILY;INTERVAL=1")).toBe("Daily");
    });

    it("returns original if cannot parse", () => {
      expect(formatRepeatFlag("RRULE:INVALID")).toBe("RRULE:INVALID");
    });
  });
});

describe("isValidRepeatPattern", () => {
  it("returns true for valid patterns", () => {
    expect(isValidRepeatPattern("daily")).toBe(true);
    expect(isValidRepeatPattern("weekly")).toBe(true);
    expect(isValidRepeatPattern("weekly:mon,wed,fri")).toBe(true);
    expect(isValidRepeatPattern("monthly")).toBe(true);
    expect(isValidRepeatPattern("monthly:first-mon")).toBe(true);
    expect(isValidRepeatPattern("yearly")).toBe(true);
  });

  it("returns false for invalid patterns", () => {
    expect(isValidRepeatPattern("hourly")).toBe(false);
    expect(isValidRepeatPattern("weekly:xyz")).toBe(false);
    expect(isValidRepeatPattern("")).toBe(false);
    expect(isValidRepeatPattern("invalid")).toBe(false);
  });
});
