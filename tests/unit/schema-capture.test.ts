/**
 * Tests for schema capture utility functions.
 */
import { describe, it, expect } from "bun:test";
import {
  inferSchema,
  createSchemaSnapshot,
  formatErrorMessage
} from "../../scripts/schema-capture.js";

describe("inferSchema", () => {
  it("infers null type", () => {
    const result = inferSchema(null);
    expect(result).toEqual({ type: ["null"] });
  });

  it("infers undefined type", () => {
    const result = inferSchema(undefined);
    expect(result).toEqual({ type: ["undefined"] });
  });

  it("infers string type", () => {
    const result = inferSchema("hello");
    expect(result).toEqual({ type: "string" });
  });

  it("infers number type", () => {
    const result = inferSchema(42);
    expect(result).toEqual({ type: "number" });
  });

  it("infers boolean type", () => {
    const result = inferSchema(true);
    expect(result).toEqual({ type: "boolean" });
  });

  it("infers empty array with unknown items", () => {
    const result = inferSchema([]);
    expect(result).toEqual({
      type: "array",
      items: { type: "unknown" }
    });
  });

  it("infers array of strings", () => {
    const result = inferSchema(["a", "b", "c"]);
    expect(result).toEqual({
      type: "array",
      items: { type: "string" }
    });
  });

  it("infers array of numbers", () => {
    const result = inferSchema([1, 2, 3]);
    expect(result).toEqual({
      type: "array",
      items: { type: "number" }
    });
  });

  it("infers array of objects", () => {
    const result = inferSchema([
      { id: "1", name: "test" }
    ]);
    expect(result).toEqual({
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" }
        }
      }
    });
  });

  it("infers simple object", () => {
    const result = inferSchema({
      id: "123",
      count: 42,
      active: true
    });
    expect(result).toEqual({
      type: "object",
      properties: {
        id: { type: "string" },
        count: { type: "number" },
        active: { type: "boolean" }
      }
    });
  });

  it("infers nested object", () => {
    const result = inferSchema({
      user: {
        name: "Alice",
        age: 30
      }
    });
    expect(result).toEqual({
      type: "object",
      properties: {
        user: {
          type: "object",
          properties: {
            name: { type: "string" },
            age: { type: "number" }
          }
        }
      }
    });
  });

  it("infers object with array property", () => {
    const result = inferSchema({
      tags: ["tag1", "tag2"]
    });
    expect(result).toEqual({
      type: "object",
      properties: {
        tags: {
          type: "array",
          items: { type: "string" }
        }
      }
    });
  });

  it("infers complex nested structure", () => {
    const result = inferSchema({
      id: "123",
      items: [
        { name: "item1", count: 5 }
      ],
      metadata: {
        created: "2025-01-01",
        tags: ["a", "b"]
      }
    });
    expect(result).toEqual({
      type: "object",
      properties: {
        id: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              count: { type: "number" }
            }
          }
        },
        metadata: {
          type: "object",
          properties: {
            created: { type: "string" },
            tags: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      }
    });
  });
});

describe("createSchemaSnapshot", () => {
  it("creates snapshot with metadata and schema", () => {
    const data = { id: "123", name: "test" };
    const result = createSchemaSnapshot("/api/v2/test", "GET", data) as any;

    expect(result.$endpoint).toBe("GET /api/v2/test");
    expect(result.$version).toBe("1.0.0");
    expect(result.$capturedAt).toBeDefined();
    expect(typeof result.$capturedAt).toBe("string");

    // Verify it's a valid ISO timestamp
    expect(() => new Date(result.$capturedAt)).not.toThrow();

    // Verify schema was inferred
    expect(result.type).toBe("object");
    expect(result.properties).toEqual({
      id: { type: "string" },
      name: { type: "string" }
    });
  });

  it("includes schema for array data", () => {
    const data = [{ id: "1" }, { id: "2" }];
    const result = createSchemaSnapshot("/api/v2/items", "GET", data) as any;

    expect(result.$endpoint).toBe("GET /api/v2/items");
    expect(result.type).toBe("array");
    expect(result.items).toEqual({
      type: "object",
      properties: {
        id: { type: "string" }
      }
    });
  });

  it("includes schema for primitive data", () => {
    const data = "hello";
    const result = createSchemaSnapshot("/api/v2/status", "GET", data) as any;

    expect(result.$endpoint).toBe("GET /api/v2/status");
    expect(result.type).toBe("string");
  });
});

describe("formatErrorMessage", () => {
  it("returns string as-is for non-Error values", () => {
    expect(formatErrorMessage("simple string")).toBe("simple string");
    expect(formatErrorMessage(42)).toBe("42");
  });

  it("returns error message for regular errors", () => {
    const error = new Error("Something went wrong");
    expect(formatErrorMessage(error)).toBe("Something went wrong");
  });

  it("truncates HTML DOCTYPE responses", () => {
    const error = new Error("HTTP 404: <!DOCTYPE html><html><body>Not Found</body></html>");
    expect(formatErrorMessage(error)).toBe("HTTP 404 (HTML response)");
  });

  it("truncates HTML responses without DOCTYPE", () => {
    const error = new Error("HTTP 500: <html><head><title>Error</title></head></html>");
    expect(formatErrorMessage(error)).toBe("HTTP 500 (HTML response)");
  });

  it("handles HTML responses without HTTP status prefix", () => {
    const error = new Error("<!DOCTYPE html><html>Error page</html>");
    expect(formatErrorMessage(error)).toBe("HTTP error (HTML response)");
  });

  it("preserves non-HTML error messages", () => {
    const error = new Error("HTTP 429: Rate limit exceeded");
    expect(formatErrorMessage(error)).toBe("HTTP 429: Rate limit exceeded");
  });

  it("handles multiline error messages", () => {
    const error = new Error("Connection failed\nTimeout after 30s");
    expect(formatErrorMessage(error)).toBe("Connection failed\nTimeout after 30s");
  });
});
