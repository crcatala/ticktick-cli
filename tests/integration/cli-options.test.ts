/**
 * Integration tests for CLI option validation.
 */
import { describe, it, expect } from "bun:test";
import { spawn } from "bun";

describe("CLI validation option", () => {
  const CLI_PATH = "./src/index.ts";

  it("accepts valid value 'strict'", async () => {
    const proc = spawn(["bun", "run", CLI_PATH, "--validation=strict", "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);
  });

  it("accepts valid value 'warn'", async () => {
    const proc = spawn(["bun", "run", CLI_PATH, "--validation=warn", "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);
  });

  it("accepts valid value 'off'", async () => {
    const proc = spawn(["bun", "run", CLI_PATH, "--validation=off", "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    await proc.exited;
    expect(proc.exitCode).toBe(0);
  });

  it("rejects invalid value with error message", async () => {
    const proc = spawn(["bun", "run", CLI_PATH, "--validation=banana", "auth", "status"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stderr = await new Response(proc.stderr).text();
    await proc.exited;

    expect(proc.exitCode).not.toBe(0);
    expect(stderr).toContain("invalid");
    expect(stderr).toContain("banana");
    expect(stderr).toContain("strict");
    expect(stderr).toContain("warn");
    expect(stderr).toContain("off");
  });

  it("uses 'strict' as default when not specified", async () => {
    // This is an indirect test - we can't easily check the internal value,
    // but we verify the option description shows the default
    const proc = spawn(["bun", "run", CLI_PATH, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain('default: "strict"');
  });

  it("shows available choices in help text", async () => {
    const proc = spawn(["bun", "run", CLI_PATH, "--help"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    expect(proc.exitCode).toBe(0);
    expect(stdout).toContain("choices:");
    expect(stdout).toContain('"strict"');
    expect(stdout).toContain('"warn"');
    expect(stdout).toContain('"off"');
  });
});
