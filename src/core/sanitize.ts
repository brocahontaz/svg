import { parseSvg } from './parse';
const bad = new Set([
  'script',
  'foreignObject',
  'iframe',
  'embed',
  'object',
  'audio',
  'video',
  'handler',
  'annotation-xml',
]);
const urlAttrs = new Set(['href', 'xlink:href', 'src', 'action', 'formaction', 'poster']);

/** Remove active and external content from SVG markup for safe previewing. */
export function sanitizeSvg(source: string): { svgText: string; findings: string[] } {
  const { doc, svg } = parseSvg(source);
  const findings: string[] = [];
  const remove = (e: Element, msg: string) => {
    e.remove();
    findings.push(msg);
  };
  [svg, ...Array.from(svg.querySelectorAll('*'))].reverse().forEach((e) => {
    if (e.namespaceURI !== 'http://www.w3.org/2000/svg')
      return remove(e, `Removed <${e.localName}>`);
    if (bad.has(e.localName)) return remove(e, `Removed <${e.localName}> element`);
    if (
      ['animate', 'set', 'animateMotion', 'animateTransform'].includes(e.localName) &&
      /^(?:xlink:)?href$/i.test(e.getAttribute('attributeName') ?? '')
    )
      return remove(e, 'Removed animation targeting href');
    Array.from(e.attributes).forEach((a) => {
      if (/^on/i.test(a.name)) {
        e.removeAttribute(a.name);
        findings.push(`Removed event handler attribute "${a.name}"`);
        return;
      }
      if (urlAttrs.has(a.name.toLowerCase())) {
        const v = a.value.trim(),
          allow =
            /^#/.test(v) ||
            (e.localName === 'a' && /^(https:|mailto:)/i.test(v)) ||
            (e.localName === 'image' && /^data:image\/(?!svg\+xml)/i.test(v));
        if (!allow) {
          e.removeAttribute(a.name);
          findings.push(`Removed unsafe URL in <${e.localName} ${a.name}>`);
        }
      }
    });
  });
  svg.querySelectorAll('[style]').forEach((e) => {
    const a = e.getAttribute('style') ?? '',
      clean = a
        .replace(/@import[^;]+;?/gi, '')
        .replace(/url\(([^)]*)\)/gi, (_, u: string) =>
          /^\s*(#|data:image\/(?!svg\+xml))/i.test(u) ? `url(${u})` : '',
        );
    if (clean !== a) {
      e.setAttribute('style', clean);
      findings.push('Removed external URL from CSS');
    }
  });
  svg.querySelectorAll('style').forEach((e) => {
    const t = e.textContent ?? '',
      clean = t
        .replace(/@import[^;]+;?/gi, '')
        .replace(/url\(([^)]*)\)/gi, (_, u: string) =>
          /^\s*(#|data:image\/(?!svg\+xml))/i.test(u) ? `url(${u})` : '',
        );
    if (clean !== t) {
      e.textContent = clean;
      findings.push('Removed external URL from CSS');
    }
  });
  return { svgText: new XMLSerializer().serializeToString(doc), findings };
}
