import { parseSvg } from './parse';
import { escapeXml } from './util';

const textish = new Set(['text', 'tspan', 'textPath', 'style', 'script', 'title', 'desc']);
function attrs(e: Element): string {
  return Array.from(e.attributes)
    .map((a) => `${a.name}="${escapeXml(a.value)}"`)
    .join(' ');
}

function inlineChild(n: Node): string {
  if (n.nodeType === Node.ELEMENT_NODE) return node(n, 0, false).trim();
  if (n.nodeType === Node.COMMENT_NODE) return `<!--${n.nodeValue ?? ''}-->`;
  if (n.nodeType === Node.CDATA_SECTION_NODE) return `<![CDATA[${n.nodeValue ?? ''}]]>`;
  return n.nodeType === Node.TEXT_NODE ? escapeXml(n.nodeValue ?? '') : '';
}

function node(n: Node, depth: number, pretty: boolean): string {
  if (n.nodeType === Node.COMMENT_NODE) return `${'  '.repeat(depth)}<!--${n.nodeValue ?? ''}-->`;
  if (n.nodeType === Node.CDATA_SECTION_NODE)
    return `${'  '.repeat(depth)}<![CDATA[${n.nodeValue ?? ''}]]>`;
  if (n.nodeType === Node.TEXT_NODE) return n.nodeValue ?? '';
  if (n.nodeType !== Node.ELEMENT_NODE) return '';
  const e = n as Element,
    pad = '  '.repeat(depth),
    a = attrs(e),
    open = `<${e.tagName}${a ? ` ${a}` : ''}`;
  if (!e.childNodes.length) return `${pad}${open} />`;
  const inline =
    textish.has(e.localName) ||
    Array.from(e.childNodes).some(
      (x) => x.nodeType === Node.TEXT_NODE && (x.nodeValue ?? '').trim(),
    );
  if (inline)
    return `${pad}${open}>${Array.from(e.childNodes).map(inlineChild).join('')}</${e.tagName}>`;
  const children = Array.from(e.childNodes)
    .filter((x) => !(x.nodeType === Node.TEXT_NODE && !(x.nodeValue ?? '').trim()))
    .map((x) => node(x, depth + 1, pretty))
    .filter(Boolean)
    .join('\n');
  return `${pad}${open}>\n${children}\n${pad}</${e.tagName}>`;
}

/** Format SVG markup with readable indentation without changing its content. */
export function formatSvg(source: string): string {
  const { doc, svg } = parseSvg(source);
  const declaration = source.match(/^\s*(<\?xml\b[^?]*\?>)/i)?.[1];
  const pre = Array.from(doc.childNodes)
    .filter(
      (n) =>
        n !== svg &&
        (n.nodeType === Node.PROCESSING_INSTRUCTION_NODE || n.nodeType === Node.DOCUMENT_TYPE_NODE),
    )
    .map((n) => new XMLSerializer().serializeToString(n))
    .map((value) => value)
    .join('\n');
  const prefix = [declaration, pre].filter(Boolean).join('\n');
  return `${prefix ? `${prefix}\n` : ''}${node(svg, 0, true)}`;
}
