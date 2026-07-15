#!/usr/bin/env bun
/**
 * Verify the environment credential used by live integration tests.
 *
 * `tt auth status` reads the CLI credential from its configured storage, while
 * live tests deliberately use only TICKTICK_TOKEN from the environment.
 */
import { getLiveClient } from "../tests/helpers/live-test.js";
import { ApiError } from "../src/utils/errors.js";

const token = process.env.TICKTICK_TOKEN;

if (!token) {
  console.error(
    "Live tests require TICKTICK_TOKEN in the environment. " +
      "Set it before running `bun run test:live`."
  );
  process.exit(1);
}

try {
  // getLiveClient() is cached, so the test suites reuse this same X-Device ID.
  await getLiveClient().getProfile();
  console.log("Live-test authentication preflight passed.");
} catch (error) {
  if (error instanceof ApiError && error.status === 401) {
    console.error(
      "Live-test authentication failed (HTTP 401). `bun run test:live` uses " +
        "TICKTICK_TOKEN from the environment, whereas `tt auth status` uses the " +
        "credential saved by `tt auth login`; they are independent. Refresh or " +
        "export TICKTICK_TOKEN, then retry."
    );
    process.exit(1);
  }

  throw error;
}
