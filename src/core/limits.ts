import { SvgError } from './errors';

export const MAX_INPUT_BYTES = 2 * 1024 * 1024;
export const MAX_INSPECTOR_NODES = 1500;

/** Return the UTF-8 byte length of a string. */
export const byteLength = (s: string): number => new TextEncoder().encode(s).length;

/** Format a byte count using a compact human-readable unit. */
export function formatBytes(n: number): string {
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${parseFloat((n / 1024).toFixed(1))} KB`;
  return `${parseFloat((n / 1024 / 1024).toFixed(1))} MB`;
}

/** Reject SVG input larger than the supported safety limit. */
export function enforceLimit(s: string): void {
  if (byteLength(s) > MAX_INPUT_BYTES) throw new SvgError('Input exceeds the 2 MB limit.');
}
