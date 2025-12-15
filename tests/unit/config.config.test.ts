import { describe, expect, mock, test, beforeEach } from "bun:test";
import { createFsMock, importConfigWithFsMock } from "../helpers/fs-mock.js";

type FsOverrides = Parameters<typeof createFsMock>[0];

const importFresh = async (overrides: FsOverrides = {}) => {
  const fsMock = createFsMock(overrides);
  return importConfigWithFsMock(fsMock);
};

describe("config", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("loadConfig prefers JSON over legacy TOML", async () => {
    const existsSync = mock(() => true);
    const readFileSync = mock((path: string) => {
      if (path.endsWith("config.json")) {
        return "{\"auth\":{\"username\":\"u\",\"storage\":\"config\",\"token\":\"t\"}}";
      }
      throw new Error(`unexpected path: ${path}`);
    });

    const mod = await importFresh({ existsSync, readFileSync });
    expect(mod.loadConfig()).toEqual({
      auth: { username: "u", storage: "config", token: "t" },
    });
  });

  test("loadConfig falls back to legacy TOML", async () => {
    const existsSync = mock((filepath: string) => filepath.endsWith("config.toml"));
    const readFileSync = mock(() => "[auth]\nusername = \"legacy\"\n[defaults]\nproject = \"p1\"");

    const mod = await importFresh({ existsSync, readFileSync });
    expect(mod.loadConfig()).toEqual({
      auth: { username: "legacy", storage: "config" },
      defaults: { project: "p1" },
    });
  });

  test("saveConfig writes file with permissions", async () => {
    const existsSync = mock(() => false);
    const mkdirSync = mock(() => {});
    const writeFileSync = mock(() => {});
    const chmodSync = mock(() => {});

    const mod = await importFresh({ existsSync, mkdirSync, writeFileSync, chmodSync });
    mod.saveConfig({ auth: { username: "u", storage: "config", token: "t" } });

    expect(mkdirSync).toHaveBeenCalled();
    expect(writeFileSync).toHaveBeenCalled();
    expect(chmodSync).toHaveBeenCalled();
  });
});
