import { parseSvg } from './parse';

const textish = new Set(['text', 'tspan', 'textPath', 'style']);

function visit(e: Element, preserve: boolean): void {
  const keep = preserve || e.getAttribute('xml:space') === 'preserve' || e.localName === 'style';
  Array.from(e.childNodes).forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      if (!n.nodeValue?.trim()) {
        if (!textish.has(e.localName)) e.removeChild(n);
        else if (!keep) n.nodeValue = ' ';
      } else if (!keep) n.nodeValue = n.nodeValue.replace(/\s+/g, ' ').trim();
    } else if (n.nodeType === Node.ELEMENT_NODE) visit(n as Element, keep);
  });
}

/** Remove insignificant SVG whitespace while preserving text content. */
export function minifySvg(source: string): string {
  const { doc, svg } = parseSvg(source);
  visit(svg, false);
  const out = new XMLSerializer().serializeToString(doc);
  return out.trim();
}
