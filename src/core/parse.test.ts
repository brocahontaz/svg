import { describe, expect, it } from 'vitest';
import { parseSvg } from './parse';
import { byteLength } from './limits';
describe('parseSvg', () => {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="10" viewBox="0 0 20 10"><path d="M0 0"/></svg>';
  it('extracts metadata', () => {
    const { metadata } = parseSvg(svg);
    expect(metadata.widthAttr).toBe('20px');
    expect(metadata.heightAttr).toBe('10');
    expect(metadata.viewBox).toBe('0 0 20 10');
    expect(metadata.widthPx).toBe(20);
    expect(metadata.heightPx).toBe(10);
    expect(metadata.viewBoxValues).toEqual([0, 0, 20, 10]);
    expect(metadata.elementCount).toBe(2);
    expect(metadata.pathCount).toBe(1);
    expect(metadata.byteSize).toBe(byteLength(svg));
  });
  it('rejects empty input', () => expect(() => parseSvg('')).toThrow('empty'));
  it('rejects oversized input', () =>
    expect(() => parseSvg(`<svg>${'x'.repeat(2 * 1024 * 1024)}</svg>`)).toThrow('2 MB'));
  it('reports malformed XML', () =>
    expect(() => parseSvg('<svg><g></svg>')).toThrow(/Invalid XML/));
  it('rejects non-SVG roots and HTML', () => {
    expect(() => parseSvg('<html><body>x</body></html>')).toThrow('Root element');
    expect(() => parseSvg('<div />')).toThrow('Root element');
  });
});
