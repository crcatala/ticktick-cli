import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { colors } from "../../src/output/colors.js";

const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

describe("colors", () => {
  let originalNoColor: string | undefined;
  let originalForceColor: string | undefined;

  beforeEach(() => {
    originalNoColor = process.env.NO_COLOR;
    originalForceColor = process.env.FORCE_COLOR;
  });

  afterEach(() => {
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
    if (originalForceColor === undefined) {
      delete process.env.FORCE_COLOR;
    } else {
      process.env.FORCE_COLOR = originalForceColor;
    }
  });

  test("colors apply ANSI when supported", () => {
    delete process.env.NO_COLOR;
    process.env.FORCE_COLOR = "1";

    const value = colors.error("hello");
    expect(value).not.toBe("hello");
    expect(stripAnsi(value)).toBe("hello");
  });

  test("NO_COLOR disables colors", () => {
    process.env.NO_COLOR = "1";
    delete process.env.FORCE_COLOR;

    expect(colors.error("hi")).toBe("hi");
  });
});
