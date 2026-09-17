import { formatSvg } from './format';
import { parseSvg } from './parse';
export interface OptimizeOptions {
  removeComments: boolean;
  removeMetadata: boolean;
  removeEditorData: boolean;
  removeRedundant: boolean;
  removeUnusedIds: boolean;
  removeEmptyContainers: boolean;
  convertXlinkToHref: boolean;
}
export const DEFAULT_OPTIMIZE_OPTIONS: OptimizeOptions = {
  removeComments: true,
  removeMetadata: true,
  removeEditorData: true,
  removeRedundant: true,
  removeUnusedIds: true,
  removeEmptyContainers: true,
  convertXlinkToHref: true,
};
const editors = /inkscape|sodipodi|sketch|figma|adobe|bohemiancoding/i;

function collectReferences(svg: Element): Set<string> {
  const references = new Set<string>();
  const serialized = new XMLSerializer().serializeToString(svg);
  const addMatches = (value: string, pattern: RegExp): void => {
    for (const match of value.matchAll(pattern)) references.add(match[1]);
  };

  addMatches(serialized, /url\(\s*#([A-Za-z_][\w:.-]*)/g);
  addMatches(serialized, /(?:href|xlink:href)\s*=\s*["']#([A-Za-z_][\w:.-]*)["']/g);
  for (const element of [svg, ...Array.from(svg.querySelectorAll('*'))]) {
    for (const name of ['aria-labelledby', 'aria-describedby', 'aria-details']) {
      for (const token of (element.getAttribute(name) ?? '').split(/\s+/)) {
        if (token) references.add(token);
      }
    }
    if (element.localName === 'style')
      addMatches(element.textContent ?? '', /#([A-Za-z_][\w:.-]*)/g);
    addMatches(element.getAttribute('style') ?? '', /#([A-Za-z_][\w:.-]*)/g);
  }
  return references;
}

/** Apply selected cleanup passes to SVG markup and report changes. */
export function optimizeSvg(
  source: string,
  options: Partial<OptimizeOptions> = {},
): { output: string; actions: string[] } {
  const o = { ...DEFAULT_OPTIMIZE_OPTIONS, ...options },
    { doc, svg } = parseSvg(source),
    actions: string[] = [];
  if (o.removeComments) {
    const ns = Array.from(doc.childNodes).flatMap((n) =>
      n.nodeType === Node.COMMENT_NODE ? [n] : [],
    );
    doc.querySelectorAll('*').forEach((e) =>
      Array.from(e.childNodes).forEach((n) => {
        if (n.nodeType === Node.COMMENT_NODE) ns.push(n);
      }),
    );
    ns.forEach((n) => n.parentNode?.removeChild(n));
    if (ns.length) actions.push(`Removed ${ns.length} comments`);
  }
  if (o.removeMetadata) {
    const es = Array.from(svg.querySelectorAll('metadata'));
    es.forEach((e) => e.remove());
    if (es.length) actions.push('Removed <metadata> elements');
    Array.from(doc.childNodes)
      .filter(
        (n) =>
          n.nodeType === Node.DOCUMENT_TYPE_NODE || n.nodeType === Node.PROCESSING_INSTRUCTION_NODE,
      )
      .forEach((n) => n.parentNode?.removeChild(n));
  }
  if (o.removeEditorData) {
    let count = 0;
    [svg, ...Array.from(svg.querySelectorAll('*'))].reverse().forEach((e) => {
      if (
        editors.test(e.namespaceURI ?? '') ||
        editors.test(e.prefix ?? '') ||
        editors.test(e.localName)
      ) {
        e.remove();
        count++;
        return;
      }
      Array.from(e.attributes).forEach((a) => {
        if (
          editors.test(a.namespaceURI ?? '') ||
          editors.test(a.prefix ?? '') ||
          editors.test(a.name)
        ) {
          e.removeAttribute(a.name);
          count++;
        }
      });
    });
    Array.from(svg.attributes).forEach((a) => {
      if (a.name.startsWith('xmlns:') && editors.test(a.value)) svg.removeAttribute(a.name);
    });
    if (count) actions.push(`Removed ${count} editor attributes`);
  }
  if (o.convertXlinkToHref) {
    let count = 0;
    svg.querySelectorAll('*').forEach((e) => {
      const x =
        e.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ?? e.getAttribute('xlink:href');
      if (x !== null) {
        if (!e.hasAttribute('href')) e.setAttribute('href', x);
        e.removeAttribute('xlink:href');
        e.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
        count++;
      }
    });
    if (count) actions.push(`Converted ${count} xlink:href to href`);
  }
  if (o.removeRedundant) {
    if (svg.hasAttribute('version')) {
      svg.removeAttribute('version');
      actions.push('Removed version attribute');
    }
    if (svg.getAttribute('xml:space') === 'default') svg.removeAttribute('xml:space');
    svg.querySelectorAll('[xml:space="default"]').forEach((e) => e.removeAttribute('xml:space'));
    if (!svg.querySelector('[xlink\\:href]') && !svg.getAttribute('xlink:href'))
      svg.removeAttribute('xmlns:xlink');
  }
  if (o.removeUnusedIds) {
    const references = collectReferences(svg);
    [svg, ...Array.from(svg.querySelectorAll('[id]'))].forEach((e) => {
      if (e.id && !references.has(e.id)) e.removeAttribute('id');
    });
  }
  if (o.removeEmptyContainers) {
    let count = 0,
      changed = true;
    while (changed) {
      changed = false;
      svg.querySelectorAll('g,defs').forEach((e) => {
        if (!e.querySelector('*') && !(e.textContent ?? '').trim()) {
          e.remove();
          count++;
          changed = true;
        }
      });
    }
    if (count) actions.push(`Removed ${count} empty container elements`);
  }
  return { output: formatSvg(new XMLSerializer().serializeToString(doc)), actions };
}
