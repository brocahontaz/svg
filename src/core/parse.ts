import { SvgError } from './errors';
import { byteLength, enforceLimit } from './limits';

export interface SvgMetadata {
  widthAttr: string | null;
  heightAttr: string | null;
  widthPx: number | null;
  heightPx: number | null;
  viewBox: string | null;
  viewBoxValues: [number, number, number, number] | null;
  elementCount: number;
  pathCount: number;
  byteSize: number;
}
const px = (v: string | null): number | null => {
  if (!v) return null;
  const m = v.trim().match(/^([\d.+-]+)(?:px)?$/i);
  return m ? Number(m[1]) : null;
};

/** Parse SVG XML and extract document metadata. */
export function parseSvg(source: string): {
  doc: XMLDocument;
  svg: Element;
  metadata: SvgMetadata;
} {
  if (!source.trim()) throw new SvgError('Input is empty.');
  enforceLimit(source);
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const error =
    doc.querySelector('parsererror') ??
    (doc.documentElement.localName === 'parsererror' ? doc.documentElement : null);
  if (error)
    throw new SvgError(
      `Invalid XML: ${(error.textContent ?? 'malformed document').replace(/\s+/g, ' ').trim()}`,
    );
  const roots = Array.from(doc.childNodes).filter((n) => n.nodeType === Node.ELEMENT_NODE);
  const svg = doc.documentElement;
  if (
    roots.length !== 1 ||
    svg.localName !== 'svg' ||
    svg.namespaceURI !== 'http://www.w3.org/2000/svg'
  )
    throw new SvgError('Root element must be <svg> in the SVG namespace.');
  const elements = Array.from(svg.querySelectorAll('*'));
  const rawView = svg.getAttribute('viewBox');
  const vals = rawView
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  return {
    doc,
    svg,
    metadata: {
      widthAttr: svg.getAttribute('width'),
      heightAttr: svg.getAttribute('height'),
      widthPx: px(svg.getAttribute('width')),
      heightPx: px(svg.getAttribute('height')),
      viewBox: rawView,
      viewBoxValues:
        vals?.length === 4 && vals.every(Number.isFinite)
          ? (vals as [number, number, number, number])
          : null,
      elementCount: elements.length + 1,
      pathCount: elements.filter((e) => e.localName === 'path').length,
      byteSize: byteLength(source),
    },
  };
}
