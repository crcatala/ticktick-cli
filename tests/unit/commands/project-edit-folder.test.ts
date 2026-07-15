/**
 * Unit tests for the `project edit` folder option resolution.
 *
 * Covers the regression where `--no-folder` was a silent no-op: the action
 * previously read `options.noFolder`, but Commander stores a negated `--no-*`
 * flag under the stripped option name as `folder === false` (never a `noFolder`
 * key). These tests pin the real Commander option shape and assert that
 * `resolveFolderIntent` maps `--no-folder` (and its aliases) to a clear intent
 * that the action handler turns into `groupId: "NONE"`.
 */
import { describe, it, expect } from "bun:test";
import { Command } from "commander";
import { createProjectCommand, resolveFolderIntent } from "../../../src/commands/project.js";

/**
 * Parse argv against the real `project edit` command and return its opts.
 *
 * The registered action is never allowed to run: we swap in a stub action that
 * just captures parsed options, then parse with `from: "user"`.
 */
function parseEditOpts(argv: string[]): Record<string, unknown> {
  const project = createProjectCommand();
  const edit = project.commands.find((c) => c.name() === "edit") as Command;

  let captured: Record<string, unknown> = {};
  // Replace the real action with a capture-only stub so no I/O runs.
  // The edit command declares `<id>`, so its action receives (id, options).
  edit.action((_id, opts) => {
    captured = opts as Record<string, unknown>;
  });

  // `from: "user"` expects raw argv without the node/script prefix.
  project.parse(["edit", ...argv], { from: "user" });
  return captured;
}

describe("project edit --no-folder option parsing", () => {
  it("exposes --no-folder as folder===false (not a noFolder key)", () => {
    // This documents the Commander behavior that caused the original bug.
    const opts = parseEditOpts(["abc", "--no-folder"]);
    expect(opts.folder).toBe(false);
    expect(opts.noFolder).toBeUndefined();
  });

  it("leaves folder undefined when no folder flag is given", () => {
    const opts = parseEditOpts(["abc"]);
    expect(opts.folder).toBeUndefined();
  });

  it("parses --folder <id> into the folder value", () => {
    const opts = parseEditOpts(["abc", "--folder", "f1"]);
    expect(opts.folder).toBe("f1");
  });

  it("parses --clear-folder as clearFolder===true", () => {
    const opts = parseEditOpts(["abc", "--clear-folder"]);
    expect(opts.clearFolder).toBe(true);
  });

  it("parses --clear-group as clearGroup===true", () => {
    const opts = parseEditOpts(["abc", "--clear-group"]);
    expect(opts.clearGroup).toBe(true);
  });
});

describe("resolveFolderIntent", () => {
  it("returns a clear intent for --no-folder (folder === false)", () => {
    const intent = resolveFolderIntent({ folder: false });
    expect(intent).toEqual({ set: undefined, clear: true });
  });

  it("returns a clear intent for --clear-folder", () => {
    const intent = resolveFolderIntent({ clearFolder: true });
    expect(intent).toEqual({ set: undefined, clear: true });
  });

  it("returns a clear intent for --clear-group", () => {
    const intent = resolveFolderIntent({ clearGroup: true });
    expect(intent).toEqual({ set: undefined, clear: true });
  });

  it("returns a set intent for --folder <id>", () => {
    const intent = resolveFolderIntent({ folder: "f1" });
    expect(intent).toEqual({ set: "f1", clear: false });
  });

  it("returns a set intent for --group <id>", () => {
    const intent = resolveFolderIntent({ group: "g1" });
    expect(intent).toEqual({ set: "g1", clear: false });
  });

  it("returns a none intent when no folder flags are given", () => {
    const intent = resolveFolderIntent({});
    expect(intent).toEqual({ set: undefined, clear: false });
  });

  it("does not treat folder===false as a set intent", () => {
    // Regression guard: `false` must never produce `set: "false"`.
    const intent = resolveFolderIntent({ folder: false });
    expect(intent.set).toBeUndefined();
  });

  it("throws when both a set and clear intent are supplied", () => {
    // A set intent (--folder/--group) combined with an explicit clear alias.
    expect(() => resolveFolderIntent({ folder: "f1", clearFolder: true })).toThrow(
      /Cannot use both/
    );
    expect(() => resolveFolderIntent({ group: "g1", clearGroup: true })).toThrow(
      /Cannot use both/
    );
  });
});

describe("project edit --no-folder end-to-end intent", () => {
  // The action handler maps a clear intent onto `groupId: "NONE"` (the magic
  // value the TickTick API uses to remove a project from its folder). We can't
  // exercise the network here, so we verify the intent the action would receive
  // and the mapping the action performs for clear intents.
  it("--no-folder produces a clear intent that maps to groupId 'NONE'", () => {
    const opts = parseEditOpts(["abc", "--no-folder"]);
    const intent = resolveFolderIntent(opts);

    expect(intent.clear).toBe(true);
    expect(intent.set).toBeUndefined();

    // Mirror the action's clear mapping (src/commands/project.ts).
    const updateData: { groupId?: string } = {};
    if (intent.set) {
      updateData.groupId = intent.set; // set path, not taken here
    }
    if (intent.clear) {
      updateData.groupId = "NONE";
    }
    expect(updateData.groupId).toBe("NONE");
  });

  it("--clear-folder produces a clear intent that maps to groupId 'NONE'", () => {
    const opts = parseEditOpts(["abc", "--clear-folder"]);
    const intent = resolveFolderIntent(opts);
    expect(intent.clear).toBe(true);

    const updateData: { groupId?: string } = {};
    if (intent.clear) updateData.groupId = "NONE";
    expect(updateData.groupId).toBe("NONE");
  });

  it("--folder <id> produces a set intent (no groupId 'NONE')", () => {
    const opts = parseEditOpts(["abc", "--folder", "f1"]);
    const intent = resolveFolderIntent(opts);
    expect(intent.set).toBe("f1");
    expect(intent.clear).toBe(false);
  });
});