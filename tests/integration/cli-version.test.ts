/**
 * Integration tests for the standard `--version` line, `update` and `version` commands.
 */
import { describe, it, expect } from "bun:test";
import { spawn } from "bun";
import { join } from "node:path";

const CLI_PATH = join(import.meta.dir, "..", "..", "src", "index.ts");
const VERSION_LINE = /^tt \d+\.\d+\.\d+[^ ]* \([0-9a-f]{7}(-dirty)? \d{4}-\d{2}-\d{2}\)$/;

async function run(args: string[]) {
  const proc = spawn([process.execPath, "run", CLI_PATH, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;
  return { stdout, stderr, exitCode: proc.exitCode };
}

describe("tt --version", () => {
  it("prints the standard version line for --version", async () => {
    const { stdout, exitCode } = await run(["--version"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(VERSION_LINE);
  });

  it("prints the same line for -V", async () => {
    const { stdout, exitCode } = await run(["-V"]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(VERSION_LINE);
  });
});

describe("tt version", () => {
  it("prints details as one JSON object with --json", async () => {
    const { stdout, exitCode } = await run(["version", "--json"]);
    expect(exitCode).toBe(0);

    const details = JSON.parse(stdout);
    expect(details.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(details.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(details.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // These tests run from the repository checkout.
    expect(details.install).toBe("checkout");
    expect(details.path).toContain("ticktick-cli");
  });
});

describe("tt update --check", () => {
  it("reports without updating: exit 0, 1 or 2", async () => {
    const { stdout, stderr, exitCode } = await run(["update", "--check"]);

    expect([0, 1, 2]).toContain(exitCode);
    expect(stderr).not.toContain("Error");
    expect(stderr).not.toMatch(/\n\s+at /); // no stack trace
    expect(`${stdout}${stderr}`).toMatch(/tt|update/i);
  });
});

describe("tt --help", () => {
  it("lists the update and version commands", async () => {
    const { stdout, exitCode } = await run(["--help"]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("update");
    expect(stdout).toContain("version");
  });
});
