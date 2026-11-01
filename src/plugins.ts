import { CONTACT_EMAIL, DONATION_URL, PLAUSIBLE_DOMAIN } from './config';
import { lang, preferredLang, saveLang, setLang, tx, type Lang } from './lib/i18n';
import { CATEGORIES, PLUGINS, downloadUrl, manualUrl, type Plugin } from './plugins-data';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

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

// --- Tarjetas -----------------------------------------------------------------

function card(p: Plugin): HTMLElement {
  const img = el('img', {
    src: `/plugins/img/${p.slug}.webp`,
    alt: tx(`Interfaz de ${p.name}`, `${p.name} interface`),
    loading: 'lazy',
    decoding: 'async',
  });
  const download = el(
    'a',
    { class: 'btn plugin-download', href: downloadUrl(p.slug), target: '_blank', rel: 'noopener noreferrer' },
    tx('Descargar', 'Download'),
  );
  download.addEventListener('click', () => track('descarga_plugin', { plugin: p.name }));
  return el(
    'article',
    { class: 'plugin' },
    img,
    el(
      'div',
      { class: 'plugin-body' },
      el('h3', {}, p.name),
      el('p', {}, tx(p.es, p.en)),
      el(
        'div',
        { class: 'plugin-actions' },
        download,
        el('a', { class: 'link', href: manualUrl(p.slug), target: '_blank', rel: 'noopener noreferrer' }, tx('Manual', 'Manual')),
      ),
    ),
  );
}

function renderPlugins() {
  const root = $('plugin-groups');
  root.replaceChildren(
    ...CATEGORIES.map((c) =>
      el(
        'section',
        { class: 'plugin-group', 'aria-label': tx(c.es, c.en) },
        el('h2', {}, tx(c.es, c.en)),
        el('div', { class: 'plugin-grid' }, ...PLUGINS.filter((p) => p.category === c.id).map(card)),
      ),
    ),
  );
}

document.querySelectorAll<HTMLAnchorElement>('.bundle-download').forEach((a) =>
  a.addEventListener('click', () => track('descarga_todos', { plataforma: a.dataset.bundle ?? '' })),
);

// Mac primero en una Mac: el botón de su sistema queda como principal.
if (/Mac/.test(navigator.platform) || /Mac OS X/.test(navigator.userAgent)) {
  document.querySelector('[data-bundle="windows"]')?.classList.add('ghost');
  document.querySelector('[data-bundle="macos"]')?.classList.remove('ghost');
}

// --- Contacto y donación -----------------------------------------------------

const mail = $<HTMLAnchorElement>('bug-mail');
mail.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Plugins ROMMUSER')}`;
mail.textContent = CONTACT_EMAIL;

const donate = $<HTMLAnchorElement>('donate-cta');
if (DONATION_URL) {
  donate.href = DONATION_URL;
  donate.addEventListener('click', () => track('donar'));
} else {
  donate.hidden = true;
  $('donate-soon').hidden = false;
}

// --- Idioma -------------------------------------------------------------------

const META = {
  es: {
    title: 'Plugins gratis · ROMMUSER Studio',
    description: '27 plugins de audio gratis y open source (VST3, AU, CLAP) para productores que están empezando. En beta, en español e inglés.',
  },
  en: {
    title: 'Free plugins · ROMMUSER Studio',
    description: '27 free, open-source audio plugins (VST3, AU, CLAP) for producers who are just starting out. In beta, in Spanish and English.',
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
  const toggle = $('lang-toggle');
  toggle.textContent = next.toUpperCase();
  toggle.setAttribute('aria-label', tx('Switch to English', 'Cambiar a español'));
  renderPlugins();
}

$('lang-toggle').addEventListener('click', () => {
  const next = lang() === 'es' ? 'en' : 'es';
  saveLang(next);
  applyLang(next);
  track('idioma', { idioma: next });
});

applyLang(preferredLang());
