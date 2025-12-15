import { describe, expect, test } from "bun:test";

const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

async function importWithEnv(overrides: Record<string, string | undefined>) {
  const original = {
    NO_COLOR: process.env.NO_COLOR,
    FORCE_COLOR: process.env.FORCE_COLOR,
  };

  // Must delete undefined vars, not set them to "undefined" string
  if (overrides.NO_COLOR === undefined) {
    delete process.env.NO_COLOR;
  } else {
    process.env.NO_COLOR = overrides.NO_COLOR;
  }
  if (overrides.FORCE_COLOR === undefined) {
    delete process.env.FORCE_COLOR;
  } else {
    process.env.FORCE_COLOR = overrides.FORCE_COLOR;
  }

  const moduleUrl = new URL(
    `../../src/output/colors.js?cacheBust=${Date.now()}`,
    import.meta.url
  ).href;

  try {
    return await import(moduleUrl);
  } finally {
    // Restore original values (delete if was undefined)
    if (original.NO_COLOR === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = original.NO_COLOR;
    }
    if (original.FORCE_COLOR === undefined) {
      delete process.env.FORCE_COLOR;
    } else {
      process.env.FORCE_COLOR = original.FORCE_COLOR;
    }
  }
}

describe("colors", () => {
  test("colors apply ANSI when supported", async () => {
    const mod = await importWithEnv({ NO_COLOR: undefined, FORCE_COLOR: "1" });
    const value = mod.colors.error("hello");
    expect(value).not.toBe("hello");
    expect(stripAnsi(value)).toBe("hello");
  });

  test("NO_COLOR disables colors", async () => {
    const mod = await importWithEnv({ NO_COLOR: "1", FORCE_COLOR: undefined });
    expect(stripAnsi(mod.colors.error("hi"))).toBe("hi");
  });
});
