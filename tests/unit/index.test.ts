/**
 * Tests for global options and CLI setup.
 */
import { describe, it, expect } from "bun:test";
import { Command } from "commander";
import { getGlobalOptions } from "../../src/index.js";

describe("getGlobalOptions", () => {
  it("returns strict as default validation strategy", () => {
    const program = new Command();
    const opts = getGlobalOptions(program);

    expect(opts.validation).toBe("strict");
  });

  it("extracts validation option from root command", () => {
    const program = new Command();
    program.setOptionValue("validation", "warn");

    const opts = getGlobalOptions(program);

    expect(opts.validation).toBe("warn");
  });

  it("walks up to root command from subcommand", () => {
    const program = new Command();
    program.setOptionValue("validation", "off");

    const subcommand = new Command("test");
    program.addCommand(subcommand);

    const opts = getGlobalOptions(subcommand);

    expect(opts.validation).toBe("off");
  });

  it("walks up multiple levels to root command", () => {
    const program = new Command();
    program.setOptionValue("validation", "warn");

    const subcommand1 = new Command("level1");
    const subcommand2 = new Command("level2");
    program.addCommand(subcommand1);
    subcommand1.addCommand(subcommand2);

    const opts = getGlobalOptions(subcommand2);

    expect(opts.validation).toBe("warn");
  });

  it("handles all valid validation strategies", () => {
    const strategies = ["strict", "warn", "off"] as const;

    for (const strategy of strategies) {
      const program = new Command();
      program.setOptionValue("validation", strategy);

      const opts = getGlobalOptions(program);

      expect(opts.validation).toBe(strategy);
    }
  });
});
