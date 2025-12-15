import { afterAll, afterEach, beforeAll } from "bun:test";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Default handlers can be extended per-test via server.use(...)
export const server = setupServer();

// Check if we're running live tests - if so, don't intercept requests
const isLiveTest = process.env.RUN_LIVE_TESTS === "1";

beforeAll(() => {
  if (!isLiveTest) {
    // For unit tests, error on unhandled requests to catch missing mocks
    server.listen({ onUnhandledRequest: "error" });
  }
  // For live tests, don't start MSW at all - let real requests through
});

afterEach(() => {
  if (!isLiveTest) {
    server.resetHandlers();
  }
});

afterAll(() => {
  if (!isLiveTest) {
    server.close();
  }
});

export { http, HttpResponse };
