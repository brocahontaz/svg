import { describe, expect, it } from 'vitest';
import { byteLength, formatBytes } from './limits';
describe('formatBytes', () => {
  it('formats useful units', () => {
    expect(formatBytes(980)).toBe('980 B');
    expect(formatBytes(1228)).toBe('1.2 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2 MB');
  });
  it('formats one decimal for kilobytes and megabytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
  });
  it('counts UTF-8 bytes', () => expect(byteLength('é🙂')).toBe(6));
});
