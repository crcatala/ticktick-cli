import { describe, expect, mock, test, beforeEach } from "bun:test";

const KEYTAR_PATH = "keytar";

describe("credentials", () => {
  beforeEach(() => {
    mock.restore();
  });

  test("getToken returns value from keytar", async () => {
    const getPassword = mock(() => Promise.resolve("token"));

    await mock.module(KEYTAR_PATH, () => ({
      default: {
        getPassword,
      },
    }));

    const { getToken } = await import("../../src/config/credentials.js");
    expect(await getToken("user")).toBe("token");
    expect(getPassword).toHaveBeenCalledWith("ticktick-cli", "user");
  });

  test("setToken writes to keytar", async () => {
    const setPassword = mock(() => Promise.resolve());

    await mock.module(KEYTAR_PATH, () => ({
      default: {
        setPassword,
      },
    }));

    const { setToken } = await import("../../src/config/credentials.js");
    await setToken("user", "token");
    expect(setPassword).toHaveBeenCalledWith("ticktick-cli", "user", "token");
  });

  test("deleteToken swallows errors", async () => {
    const deletePassword = mock(() => Promise.reject(new Error("missing")));

    await mock.module(KEYTAR_PATH, () => ({
      default: {
        deletePassword,
      },
    }));

    const { deleteToken } = await import("../../src/config/credentials.js");
    await deleteToken("user");
    expect(deletePassword).toHaveBeenCalled();
  });
});
