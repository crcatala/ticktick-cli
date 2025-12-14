/**
 * Tests for validation helpers.
 */
import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test";
import { z } from "zod/v4";
import {
  validateOne,
  validateArray,
  ValidationError,
  DEFAULT_VALIDATION_STRATEGY,
} from "../validate.js";

// Simple test schema
const TestItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
}).passthrough();

type TestItem = z.infer<typeof TestItemSchema>;

describe("validateOne", () => {
  describe("strict mode", () => {
    it("returns validated data on success", () => {
      const data = { id: "123", name: "test" };
      const result = validateOne(TestItemSchema, data, "strict");
      expect(result.id).toBe("123");
      expect(result.name).toBe("test");
    });

    it("throws ValidationError on failure", () => {
      const data = { name: "no id" }; // missing required id
      expect(() => validateOne(TestItemSchema, data, "strict", "TestItem")).toThrow(ValidationError);
    });

    it("includes entity type in error message", () => {
      const data = { name: "no id" };
      try {
        validateOne(TestItemSchema, data, "strict", "TestItem");
        expect(true).toBe(false); // should not reach
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        const err = e as ValidationError;
        expect(err.message).toContain("TestItem");
        expect(err.entityType).toBe("TestItem");
      }
    });

    it("preserves unknown fields with passthrough", () => {
      const data = { id: "123", unknownField: "preserved" };
      const result = validateOne(TestItemSchema, data, "strict");
      expect((result as any).unknownField).toBe("preserved");
    });
  });

  describe("warn mode", () => {
    let warnSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
      warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it("returns validated data on success without warning", () => {
      const data = { id: "123", name: "test" };
      const result = validateOne(TestItemSchema, data, "warn");
      expect(result.id).toBe("123");
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("logs warning and returns raw data on failure", () => {
      const data = { name: "no id" };
      const result = validateOne(TestItemSchema, data, "warn", "TestItem");
      
      // Returns raw data
      expect(result.name).toBe("no id");
      
      // Logs warning
      expect(warnSpy).toHaveBeenCalled();
      const warnCall = warnSpy.mock.calls[0][0];
      expect(warnCall).toContain("[warn]");
      expect(warnCall).toContain("TestItem");
    });
  });

  describe("off mode", () => {
    it("returns data as-is without validation", () => {
      const data = { totally: "invalid", structure: 123 };
      const result = validateOne(TestItemSchema, data, "off");
      expect((result as any).totally).toBe("invalid");
    });

    it("does not throw on invalid data", () => {
      const data = { name: "no id" };
      expect(() => validateOne(TestItemSchema, data, "off")).not.toThrow();
    });
  });

  describe("DEFAULT_VALIDATION_STRATEGY", () => {
    it("defaults to strict", () => {
      expect(DEFAULT_VALIDATION_STRATEGY).toBe("strict");
    });
  });
});

describe("validateArray", () => {
  describe("strict mode", () => {
    it("returns validated array on success", () => {
      const data = [
        { id: "1", name: "first" },
        { id: "2", name: "second" },
      ];
      const result = validateArray(TestItemSchema, data, "strict");
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("2");
    });

    it("throws on first invalid item", () => {
      const data = [
        { id: "1", name: "valid" },
        { name: "invalid - no id" },
        { id: "3", name: "also valid" },
      ];
      
      try {
        validateArray(TestItemSchema, data, "strict", "TestItem");
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        const err = e as ValidationError;
        expect(err.message).toContain("index 1");
      }
    });

    it("throws on non-array input", () => {
      const data = { not: "an array" };
      expect(() => validateArray(TestItemSchema, data, "strict")).toThrow(ValidationError);
    });

    it("includes index in error path", () => {
      const data = [{ name: "no id" }];
      
      try {
        validateArray(TestItemSchema, data, "strict");
        expect(true).toBe(false);
      } catch (e) {
        const err = e as ValidationError;
        // The path should include the array index
        expect(err.issues[0].path[0]).toBe(0);
      }
    });
  });

  describe("warn mode", () => {
    let warnSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
      warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it("returns all valid items and drops invalid ones", () => {
      const data = [
        { id: "1", name: "valid" },
        { name: "invalid - no id" },
        { id: "3", name: "also valid" },
      ];
      
      const result = validateArray(TestItemSchema, data, "warn", "TestItem");
      
      // Only valid items returned
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("1");
      expect(result[1].id).toBe("3");
      
      // Warning logged
      expect(warnSpy).toHaveBeenCalled();
      const warnCall = warnSpy.mock.calls[0][0];
      expect(warnCall).toContain("1/3 items failed");
      expect(warnCall).toContain("indices: 1");
    });

    it("returns empty array and warns on non-array input", () => {
      const data = "not an array";
      const result = validateArray(TestItemSchema, data, "warn");
      
      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
    });

    it("does not warn when all items valid", () => {
      const data = [{ id: "1" }, { id: "2" }];
      validateArray(TestItemSchema, data, "warn");
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("handles multiple invalid items", () => {
      const data = [
        { name: "invalid 0" },
        { id: "1", name: "valid" },
        { name: "invalid 2" },
        { name: "invalid 3" },
      ];
      
      const result = validateArray(TestItemSchema, data, "warn", "TestItem");
      
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("1");
      
      const warnCall = warnSpy.mock.calls[0][0];
      expect(warnCall).toContain("3/4 items failed");
      expect(warnCall).toContain("indices: 0, 2, 3");
    });
  });

  describe("off mode", () => {
    it("returns data as-is", () => {
      const data = [
        { totally: "invalid" },
        { also: "invalid" },
      ];
      const result = validateArray(TestItemSchema, data, "off");
      expect(result.length).toBe(2);
      expect((result[0] as any).totally).toBe("invalid");
    });

    it("returns empty array for null/undefined", () => {
      expect(validateArray(TestItemSchema, null, "off")).toEqual([]);
      expect(validateArray(TestItemSchema, undefined, "off")).toEqual([]);
    });
  });
});

describe("ValidationError", () => {
  it("has correct name", () => {
    const err = new ValidationError("test", [], "TestEntity");
    expect(err.name).toBe("ValidationError");
  });

  it("stores issues and entity type", () => {
    const issues = [
      { code: "invalid_type" as const, expected: "string" as const, path: ["field"], message: "Expected string" },
    ];
    const err = new ValidationError("test", issues, "TestEntity");
    
    expect(err.issues).toEqual(issues);
    expect(err.entityType).toBe("TestEntity");
  });

  it("formatForUser includes path and message", () => {
    const issues = [
      { code: "invalid_type" as const, expected: "string" as const, path: ["user", "name"], message: "Expected string" },
      { code: "invalid_type" as const, expected: "number" as const, path: ["count"], message: "Expected number" },
    ];
    const err = new ValidationError("Validation failed", issues, "TestEntity");
    
    const formatted = err.formatForUser();
    expect(formatted).toContain("Validation failed");
    expect(formatted).toContain("user.name: Expected string");
    expect(formatted).toContain("count: Expected number");
  });

  it("formatForUser limits to 5 issues", () => {
    const issues = Array.from({ length: 10 }, (_, i) => ({
      code: "invalid_type" as const,
      expected: "string" as const,
      path: [`field${i}`],
      message: `Error ${i}`,
    }));
    const err = new ValidationError("Validation failed", issues);
    
    const formatted = err.formatForUser();
    expect(formatted).toContain("field0");
    expect(formatted).toContain("field4");
    expect(formatted).not.toContain("field5");
    expect(formatted).toContain("5 more issues");
  });
});
