import { afterAll, afterEach, beforeAll } from "bun:test";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Default handlers can be extended per-test via server.use(...)
export const server = setupServer();

/**
 * Determine if we're running integration tests based on the test file path.
 * 
 * Integration tests (tests/integration/*) should NOT use MSW mocking:
 * - live-api.test.ts needs real API access
 * - cli-options.test.ts spawns subprocesses
 * 
 * Unit tests (tests/unit/*) should ALWAYS use MSW mocking.
 */
function isIntegrationTest(): boolean {
  // Bun passes the test file as argv[1]
  const testFile = process.argv[1] ?? "";
  return testFile.includes("/integration/") || testFile.includes("\\integration\\");
}

const shouldUseMSW = !isIntegrationTest();

beforeAll(() => {
  if (shouldUseMSW) {
    // For unit tests, error on unhandled requests to catch missing mocks
    server.listen({ onUnhandledRequest: "error" });
  }
  // For integration tests, don't start MSW at all - let real requests through
});

afterEach(() => {
  if (shouldUseMSW) {
    server.resetHandlers();
  }
});

afterAll(() => {
  if (shouldUseMSW) {
    server.close();
  }
});

export { http, HttpResponse };
