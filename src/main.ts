import { CONTACT_EMAIL, FORM_ENDPOINT, PAYMENT_TERMS, PLAUSIBLE_DOMAIN, SERVICES, type ServiceKey } from './config';
import type { FileAnalysis } from './lib/analyze';
import {
  buildReport,
  classify,
  duration,
  formatDuration,
  formatFormat,
  formatPeak,
  reportToText,
  type FileEntry,
  type Finding,
  type Report,
} from './lib/checks';
import { filesFromDrop, filesFromInput, type PickedFile } from './lib/files';
import type { WorkerRequest, WorkerResponse } from './worker';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

/** Crea un elemento con texto seguro (los nombres de archivo nunca se insertan como HTML). */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
}

// --- Analítica opcional (sin cookies) ---------------------------------------

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number> }) => void;
  }
}

if (PLAUSIBLE_DOMAIN) {
  const s = el('script', { defer: '', 'data-domain': PLAUSIBLE_DOMAIN, src: 'https://plausible.io/js/script.js' });
  document.head.append(s);
}

function track(event: string, props?: Record<string, string | number>) {
  window.plausible?.(event, props ? { props } : undefined);
}

// --- Análisis -----------------------------------------------------------------

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
let nextId = 0;

function analyzeInWorker(file: File, onProgress: (f: number) => void): Promise<FileAnalysis> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const handler = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.id !== id) return;
      if (msg.type === 'progress') return onProgress(msg.fraction);
      worker.removeEventListener('message', handler);
      if (msg.type === 'done') resolve(msg.analysis);
      else reject(new Error(msg.message));
    };
    worker.addEventListener('message', handler);
    worker.postMessage({ id, file } satisfies WorkerRequest);
  });
}

let busy = false;
let lastReport: Report | null = null;

async function run(picked: PickedFile[]) {
  if (busy || !picked.length) return;
  busy = true;
  try {
    await analyzeAll(picked);
  } finally {
    busy = false;
  }
}

async function analyzeAll(picked: PickedFile[]) {
  const progress = $('progress');
  const label = $('progress-label');
  const bar = $('progress-bar');
  progress.hidden = false;
  $('report').hidden = true;

  const sorted = [...picked].sort((a, b) => a.path.localeCompare(b.path, 'es', { numeric: true }));
  const audio = sorted.filter((p) => classify(p.file.name) === 'audio');
  const totalBytes = audio.reduce((s, p) => s + p.file.size, 0) || 1;
  let doneBytes = 0;

  const entries: FileEntry[] = [];
  for (const p of sorted) {
    const kind = classify(p.file.name);
    const name = p.file.name;
    if (kind !== 'audio') {
      entries.push({ name, kind });
      continue;
    }
    label.textContent = `Revisando ${name}…`;
    try {
      const analysis = await analyzeInWorker(p.file, (f) => {
        bar.style.width = `${(((doneBytes + f * p.file.size) / totalBytes) * 100).toFixed(1)}%`;
      });
      entries.push({ name, kind, analysis });
    } catch (err) {
      entries.push({ name, kind, error: (err as Error).message });
    }
    doneBytes += p.file.size;
  }

  const report = buildReport(entries);
  lastReport = report;
  progress.hidden = true;
  bar.style.width = '0';
  renderReport(report);
  track('chequeo', { archivos: report.files.length, resultado: report.verdict });
}

// --- Reporte ------------------------------------------------------------------

const LEVEL_LABEL = { corregir: 'Corregir', revisar: 'Revisar', info: 'Nota' } as const;
const LEVEL_ICON = { corregir: '✕', revisar: '!', info: '·' } as const;

function findingItem(f: Finding) {
  return el(
    'li',
    { class: `finding ${f.level}` },
    el('span', { class: 'tag', 'aria-label': LEVEL_LABEL[f.level] }, LEVEL_ICON[f.level]),
    el('span', {}, f.message),
  );
}

function renderReport(r: Report) {
  const root = $('report');
  root.replaceChildren();

  const verdictText = {
    listo: ['Listo para mezcla', 'Tus stems están bien exportados. Podés mandarlos tranquilo.'],
    casi: ['Casi listo', 'Se puede mezclar, pero hay detalles que conviene revisar.'],
    corregir: ['Corregí antes de mandar', 'Hay problemas que van a costar tiempo (y plata) en la mezcla.'],
  }[r.verdict];

  const summary = [
    `${r.files.length} ${r.files.length === 1 ? 'archivo' : 'archivos'}`,
    r.counts.corregir ? `${r.counts.corregir} para corregir` : '',
    r.counts.revisar ? `${r.counts.revisar} para revisar` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  root.append(
    el(
      'div',
      { class: `verdict ${r.verdict}` },
      el('p', { class: 'verdict-title' }, verdictText[0]),
      el('p', {}, verdictText[1]),
      el('p', { class: 'fine' }, summary),
    ),
  );

  if (r.global.length) root.append(el('ul', { class: 'findings global' }, ...r.global.map(findingItem)));

  const list = el('div', { class: 'files' });
  for (const f of r.files) {
    const status = f.findings.some((x) => x.level === 'corregir')
      ? 'corregir'
      : f.findings.some((x) => x.level === 'revisar')
        ? 'revisar'
        : 'bien';
    const meta = f.analysis ? metaLine(f.analysis) : '';
    list.append(
      el(
        'article',
        { class: `file ${status}` },
        el(
          'header',
          {},
          el('span', { class: 'file-status', 'aria-label': status }, status === 'bien' ? '✓' : LEVEL_ICON[status]),
          el('span', { class: 'file-name' }, f.name),
        ),
        meta ? el('p', { class: 'file-meta' }, meta) : '',
        f.findings.length ? el('ul', { class: 'findings' }, ...f.findings.map(findingItem)) : '',
      ),
    );
  }
  root.append(list);

  if (r.ignored.length) {
    root.append(el('p', { class: 'fine' }, `Ignoré ${r.ignored.length} archivo(s) que no son audio (${r.ignored.slice(0, 3).join(', ')}${r.ignored.length > 3 ? '…' : ''}).`));
  }

  const copy = el('button', { class: 'btn ghost', type: 'button' }, 'Copiar reporte');
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(reportToText(r));
    copy.textContent = 'Copiado';
    setTimeout(() => (copy.textContent = 'Copiar reporte'), 2000);
    track('copiar_reporte');
  });
  const again = el('button', { class: 'btn ghost', type: 'button' }, 'Revisar otra carpeta');
  again.addEventListener('click', () => {
    root.hidden = true;
    $('drop').scrollIntoView({ behavior: 'smooth' });
  });
  root.append(el('div', { class: 'report-actions' }, copy, again));

  root.hidden = false;
  $('cta').hidden = false;
  root.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function metaLine(a: FileAnalysis) {
  return `${formatFormat(a)} · ${formatDuration(duration(a))} · pico ${formatPeak(a.stats.peak)}`;
}

// --- Pedido -------------------------------------------------------------------

const form = $<HTMLFormElement>('order');

function renderServices() {
  const wrap = $('services');
  for (const key of Object.keys(SERVICES) as ServiceKey[]) {
    const s = SERVICES[key];
    const btn = el(
      'button',
      { class: 'service', type: 'button', 'data-service': key },
      el('span', { class: 'service-name' }, s.label),
      el('span', { class: 'service-price' }, s.price),
      el('span', { class: 'fine' }, s.detail),
    );
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.service').forEach((b) => b.classList.toggle('selected', b === btn));
      (form.elements.namedItem('servicio') as HTMLInputElement).value = key;
      form.hidden = false;
      track('cta', { servicio: key, resultado: lastReport?.verdict ?? 'sin_chequeo' });
      (form.elements.namedItem('nombre') as HTMLInputElement).focus();
    });
    wrap.append(btn);
  }
  $('terms').textContent = `${PAYMENT_TERMS} Te respondo desde ${CONTACT_EMAIL}.`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
  const service = SERVICES[data.servicio as ServiceKey];
  const reporte = lastReport ? reportToText(lastReport) : '';
  const status = $('order-status');
  track('pedido', { servicio: data.servicio });

  if (FORM_ENDPOINT) {
    status.textContent = 'Enviando…';
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, servicio: service.label, reporte, _subject: `${service.label} · ${data.nombre}` }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.textContent = 'Listo, te escribo pronto.';
      return;
    } catch {
      status.textContent = `No se pudo enviar. Escribime a ${CONTACT_EMAIL}.`;
      return;
    }
  }

  const body = [
    `Nombre: ${data.nombre}`,
    `Correo: ${data.correo}`,
    `Servicio: ${service.label} (${service.price})`,
    data.link ? `Stems: ${data.link}` : '',
    data.mensaje ? `\n${data.mensaje}` : '',
    reporte ? `\n---\n${reporte}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${service.label} · ${data.nombre}`)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
  status.textContent = `Se abrió tu correo. Si no, escribime a ${CONTACT_EMAIL}.`;
});

// --- Entrada de archivos --------------------------------------------------------

const drop = $('drop');
drop.addEventListener('dragover', (e) => {
  e.preventDefault();
  drop.classList.add('over');
});
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', async (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  if (e.dataTransfer) run(await filesFromDrop(e.dataTransfer));
});
for (const id of ['pick-folder', 'pick-files']) {
  const input = $<HTMLInputElement>(id);
  input.addEventListener('change', () => {
    run(filesFromInput(input.files));
    input.value = '';
  });
}

const mail = $<HTMLAnchorElement>('mail-link');
mail.href = `mailto:${CONTACT_EMAIL}`;
mail.textContent = CONTACT_EMAIL;

// "Servicios" y "Ver precios" muestran los precios aunque no se haya hecho un chequeo.
for (const id of ['nav-services', 'hero-services']) {
  $(id).addEventListener('click', (e) => {
    e.preventDefault();
    $('cta').hidden = false;
    $('cta').scrollIntoView({ behavior: 'smooth' });
    track('nav_servicios', { desde: id });
  });
}

renderServices();
