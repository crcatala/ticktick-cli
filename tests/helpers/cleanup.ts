#!/usr/bin/env bun
/**
 * Standalone cleanup script to remove all test resources from TickTick.
 *
 * Usage:
 *   RUN_LIVE_TESTS=1 TICKTICK_TOKEN=xxx bun run tests/helpers/cleanup.ts
 *
 * This is useful when:
 * - Previous test runs left orphaned resources
 * - You hit quota limits due to leftover test data
 * - You want to ensure a clean slate before running tests
 */

import { cleanupAllTestResources } from "./live-test.js";

await cleanupAllTestResources();
