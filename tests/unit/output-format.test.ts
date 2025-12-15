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
});
