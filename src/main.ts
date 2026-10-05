import { CONTACT_EMAIL, FORM_ENDPOINT, PAYMENT_TERMS, PAYMENT_TERMS_EN, PLAUSIBLE_DOMAIN, SERVICES, type ServiceKey } from './config';
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
import { lang, preferredLang, saveLang, setLang, tx, type Lang } from './lib/i18n';
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

// Si el worker se cae o deja de avisar progreso, el archivo se marca como no leído
// en vez de dejar el chequeo colgado.
const STALL_MS = 60_000;
const STALLED = 'El análisis se detuvo. Probá de nuevo con este archivo.';

interface Pending {
  resolve: (a: FileAnalysis) => void;
  reject: (e: Error) => void;
  onProgress: (f: number) => void;
  timer: number;
}

let worker = startWorker();
let nextId = 0;
const pending = new Map<number, Pending>();

function startWorker() {
  const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  w.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
    const msg = e.data;
    const job = pending.get(msg.id);
    if (!job) return;
    if (msg.type === 'progress') {
      armTimer(msg.id, job);
      return job.onProgress(msg.fraction);
    }
    finish(msg.id);
    if (msg.type === 'done') job.resolve(msg.analysis);
    else job.reject(new Error(msg.message));
  });
  w.addEventListener('error', (e) => {
    e.preventDefault();
    failAll();
  });
  w.addEventListener('messageerror', failAll);
  return w;
}

function armTimer(id: number, job: Pending) {
  clearTimeout(job.timer);
  job.timer = window.setTimeout(() => {
    finish(id);
    job.reject(new Error(STALLED));
    restartWorker();
  }, STALL_MS);
}

function finish(id: number) {
  const job = pending.get(id);
  if (job) clearTimeout(job.timer);
  pending.delete(id);
}

function failAll() {
  for (const [id, job] of [...pending]) {
    finish(id);
    job.reject(new Error(STALLED));
  }
  restartWorker();
}

function restartWorker() {
  worker.terminate();
  worker = startWorker();
}

function analyzeInWorker(file: File, onProgress: (f: number) => void): Promise<FileAnalysis> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const job: Pending = { resolve, reject, onProgress, timer: 0 };
    pending.set(id, job);
    armTimer(id, job);
    worker.postMessage({ id, file } satisfies WorkerRequest);
  });
}

let busy = false;
let lastEntries: FileEntry[] | null = null;
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
    label.textContent = tx(`Revisando ${name}…`, `Checking ${name}…`);
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
  lastEntries = entries;
  lastReport = report;
  progress.hidden = true;
  bar.style.width = '0';
  renderReport(report);
  track('chequeo', { archivos: report.files.length, resultado: report.verdict });
}

// --- Reporte ------------------------------------------------------------------

const LEVEL_ICON = { corregir: '✕', revisar: '!', info: '·' } as const;

function levelLabel(level: Finding['level']) {
  return { corregir: tx('Corregir', 'Fix'), revisar: tx('Revisar', 'Check'), info: tx('Nota', 'Note') }[level];
}

function findingItem(f: Finding) {
  return el(
    'li',
    { class: `finding ${f.level}` },
    el('span', { class: 'tag', 'aria-label': levelLabel(f.level) }, LEVEL_ICON[f.level]),
    el('span', {}, f.message),
  );
}

function renderReport(r: Report, scroll = true) {
  const root = $('report');
  root.replaceChildren();

  const verdictText = {
    listo: [
      tx('Listo para mezcla', 'Ready to mix'),
      tx('Tus stems están bien exportados. Podés mandarlos tranquilo.', 'Your stems are exported right. Send them with confidence.'),
    ],
    casi: [
      tx('Casi listo', 'Almost ready'),
      tx('Se puede mezclar, pero hay detalles que conviene revisar.', 'They can be mixed, but a few details are worth checking.'),
    ],
    corregir: [
      tx('Corregí antes de mandar', 'Fix before sending'),
      tx('Hay problemas que van a costar tiempo (y plata) en la mezcla.', 'Some problems will cost time (and money) in the mix.'),
    ],
  }[r.verdict];

  const summary = [
    `${r.files.length} ${r.files.length === 1 ? tx('archivo', 'file') : tx('archivos', 'files')}`,
    r.counts.corregir ? tx(`${r.counts.corregir} para corregir`, `${r.counts.corregir} to fix`) : '',
    r.counts.revisar ? tx(`${r.counts.revisar} para revisar`, `${r.counts.revisar} to check`) : '',
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
    const names = `${r.ignored.slice(0, 3).join(', ')}${r.ignored.length > 3 ? '…' : ''}`;
    root.append(
      el(
        'p',
        { class: 'fine' },
        tx(
          `Ignoré ${r.ignored.length} archivo(s) que no son audio (${names}).`,
          `Skipped ${r.ignored.length} non-audio file(s) (${names}).`,
        ),
      ),
    );
  }

  const copyLabel = tx('Copiar reporte', 'Copy report');
  const copy = el('button', { class: 'btn ghost', type: 'button' }, copyLabel);
  copy.addEventListener('click', async () => {
    await navigator.clipboard.writeText(reportToText(r));
    copy.textContent = tx('Copiado', 'Copied');
    setTimeout(() => (copy.textContent = copyLabel), 2000);
    track('copiar_reporte');
  });
  const again = el('button', { class: 'btn ghost', type: 'button' }, tx('Revisar otra carpeta', 'Check another folder'));
  again.addEventListener('click', () => {
    root.hidden = true;
    $('drop').scrollIntoView({ behavior: 'smooth' });
  });
  root.append(el('div', { class: 'report-actions' }, copy, again));

  root.hidden = false;
  if (scroll) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function metaLine(a: FileAnalysis) {
  return `${formatFormat(a)} · ${formatDuration(duration(a))} · ${tx('pico', 'peak')} ${formatPeak(a.stats.peak)}`;
}

// --- Pedido -------------------------------------------------------------------

const form = $<HTMLFormElement>('order');

function renderServices() {
  const wrap = $('services');
  const selected = (form.elements.namedItem('servicio') as HTMLInputElement).value;
  wrap.replaceChildren();
  for (const key of Object.keys(SERVICES) as ServiceKey[]) {
    const s = SERVICES[key];
    const btn = el(
      'button',
      { class: key === selected ? 'service selected' : 'service', type: 'button', 'data-service': key },
      el('span', { class: 'service-name' }, s.label),
      el('span', { class: 'service-price' }, tx(s.price, s.priceEn)),
      el('span', { class: 'fine' }, tx(s.detail, s.detailEn)),
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
  $('terms').textContent = tx(`${PAYMENT_TERMS} Te respondo desde ${CONTACT_EMAIL}.`, `${PAYMENT_TERMS_EN} I'll reply from ${CONTACT_EMAIL}.`);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
  const service = SERVICES[data.servicio as ServiceKey];
  const reporte = lastReport ? reportToText(lastReport) : '';
  const status = $('order-status');
  track('pedido', { servicio: data.servicio });

  if (FORM_ENDPOINT) {
    status.textContent = tx('Enviando…', 'Sending…');
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...data, servicio: service.label, reporte, _subject: `${service.label} · ${data.nombre}` }),
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      status.textContent = tx('Listo, te escribo pronto.', "Done, I'll write to you soon.");
      return;
    } catch {
      status.textContent = tx(`No se pudo enviar. Escribime a ${CONTACT_EMAIL}.`, `Couldn't send. Email me at ${CONTACT_EMAIL}.`);
      return;
    }
  }

  const body = [
    `${tx('Nombre', 'Name')}: ${data.nombre}`,
    `${tx('Correo', 'Email')}: ${data.correo}`,
    `${tx('Servicio', 'Service')}: ${service.label} (${tx(service.price, service.priceEn)})`,
    data.link ? `Stems: ${data.link}` : '',
    data.mensaje ? `\n${data.mensaje}` : '',
    reporte ? `\n---\n${reporte}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`${service.label} · ${data.nombre}`)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
  status.textContent = tx(
    `Te preparé el correo con el pedido: falta que lo envíes desde tu app de correo. Si no se abrió, escribime a ${CONTACT_EMAIL}.`,
    `Your order email is ready: you still need to send it from your email app. If it didn't open, email me at ${CONTACT_EMAIL}.`,
  );
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

$('nav-services').addEventListener('click', () => track('nav_servicios', { desde: 'nav-services' }));

// --- Idioma -------------------------------------------------------------------

const META = {
  es: {
    title: 'Chequeo de stems · ROMMUSER Studio',
    description: 'Revisá tus stems antes de mandarlos a mezclar: sample rate, clipping, largos y más. Gratis y sin subir tus archivos.',
  },
  en: {
    title: 'Stem check · ROMMUSER Studio',
    description: 'Check your stems before you send them to mix: sample rate, clipping, lengths and more. Free, and your files are never uploaded.',
  },
};

function applyLang(next: Lang) {
  setLang(next);
  document.documentElement.lang = next;
  document.title = META[next].title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', META[next].description);
  document.querySelectorAll<HTMLElement>('[data-en]').forEach((node) => {
    node.dataset.es ??= node.textContent?.trim() ?? '';
    node.textContent = next === 'en' ? node.dataset.en! : node.dataset.es;
  });
  document.querySelectorAll<HTMLElement>('[data-en-aria-label]').forEach((node) => {
    node.dataset.esAriaLabel ??= node.getAttribute('aria-label') ?? '';
    node.setAttribute('aria-label', next === 'en' ? node.dataset.enAriaLabel! : node.dataset.esAriaLabel);
  });
  const toggle = $('lang-toggle');
  toggle.textContent = next.toUpperCase();
  toggle.setAttribute('aria-label', tx('Switch to English', 'Cambiar a español'));
  renderServices();
  if (lastEntries && !$('report').hidden) {
    lastReport = buildReport(lastEntries);
    renderReport(lastReport, false);
  }
}

$('lang-toggle').addEventListener('click', () => {
  const next = lang() === 'es' ? 'en' : 'es';
  saveLang(next);
  applyLang(next);
  track('idioma', { idioma: next });
});

applyLang(preferredLang());
