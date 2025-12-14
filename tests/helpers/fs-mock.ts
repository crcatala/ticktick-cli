import { mock } from "bun:test";

export interface FsMock {
  existsSync: ReturnType<typeof mock>;
  readFileSync: ReturnType<typeof mock>;
  writeFileSync: ReturnType<typeof mock>;
  mkdirSync: ReturnType<typeof mock>;
  chmodSync: ReturnType<typeof mock>;
}

export function createFsMock(
  overrides: Partial<FsMock> = {}
): FsMock {
  const defaults: FsMock = {
    existsSync: mock(() => false),
    readFileSync: mock(() => ""),
    writeFileSync: mock(() => {}),
    mkdirSync: mock(() => {}),
    chmodSync: mock(() => {}),
  };

  return { ...defaults, ...overrides };
}

export async function importConfigWithFsMock(fsMock: FsMock) {
  const moduleUrl = new URL("../../src/config/config.js", import.meta.url).href;

  await mock.module("fs", () => ({
    existsSync: fsMock.existsSync,
    readFileSync: fsMock.readFileSync,
    writeFileSync: fsMock.writeFileSync,
    mkdirSync: fsMock.mkdirSync,
    chmodSync: fsMock.chmodSync,
  }));

  return import(moduleUrl);
}
