import { describe, expect, test, mock } from "bun:test";
import {
  formatPriority,
  truncateId,
  printError,
  printSuccess,
  printWarning,
  printInfo,
  printJson,
  printKeyValue,
  printChecklistItems,
} from "../../src/output/format.js";
import { stripAnsi } from "../utils/test-helpers.js";

describe("format helpers", () => {
  test("formatPriority maps values to labels", () => {
    expect(stripAnsi(formatPriority(5))).toBe("High");
    expect(stripAnsi(formatPriority(3))).toBe("Medium");
    expect(stripAnsi(formatPriority(1))).toBe("Low");
    expect(stripAnsi(formatPriority(0))).toBe("None");
    expect(stripAnsi(formatPriority(undefined))).toBe("None");
  });

  test("truncateId shortens long ids", () => {
    expect(truncateId("abcdef", 4)).toBe("abcd");
    expect(truncateId("abc", 4)).toBe("abc");
    expect(truncateId(null)).toBe("-");
  });
});

describe("print helpers", () => {
  test("printError prefixes message", () => {
    const spy = mock(() => {});
    const original = console.error;
    console.error = spy;
    printError("bad");
    console.error = original;
    expect(stripAnsi(spy.mock.calls[0][0])).toBe("Error: bad");
  });

  test("printSuccess shows checkmark", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;
    printSuccess("ok");
    console.log = original;
    expect(stripAnsi(spy.mock.calls[0][0])).toBe("✓ ok");
  });

  test("printWarning prefixes warning", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;
    printWarning("heads up");
    console.log = original;
    expect(stripAnsi(spy.mock.calls[0][0])).toBe("Warning: heads up");
  });

  test("printInfo passthrough", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;
    printInfo("info");
    console.log = original;
    expect(spy.mock.calls[0][0]).toBe("info");
  });

  test("printJson pretty prints", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;
    printJson({ a: 1 });
    console.log = original;
    expect(spy.mock.calls[0][0]).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  test("printKeyValue respects order", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;
    printKeyValue({ A: "1", B: "2" }, ["B", "A"]);
    console.log = original;
    const lines = spy.mock.calls.map((args) => stripAnsi(args[0]));
    expect(lines[0].startsWith("B")).toBeTrue();
    expect(lines[1].startsWith("A")).toBeTrue();
  });

  test("printChecklistItems displays items with checkboxes", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;

    printChecklistItems([
      { id: "item-abc-123", title: "First item", status: 0, sortOrder: 0 },
      { id: "item-def-456", title: "Second item", status: 1, sortOrder: 100 },
    ]);

    console.log = original;

    expect(spy.mock.calls).toHaveLength(2);
    expect(spy.mock.calls[0][0]).toContain("☐");
    expect(spy.mock.calls[0][0]).toContain("item-abc");
    expect(spy.mock.calls[0][0]).toContain("First item");
    expect(spy.mock.calls[1][0]).toContain("☑");
    expect(spy.mock.calls[1][0]).toContain("item-def");
    expect(spy.mock.calls[1][0]).toContain("Second item");
  });

  test("printChecklistItems sorts by sortOrder", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;

    printChecklistItems([
      { id: "second", title: "Second", status: 0, sortOrder: 100 },
      { id: "first", title: "First", status: 0, sortOrder: 0 },
      { id: "third", title: "Third", status: 0, sortOrder: 200 },
    ]);

    console.log = original;

    expect(spy.mock.calls[0][0]).toContain("First");
    expect(spy.mock.calls[1][0]).toContain("Second");
    expect(spy.mock.calls[2][0]).toContain("Third");
  });

  test("printChecklistItems handles null/undefined values", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;

    printChecklistItems([
      { id: null, title: null, status: null, sortOrder: null },
    ]);

    console.log = original;

    expect(spy.mock.calls[0][0]).toContain("☐"); // null status treated as incomplete
    expect(spy.mock.calls[0][0]).toContain("?"); // null id shows ?
    expect(spy.mock.calls[0][0]).toContain("(untitled)"); // null title
  });

  test("printChecklistItems handles empty array", () => {
    const spy = mock(() => {});
    const original = console.log;
    console.log = spy;

    printChecklistItems([]);

    console.log = original;

    expect(spy.mock.calls).toHaveLength(0);
  });
});
