import { describe, expect, it } from 'vitest';
import { sanitizeSvg } from './sanitize';

const clean = (content: string) =>
  sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`);

describe('sanitizeSvg', () => {
  it('removes scripts and event handlers', () => {
    const result = clean(
      '<script>alert(1)</script><g onclick="x" /><use href="javascript:alert(1)" />',
    );
    expect(result.svgText).not.toMatch(/script|onclick|javascript/);
    expect(result.findings).toHaveLength(3);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        'Removed <script> element',
        'Removed event handler attribute "onclick"',
        'Removed unsafe URL in <use href>',
      ]),
    );
  });
  it('removes unsafe use URLs and external resources', () => {
    for (const href of ['http://example.com/x.png', 'x.png']) {
      const result = clean(`<image href="${href}" />`);
      expect(result.svgText).not.toContain(`href="${href}"`);
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0]).toContain('unsafe URL');
    }
  });
  it('keeps safe links and images', () => {
    const result = clean(
      '<a href="https://example.com"><image href="data:image/png;base64,iVBORw0KGgo=" /></a>',
    );
    expect(result.svgText).toContain('href="https://example.com"');
    expect(result.svgText).toContain('href="data:image/png;base64,iVBORw0KGgo="');
    expect(result.findings).toEqual([]);
  });
  it('removes SVG data images and foreign objects', () => {
    const result = clean(
      '<image href="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3C/svg%3E" /><foreignObject><div /></foreignObject>',
    );
    expect(result.svgText).not.toMatch(/svg\+xml|foreignObject/);
    expect(result.svgText).not.toContain('href=');
    expect(result.findings).toHaveLength(2);
    expect(result.findings).toEqual(
      expect.arrayContaining([
        'Removed unsafe URL in <image href>',
        'Removed <foreignObject> element',
      ]),
    );
  });
  it('keeps safe links and fragment references while removing unsafe links', () => {
    const safeLink = clean('<a href="https://example.com" />');
    expect(safeLink.svgText).toContain('href="https://example.com"');
    expect(safeLink.findings).toEqual([]);

    const javascriptLink = clean('<a href="javascript:alert(1)" />');
    expect(javascriptLink.svgText).not.toContain('javascript');
    expect(javascriptLink.findings).toHaveLength(1);

    const fragment = clean('<use href="#thing" />');
    expect(fragment.svgText).toContain('href="#thing"');
    expect(fragment.findings).toEqual([]);
  });
  it('removes href animations but keeps ordinary animations', () => {
    const result = clean(
      '<animate attributeName="href" to="javascript:x" /><animate attributeName="opacity" to="0" />',
    );
    expect(result.svgText).not.toContain('attributeName="href"');
    expect(result.svgText).toContain('attributeName="opacity"');
  });
  it('cleans CSS imports and external URLs while keeping fragments', () => {
    const result = clean(
      '<style>@import url(https://x); .a{fill:url(#paint);stroke:url(https://x)}</style><path style="fill:url(#paint);stroke:url(http://x)" />',
    );
    expect(result.svgText).not.toContain('@import');
    expect(result.svgText).toContain('url(#paint)');
    expect(result.svgText).not.toContain('https://x');
  });
  it('applies the same safe URL policy to style attributes and elements', () => {
    for (const content of [
      "fill:url(#grad);stroke:url(data:image/png;base64,iVBORw0KGgo=);color:url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E);marker:url(http://evil/x.png)",
      "@import url(http://evil);fill:url(#grad);color:url(data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3C/svg%3E)",
    ]) {
      const attribute = clean(`<path style="${content}" />`);
      expect(attribute.svgText).toContain('url(#grad)');
      if (content.includes('data:image/png'))
        expect(attribute.svgText).toContain('url(data:image/png;base64,iVBORw0KGgo=)');
      expect(attribute.svgText).not.toContain('svg+xml');
      expect(attribute.svgText).not.toContain('http://evil');
      expect(attribute.findings).toHaveLength(1);

      const element = clean(`<style>${content}</style>`);
      expect(element.svgText).toContain('url(#grad)');
      if (content.includes('data:image/png'))
        expect(element.svgText).toContain('url(data:image/png;base64,iVBORw0KGgo=)');
      expect(element.svgText).not.toContain('svg+xml');
      expect(element.svgText).not.toContain('http://evil');
      expect(element.findings).toHaveLength(1);
    }
  });
  it('leaves clean SVG functionally unchanged', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0" /></svg>';
    const result = sanitizeSvg(source);
    expect(result.findings).toEqual([]);
    expect(result.svgText).toContain('<path d="M0 0"');
  });
});
