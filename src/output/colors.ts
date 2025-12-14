/**
 * Simple ANSI color utilities.
 * Replaces picocolors with ~15 lines of code.
 */

const isColorSupported =
  !process.env.NO_COLOR &&
  (process.env.FORCE_COLOR !== "0") &&
  (process.stdout.isTTY || process.env.FORCE_COLOR === "1");

function fmt(code: number): (s: string) => string {
  return isColorSupported
    ? (s: string) => `\x1b[${code}m${s}\x1b[0m`
    : (s: string) => s;
}

// Colors
export const red = fmt(31);
export const green = fmt(32);
export const yellow = fmt(33);
export const cyan = fmt(36);

// Styles
export const dim = fmt(2);
export const bold = fmt(1);

// Convenience object matching picocolors API
export const pc = { red, green, yellow, cyan, dim, bold };

export const colors = {
  error: red,
  success: green,
  warning: yellow,
  info: cyan,
  dim,
  bold,
};
