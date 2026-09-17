import { describe, expect, it } from 'vitest';
import { optimizeSvg } from './optimize';
import { parseSvg } from './parse';

const root = '<svg xmlns="http://www.w3.org/2000/svg">CONTENT</svg>';
const only = (source: string, option: string) =>
  optimizeSvg(source, {
    removeComments: false,
    removeMetadata: false,
    removeEditorData: false,
    removeRedundant: false,
    removeUnusedIds: false,
    removeEmptyContainers: false,
    convertXlinkToHref: false,
    [option]: true,
  });

describe('optimizeSvg', () => {
  it('removes comments and reports the action', () => {
    const result = only(root.replace('CONTENT', '<!--x-->'), 'removeComments');
    expect(result.output).not.toContain('<!--x-->');
    expect(result.actions).toContain('Removed 1 comments');
  });
  it('removes metadata, declaration, and doctype', () => {
    const result = only(
      '<?xml version="1.0"?><!DOCTYPE svg>' + root.replace('CONTENT', '<metadata />'),
      'removeMetadata',
    );
    expect(result.output).not.toContain('metadata');
    expect(result.output).not.toContain('<?xml');
    expect(result.output).not.toContain('<!DOCTYPE');
  });
  it('removes editor data from root and descendants', () => {
    const source =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" inkscape:version="1.2"><g sodipodi:docname="x" /></svg>';
    const result = only(source, 'removeEditorData');
    expect(result.output).not.toMatch(/inkscape|sodipodi/);
  });
  it('removes redundant root attributes', () => {
    const result = only(
      '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="default"><g xml:space="default" /></svg>',
      'removeRedundant',
    );
    expect(result.output).not.toMatch(/version|xml:space|xmlns:xlink/);
  });
  it('converts xlink href and keeps an existing href', () => {
    const converted = only(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#a" /></svg>',
      'convertXlinkToHref',
    );
    expect(converted.output).toContain('href="#a"');
    expect(converted.output).not.toContain('xlink:href');
    const duplicate = only(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use href="#b" xlink:href="#a" /></svg>',
      'convertXlinkToHref',
    );
    expect(duplicate.output).toContain('href="#b"');
    expect(duplicate.output).not.toContain('#a');
  });
  it.each([
    ['url', '<defs><linearGradient id="paint" /></defs><rect fill="url(#paint)" id="unused" />'],
    ['href', '<defs><path id="shape" /></defs><use href="#shape" id="unused" />'],
    ['aria two tokens', '<title id="one" /><desc id="two" /><g aria-labelledby="one two" />'],
    ['aria one token', '<title id="label" /><g aria-labelledby="label" />'],
    ['style element', '<style>#mylabel{fill:red}</style><path id="mylabel" />'],
    ['style attribute', '<path id="styled" style="fill:url(#styled)" />'],
  ])('keeps %s references and removes unused ids', (_, content) => {
    const result = only(
      root.replace('CONTENT', content + '<path id="unused" />'),
      'removeUnusedIds',
    );
    expect(result.output).toContain('id="' + (content.match(/id="([^"]+)/)?.[1] ?? '') + '"');
    expect(result.output).not.toContain('id="unused"');
  });
  it('removes nested empty containers to a fixpoint', () => {
    const result = only(
      root.replace('CONTENT', '<g><defs><g /></defs></g><path />'),
      'removeEmptyContainers',
    );
    expect(result.output).not.toContain('<g');
    expect(result.output).not.toContain('<defs');
  });
  it('reports no changes when every pass is disabled', () => {
    const result = optimizeSvg(
      root,
      Object.fromEntries(
        Object.keys({
          removeComments: true,
          removeMetadata: true,
          removeEditorData: true,
          removeRedundant: true,
          removeUnusedIds: true,
          removeEmptyContainers: true,
          convertXlinkToHref: true,
        }).map((key) => [key, false]),
      ),
    );
    expect(result.actions).toEqual([]);
  });
  it('optimizes a dirty fixture into valid idempotent SVG', () => {
    const source =
      '<?xml version="1.0"?><!DOCTYPE svg><svg xmlns="http://www.w3.org/2000/svg" version="1.1"><metadata /><g><path id="used" d="M0 0" /></g><use href="#used" /></svg>';
    const first = optimizeSvg(source);
    expect(() => parseSvg(first.output)).not.toThrow();
    const second = optimizeSvg(first.output);
    expect(second.output).toBe(first.output);
    expect(second.actions).toEqual([]);
  });
});
