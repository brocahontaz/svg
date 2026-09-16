import { describe, expect, it } from 'vitest';
import { minifySvg } from './minify';
describe('minifySvg', () => {
  it('removes layout whitespace but keeps comments and text', () => {
    const out = minifySvg(
      '<svg xmlns="http://www.w3.org/2000/svg">\n <!--x--> <text>a  b</text> </svg>',
    );
    expect(out).not.toMatch(/>\s+</);
    expect(out).toContain('<!--x-->');
    expect(out).toContain('a b');
  });
  it('returns one line and removes layout whitespace', () => {
    const out = minifySvg(
      '<svg xmlns="http://www.w3.org/2000/svg">\n <g>\n <path />\n </g>\n</svg>',
    );
    expect(out).not.toMatch(/\n/);
    expect(out).not.toMatch(/>\s+</);
  });
  it('preserves significant tspan spaces', () => {
    expect(
      minifySvg(
        '<svg xmlns="http://www.w3.org/2000/svg"><text>a<tspan>b</tspan> <tspan>c</tspan></text></svg>',
      ),
    ).toContain('</tspan> <tspan>');
  });
  it('preserves xml space and comments', () => {
    expect(
      minifySvg(
        '<svg xmlns="http://www.w3.org/2000/svg"><text xml:space="preserve">  a  b </text><!--x--></svg>',
      ),
    ).toContain('  a  b ');
    expect(minifySvg('<svg xmlns="http://www.w3.org/2000/svg"><!--x--></svg>')).toContain(
      '<!--x-->',
    );
  });
  it('collapses ordinary text whitespace', () => {
    expect(
      minifySvg('<svg xmlns="http://www.w3.org/2000/svg"><text> a\n  b </text></svg>'),
    ).toContain('<text>a b</text>');
  });
  it('preserves style content whitespace', () => {
    expect(
      minifySvg(
        '<svg xmlns="http://www.w3.org/2000/svg"><style> .a { content: "a  b"; } </style></svg>',
      ),
    ).toContain('<style> .a { content: "a  b"; } </style>');
  });
});
