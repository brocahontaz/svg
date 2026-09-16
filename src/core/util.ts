export { formatBytes } from './limits';

/** Escape characters that have special meaning in XML text and attributes. */
export const escapeXml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
