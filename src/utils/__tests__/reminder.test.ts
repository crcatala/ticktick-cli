/**
 * Tests for reminder utilities.
 */
import { describe, it, expect } from "bun:test";
import {
  parseReminderTime,
  createReminder,
  formatReminderTrigger,
} from "../reminder.js";

describe("parseReminderTime", () => {
  describe("on-time reminders", () => {
    it("parses 'on-time' as PT0S", () => {
      expect(parseReminderTime("on-time")).toBe("TRIGGER:PT0S");
    });

    it("parses 'ontime' as PT0S", () => {
      expect(parseReminderTime("ontime")).toBe("TRIGGER:PT0S");
    });

    it("parses '0' as PT0S", () => {
      expect(parseReminderTime("0")).toBe("TRIGGER:PT0S");
    });
  });

  describe("minute-based reminders", () => {
    it("parses '15m' as 15 minutes before", () => {
      expect(parseReminderTime("15m")).toBe("TRIGGER:-PT15M");
    });

    it("parses '30m' as 30 minutes before", () => {
      expect(parseReminderTime("30m")).toBe("TRIGGER:-PT30M");
    });

    it("parses '60m' as 60 minutes before", () => {
      expect(parseReminderTime("60m")).toBe("TRIGGER:-PT60M");
    });
  });

  describe("hour-based reminders", () => {
    it("parses '1h' as 60 minutes before", () => {
      expect(parseReminderTime("1h")).toBe("TRIGGER:-PT60M");
    });

    it("parses '2h' as 120 minutes before", () => {
      expect(parseReminderTime("2h")).toBe("TRIGGER:-PT120M");
    });

    it("parses '24h' as 1440 minutes before", () => {
      expect(parseReminderTime("24h")).toBe("TRIGGER:-PT1440M");
    });
  });

  describe("day-based reminders", () => {
    it("parses '1d' as 1440 minutes before", () => {
      expect(parseReminderTime("1d")).toBe("TRIGGER:-PT1440M");
    });

    it("parses '2d' as 2880 minutes before", () => {
      expect(parseReminderTime("2d")).toBe("TRIGGER:-PT2880M");
    });

    it("parses '7d' as 10080 minutes before", () => {
      expect(parseReminderTime("7d")).toBe("TRIGGER:-PT10080M");
    });
  });

  describe("combined time formats", () => {
    it("parses '2h30m' as 150 minutes before", () => {
      expect(parseReminderTime("2h30m")).toBe("TRIGGER:-PT150M");
    });

    it("parses '1d2h' as 1560 minutes before", () => {
      expect(parseReminderTime("1d2h")).toBe("TRIGGER:-PT1560M");
    });

    it("parses '1d1h30m' as 1530 minutes before", () => {
      expect(parseReminderTime("1d1h30m")).toBe("TRIGGER:-PT1530M");
    });
  });

  describe("case insensitivity", () => {
    it("handles uppercase input", () => {
      expect(parseReminderTime("15M")).toBe("TRIGGER:-PT15M");
      expect(parseReminderTime("1H")).toBe("TRIGGER:-PT60M");
      expect(parseReminderTime("1D")).toBe("TRIGGER:-PT1440M");
    });

    it("handles mixed case input", () => {
      expect(parseReminderTime("On-Time")).toBe("TRIGGER:PT0S");
      expect(parseReminderTime("OnTime")).toBe("TRIGGER:PT0S");
    });
  });

  describe("invalid formats", () => {
    it("returns null for invalid format", () => {
      expect(parseReminderTime("invalid")).toBeNull();
      expect(parseReminderTime("")).toBeNull();
      expect(parseReminderTime("abc")).toBeNull();
    });
  });
});

describe("createReminder", () => {
  it("creates a reminder with valid time", () => {
    const reminder = createReminder("15m");
    expect(reminder).not.toBeNull();
    expect(reminder?.trigger).toBe("TRIGGER:-PT15M");
    expect(reminder?.id).toBeDefined();
    expect(reminder?.id?.length).toBe(24); // MongoDB ObjectId length
  });

  it("returns null for invalid time", () => {
    const reminder = createReminder("invalid");
    expect(reminder).toBeNull();
  });

  it("generates unique IDs for each reminder", () => {
    const reminder1 = createReminder("15m");
    const reminder2 = createReminder("15m");
    expect(reminder1?.id).not.toBe(reminder2?.id);
  });
});

describe("formatReminderTrigger", () => {
  it("formats on-time trigger", () => {
    expect(formatReminderTrigger("TRIGGER:PT0S")).toBe("On time");
  });

  it("formats minute-based triggers", () => {
    expect(formatReminderTrigger("TRIGGER:-PT15M")).toBe("15m before");
    expect(formatReminderTrigger("TRIGGER:-PT30M")).toBe("30m before");
  });

  it("formats hour-based triggers", () => {
    expect(formatReminderTrigger("TRIGGER:-PT60M")).toBe("1h before");
    expect(formatReminderTrigger("TRIGGER:-PT120M")).toBe("2h before");
  });

  it("formats day-based triggers", () => {
    expect(formatReminderTrigger("TRIGGER:-PT1440M")).toBe("1d before");
    expect(formatReminderTrigger("TRIGGER:-PT2880M")).toBe("2d before");
  });

  it("formats combined time triggers", () => {
    expect(formatReminderTrigger("TRIGGER:-PT150M")).toBe("2h 30m before");
    expect(formatReminderTrigger("TRIGGER:-PT1560M")).toBe("1d 2h before");
    expect(formatReminderTrigger("TRIGGER:-PT1530M")).toBe("1d 1h 30m before");
  });

  it("handles null/undefined", () => {
    expect(formatReminderTrigger(null)).toBe("-");
    expect(formatReminderTrigger(undefined)).toBe("-");
  });

  it("returns as-is for unknown formats", () => {
    expect(formatReminderTrigger("UNKNOWN:FORMAT")).toBe("UNKNOWN:FORMAT");
  });
});
