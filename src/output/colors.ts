/**
 * Color utilities using picocolors.
 */
import pc from "picocolors";

export { pc };

export const colors = {
  error: pc.red,
  success: pc.green,
  warning: pc.yellow,
  info: pc.cyan,
  dim: pc.dim,
  bold: pc.bold,
};
