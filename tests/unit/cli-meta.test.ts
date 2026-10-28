import { describe, expect, test } from "bun:test";
import {
  buildInfo,
  packageManagerFor,
  packageMeta,
  versionLine,
  formatVersion,
  compareVersions,
  detectInstall,
  gitCloneUrl,
  gitInstallUrl,
  updateSteps,
} from "../../src/cli-meta.js";

describe("formatVersion", () => {
  test("includes short commit, dirty marker and commit date", () => {
    expect(
      formatVersion("tt", { version: "0.1.3", commit: "a1b2c3d4e5", date: "2026-10-27" })
    ).toBe("tt 0.1.3 (a1b2c3d 2026-10-27)");
  });

  test("marks builds with uncommitted changes as dirty", () => {
    expect(
      formatVersion("tt", { version: "0.1.3", commit: "a1b2c3d4e5", date: "2026-10-27", dirty: true })
    ).toBe("tt 0.1.3 (a1b2c3d-dirty 2026-10-27)");
  });

  test("prints only the version when there is no commit information", () => {
    expect(formatVersion("tt", { version: "0.1.3" })).toBe("tt 0.1.3");
  });
});

describe("compareVersions", () => {
  test("orders releases", () => {
    expect(compareVersions("0.1.3", "0.1.4")).toBeLessThan(0);
    expect(compareVersions("0.2.0", "0.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("v1.0.0", "1.0.0")).toBe(0);
  });

  test("sorts a prerelease before its release", () => {
    expect(compareVersions("1.0.0-beta.1", "1.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.0.0-beta.1")).toBeGreaterThan(0);
  });
});

describe("packageMeta", () => {
  test("finds this package's root and metadata", () => {
    const meta = packageMeta();
    expect(meta.name).toBe("@crcatala/ticktick-cli");
    expect(meta.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(meta.isPrivate).toBe(false);
    expect(meta.repositoryUrl).toContain("github.com/crcatala/ticktick-cli");
  });
});

describe("packageManagerFor", () => {
  test("uses bun for this repository despite the pnpm lockfile", () => {
    expect(packageManagerFor(packageMeta().root)).toBe("bun");
  });
});

describe("detectInstall", () => {
  const root = "/usr/lib/node_modules/@crcatala/ticktick-cli";

  test("a checkout wins over every path guess", () => {
    expect(detectInstall("/home/me/src/ticktick-cli", true)).toBe("checkout");
  });

  test("recognizes npx, mise, bun, pnpm and npm installs", () => {
    expect(detectInstall("/home/me/.npm/_npx/abc123/node_modules/@crcatala/ticktick-cli", false)).toBe("npx");
    expect(detectInstall("/home/me/.local/share/mise/installs/npm-crcatala-ticktick-cli/0.1.3", false)).toBe("mise");
    expect(detectInstall("/home/me/.bun/install/global/node_modules/@crcatala/ticktick-cli", false)).toBe("bun");
    expect(detectInstall("/home/me/.local/share/pnpm/global/5/node_modules/@crcatala/ticktick-cli", false)).toBe(
      "pnpm"
    );
    expect(detectInstall(root, false, "/usr/lib/node_modules")).toBe("npm");
  });

  test("falls back to unknown", () => {
    expect(detectInstall("/opt/weird/place", false)).toBe("unknown");
  });
});

describe("git URLs", () => {
  test("normalizes the package.json repository URL", () => {
    expect(gitCloneUrl("git+https://github.com/crcatala/ticktick-cli.git")).toBe(
      "https://github.com/crcatala/ticktick-cli.git"
    );
    expect(gitCloneUrl("github:crcatala/ticktick-cli")).toBe("https://github.com/crcatala/ticktick-cli.git");
    expect(gitCloneUrl("git@github.com:crcatala/ticktick-cli.git")).toBe(
      "ssh://git@github.com/crcatala/ticktick-cli.git"
    );
    expect(gitInstallUrl("github:crcatala/ticktick-cli")).toBe(
      "git+https://github.com/crcatala/ticktick-cli.git"
    );
  });
});

describe("updateSteps", () => {
  test("pulls, installs and rebuilds a source checkout with bun", () => {
    const steps = updateSteps("checkout", packageMeta());
    expect(steps?.map((s) => [s.cmd, ...s.args].join(" "))).toEqual([
      "git pull --ff-only origin main",
      "bun install",
      "bun run build",
    ]);
  });

  test("reinstalls a global npm install from the registry", () => {
    const steps = updateSteps("npm", packageMeta());
    expect(steps?.map((s) => [s.cmd, ...s.args].join(" "))).toEqual([
      "npm install -g @crcatala/ticktick-cli@latest",
    ]);
  });

  test("publishes nothing for an unknown install method", () => {
    expect(updateSteps("unknown", packageMeta())).toBeNull();
  });
});

describe("buildInfo", () => {
  test("reads this checkout's git commit rather than a stale dist stamp", () => {
    const meta = packageMeta();
    const info = buildInfo(meta);
    expect(info.version).toBe(meta.version);
    // Running from src/ inside a checkout reads git, so a commit must be present.
    expect(info.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(info.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("versionLine matches the standard format", () => {
    expect(versionLine("tt")).toMatch(/^tt \d+\.\d+\.\d+[^ ]* \([0-9a-f]{7}(-dirty)? \d{4}-\d{2}-\d{2}\)$/);
  });
});
