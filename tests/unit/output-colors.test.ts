import { describe, expect, test } from "bun:test";

const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, "");

async function importWithEnv(overrides: Record<string, string | undefined>) {
  const original = {
    NO_COLOR: process.env.NO_COLOR,
    FORCE_COLOR: process.env.FORCE_COLOR,
  };

  process.env.NO_COLOR = overrides.NO_COLOR;
  process.env.FORCE_COLOR = overrides.FORCE_COLOR;

  const moduleUrl = new URL(
    `../../src/output/colors.js?cacheBust=${Date.now()}`,
    import.meta.url
  ).href;

  try {
    return await import(moduleUrl);
  } finally {
    process.env.NO_COLOR = original.NO_COLOR;
    process.env.FORCE_COLOR = original.FORCE_COLOR;
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
