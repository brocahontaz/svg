import { describe, expect, it } from 'vitest';
import { formatSvg } from './format';
describe('formatSvg', () => {
  it('indents nested elements and preserves comments', () => {
    const out = formatSvg(
      '<?xml version="1.0"?><!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg"><g><!-- hi --><text>Hello  world</text></g></svg>',
    );
    expect(out).toContain('  <g>');
    expect(out).toContain('<text>Hello  world</text>');
    expect(out).toContain('<!-- hi -->');
    expect(out).toContain('<!DOCTYPE svg>');
  });
  it('self-closes empty elements', () => {
    expect(formatSvg('<svg xmlns="http://www.w3.org/2000/svg"><g /></svg>')).toContain('  <g />');
  });
  it('keeps text-ish content inline without injected whitespace', () => {
    const out = formatSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><text>a<b>c</b>d</text><style><![CDATA[a{b:c}]]></style></svg>',
    );
    expect(out).toContain('<text>a<b>c</b>d</text>');
    expect(out).toContain('<style><![CDATA[a{b:c}]]></style>');
  });
  it('round-trips escaped text and inline comments', () => {
    const out = formatSvg(
      '<svg xmlns="http://www.w3.org/2000/svg"><text>a&lt;b &amp; "c"<!--note-->x</text></svg>',
    );
    expect(out).toContain('a&lt;b &amp; &quot;c&quot;<!--note-->x');
  });
  it('preserves declaration and doctype', () => {
    expect(
      formatSvg('<?xml version="1.0"?><!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" />'),
    ).toMatch(/^<\?xml[\s\S]*<!DOCTYPE svg>/);
  });
});
