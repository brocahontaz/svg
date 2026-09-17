import './style.css';
import { formatSvg } from './core/format';
import { minifySvg } from './core/minify';
import { optimizeSvg, DEFAULT_OPTIMIZE_OPTIONS, type OptimizeOptions } from './core/optimize';
import { parseSvg } from './core/parse';
import { sanitizeSvg } from './core/sanitize';
import { byteLength, formatBytes, MAX_INSPECTOR_NODES } from './core/limits';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const source = $('source') as HTMLTextAreaElement,
  output = $('output') as HTMLTextAreaElement;
let lastMode = 'optimized',
  timer: number | undefined,
  basename = 'svg-output';
const options: OptimizeOptions = { ...DEFAULT_OPTIMIZE_OPTIONS };
Object.keys(options).forEach((key) => {
  const label = document.createElement('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = true;
  box.addEventListener('change', () => {
    options[key as keyof OptimizeOptions] = box.checked;
  });
  label.append(
    box,
    ` ${key
      .replace(/^remove|^convert/, '')
      .replace(/[A-Z]/g, (x) => ` ${x}`)
      .trim()}`,
  );
  $('options').append(label);
});
function clearView(): void {
  $('metadata').replaceChildren();
  $('tree').replaceChildren();
  $('warnings').replaceChildren();
  $('actions').replaceChildren();
  $('copy').setAttribute('disabled', '');
  $('download').setAttribute('disabled', '');
  $('empty').hidden = false;
  const frame = document.querySelector('iframe') as HTMLIFrameElement | null;
  if (frame) frame.srcdoc = '';
}
function countElements(e: Element): number {
  return 1 + Array.from(e.children).reduce((total, child) => total + countElements(child), 0);
}

function renderTree(e: Element, state: { count: number }): HTMLElement {
  state.count++;
  const d = document.createElement('details');
  const s = document.createElement('summary');
  const hint =
    (e.id ? ` #${e.id}` : '') +
    (e.className && typeof e.className === 'string' ? ` .${e.className.split(' ').join('.')}` : '');
  s.textContent = `${e.localName}${hint} (${e.children.length})`;
  d.append(s);
  for (const child of Array.from(e.children)) {
    if (state.count >= MAX_INSPECTOR_NODES) {
      const note = document.createElement('span');
      note.className = 'muted';
      note.textContent = `+${countElements(child)} more elements not shown`;
      d.append(note);
      break;
    }
    d.append(renderTree(child, state));
  }
  return d;
}

function renderMetadata(metadata: ReturnType<typeof parseSvg>['metadata']): void {
  const rows: Array<[string, string | number]> = [
    ['Width', String(metadata.widthPx ?? metadata.widthAttr ?? '—')],
    ['Height', String(metadata.heightPx ?? metadata.heightAttr ?? '—')],
    ['Viewbox', metadata.viewBox ?? '—'],
    ['Elements', metadata.elementCount],
    ['Paths', metadata.pathCount],
    ['File size', formatBytes(metadata.byteSize)],
  ];
  const target = $('metadata');
  target.replaceChildren();
  rows.forEach(([label, value]) => {
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = String(value);
    target.append(term, description);
  });
}

function renderList(id: string, values: string[]): void {
  const target = $(id);
  target.replaceChildren();
  values.forEach((value) => {
    const item = document.createElement('li');
    item.textContent = value;
    target.append(item);
  });
}
function live(): void {
  $('source-size').textContent = source.value
    ? formatBytes(new TextEncoder().encode(source.value).length)
    : '—';
  if (!source.value.trim()) {
    clearView();
    return;
  }
  try {
    const p = parseSvg(source.value),
      safe = sanitizeSvg(source.value);
    $('empty').hidden = true;
    const frame = document.querySelector('iframe') as HTMLIFrameElement;
    frame.srcdoc = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;height:100%;display:grid;place-items:center}svg{max-width:100%;max-height:100%}</style>${safe.svgText}`;
    const m = p.metadata;
    renderMetadata(m);
    renderList('warnings', safe.findings);
    $('tree').replaceChildren();
    $('tree').append(renderTree(p.svg, { count: 0 }));
    $('error').hidden = true;
  } catch (e) {
    clearView();
    $('error').textContent = e instanceof Error ? e.message : String(e);
    $('error').hidden = false;
  }
}
function transform(mode: string): void {
  try {
    lastMode = mode;
    const result =
      mode === 'formatted'
        ? formatSvg(source.value)
        : mode === 'min'
          ? minifySvg(source.value)
          : optimizeSvg(source.value, options);
    const text = typeof result === 'string' ? result : result.output;
    output.value = text;
    const sourceBytes = byteLength(source.value);
    const outputBytes = byteLength(text);
    $('status').textContent =
      `${formatBytes(sourceBytes)} → ${formatBytes(outputBytes)} (${sourceBytes ? `−${Math.max(0, (1 - outputBytes / sourceBytes) * 100).toFixed(1)}%` : '—'})`;
    renderList('actions', typeof result === 'string' ? [] : result.actions);
    $('copy').removeAttribute('disabled');
    $('download').removeAttribute('disabled');
    $('error').hidden = true;
  } catch (e) {
    $('error').textContent = e instanceof Error ? e.message : String(e);
    $('error').hidden = false;
  }
}
source.addEventListener('input', () => {
  window.clearTimeout(timer);
  timer = window.setTimeout(live, 200);
});
$('format').onclick = () => transform('formatted');
$('minify').onclick = () => transform('min');
$('optimize').onclick = () => transform('optimized');
$('clear').onclick = () => {
  source.value = '';
  output.value = '';
  live();
};
$('choose').onclick = () => $('file').click();
$('file').addEventListener('change', () => {
  const f = ($('file') as HTMLInputElement).files?.[0];
  if (f) {
    basename = f.name.replace(/\.svg$/i, '');
    f.text().then((x) => {
      source.value = x;
      live();
    });
  }
});
$('use').onclick = () => {
  source.value = output.value;
  live();
};
$('copy').onclick = () =>
  navigator.clipboard
    .writeText(output.value)
    .then(() => {
      const b = $('copy');
      b.textContent = 'Copied';
      setTimeout(() => (b.textContent = 'Copy output'), 1500);
    })
    .catch(() => {
      $('error').textContent = 'Could not copy output.';
      $('error').hidden = false;
    });
$('download').onclick = () => {
  const suffix =
      lastMode === 'min' ? '-min' : lastMode === 'formatted' ? '-formatted' : '-optimized',
    a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([output.value], { type: 'image/svg+xml' }));
  a.download = `${basename || 'svg-output'}${suffix}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
};
const card = document.querySelector('.source-card') as HTMLElement;
card.ondragover = (e) => {
  e.preventDefault();
  card.classList.add('drop-hover');
};
card.ondragleave = () => card.classList.remove('drop-hover');
card.ondrop = (e) => {
  e.preventDefault();
  card.classList.remove('drop-hover');
  const f = e.dataTransfer?.files[0];
  if (f?.name.toLowerCase().endsWith('.svg'))
    f.text().then((x) => {
      source.value = x;
      live();
    });
  else {
    $('error').textContent = 'Please choose an SVG file.';
    $('error').hidden = false;
  }
};
live();
