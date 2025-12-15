import { describe, expect, test } from "bun:test";
import { formatDate, toISODate, parseDate } from "../../src/utils/date.js";

describe("date utils", () => {
  test("formatDate handles null and invalid", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("invalid")).toBe("-");
  });

  test("formatDate formats today vs other dates", () => {
    const now = new Date();
    const todayStr = now.toISOString();
    expect(formatDate(todayStr)).toContain(":");

    const past = new Date("2022-01-01T00:00:00Z");
    const formatted = formatDate(past.toISOString());
    expect(formatted === "Jan 1, 2022" || formatted === "Dec 31, 2021").toBeTrue();
  });

  test("toISODate strips time", () => {
    const d = new Date("2022-03-15T10:20:30Z");
    expect(toISODate(d)).toBe("2022-03-15");
  });

  test("parseDate handles keywords and relative", () => {
    expect(parseDate("today")).toBeInstanceOf(Date);
    expect(parseDate("tomorrow")).toBeInstanceOf(Date);
    expect(parseDate("+3d")).toBeInstanceOf(Date);
    expect(parseDate("2022-01-01")).toBeInstanceOf(Date);
    expect(parseDate("invalid")).toBeNull();
  });
});
