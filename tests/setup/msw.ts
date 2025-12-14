import { afterAll, afterEach, beforeAll } from "bun:test";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

// Default handlers can be extended per-test via server.use(...)
export const server = setupServer();

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
