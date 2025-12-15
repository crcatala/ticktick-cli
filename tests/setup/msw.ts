/**
 * MSW (Mock Service Worker) setup for unit tests.
 * 
 * This module should be imported by unit test files that need HTTP mocking.
 * Integration tests should NOT import this module.
 * 
 * Usage in unit tests:
 *   import { server, http, HttpResponse } from "../setup/msw.js";
 */
import { afterAll, afterEach, beforeAll } from "bun:test";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Default handlers can be extended per-test via server.use(...)
export const server = setupServer();

// Start MSW server for unit tests
// Error on unhandled requests to catch missing mocks
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

export { http, HttpResponse };
