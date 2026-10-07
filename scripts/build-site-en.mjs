// Builds site/en/index.html from site/index.html (the Spanish source) and the dictionary in site/i18n.js,
// so English visitors and search engines get a real English page at /en/.
// Run after changing the site's copy: npm run site:en
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');

export const ORIGIN = 'https://rommuser.com';

// Spanish source -> English twin. Every link to a Spanish page is rewritten to its twin.
export const PAGES = [
  {
    es: 'index.html', en: 'en/index.html', esPath: '/', enPath: '/en/',
    description: 'ROMMUSER is a house and techno DJ and producer with a melodic soul from San José, Costa Rica. Listen to his releases, watch his live sets and book him for clubs, festivals, events or to mix and master your track.',
    ogDescription: 'House and techno, with a melodic soul. Music, live sets and bookings from Costa Rica.',
    ogImageAlt: 'ROMMUSER, DJ and producer from Costa Rica',
    ld: [['DJ y productor de house y techno con alma melódica desde Costa Rica.', 'House and techno DJ and producer with a melodic soul from Costa Rica.'], ['"knowsAbout":["Mezcla",', '"knowsAbout":["Mixing",']],
  },
  {
    es: 'estudio/index.html', en: 'en/studio/index.html', esPath: '/estudio/', enPath: '/en/studio/',
    description: 'House and techno mixing and mastering by ROMMUSER, a producer with 10+ years and 7 signed originals. Mixing from USD 250, mastering USD 50 and ghost production on request.',
    ogTitle: 'ROMMUSER Studio | Mixing, mastering and ghost production',
    ogDescription: 'Mixing from USD 250, mastering USD 50 and ghost production for house and techno.',
    ogImageAlt: 'ROMMUSER, DJ and producer from Costa Rica',
    ld: [['Mezcla, mastering y ghost production de house y techno.', 'House and techno mixing, mastering and ghost production.'], ['Desde USD 250. 6 a 8 multipistas, 2 revisiones.', 'From USD 250. 6 to 8 multitracks, 2 revisions.'], ['Por track, 2 revisiones.', 'Per track, 2 revisions.']],
  },
];

export function readDictionary(i18nSource) {
  const match = i18nSource.match(/const english=(\{.*?\});\n/s);
  if (!match) throw new Error('No se encontró el diccionario english en i18n.js');
  return JSON.parse(match[1]);
}

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const encodeText = (s) => s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;');
const encodeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// Returns [english html, list of visible text left as is because the dictionary has no entry].
export function buildEnglishPage(html, dictionary, page = PAGES[0]) {
  const missing = new Set();
  const translate = (raw) => {
    const text = decode(raw);
    const core = text.trim();
    if (!core) return raw;
    if (!(core in dictionary)) {
      missing.add(core);
      return raw;
    }
    return encodeText(text.replace(core, dictionary[core]));
  };
  const replaceOnce = (source, from, to) => {
    if (!source.includes(from)) throw new Error('No se encontró en index.html: ' + from);
    return source.replace(from, to);
  };

  // Text between tags, except inside <script> and <style>.
  const [head, body] = html.split(/(?=<body)/);
  if (!body) throw new Error('No se encontró <body> en index.html');
  const translateSegment = (segment) => segment.replace(/>([^<]+)</g, (_, text) => '>' + translate(text) + '<');
  const translateMarkup = (markup) => markup
    .split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/)
    .map((part, i) => (i % 2 ? part : translateSegment(part)))
    .join('');
  let out = translateMarkup(head) + translateMarkup(body);

  // Attributes people and screen readers see.
  out = out.replace(/ (aria-label|alt|title)="([^"]+)"/g, (whole, attr, value) => {
    const core = decode(value);
    if (core in dictionary) return ` ${attr}="${encodeAttr(dictionary[core])}"`;
    if (/[a-záéíóúñ]/i.test(core) && attr !== 'title') missing.add(core);
    return whole;
  });

  // Head: language, canonical URL and share cards.
  out = replaceOnce(out, '<html lang="es">', '<html lang="en">');
  out = out.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${encodeAttr(page.description)}">`);
  out = replaceOnce(out, `<link rel="canonical" href="${ORIGIN}${page.esPath}">`, `<link rel="canonical" href="${ORIGIN}${page.enPath}">`);
  out = out.replace(/<meta property="og:title" content="([^"]*)">/, (_, title) => `<meta property="og:title" content="${encodeAttr(page.ogTitle || dictionary[decode(title)] || title)}">`);
  out = out.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${encodeAttr(page.ogDescription)}">`);
  out = replaceOnce(out, `<meta property="og:url" content="${ORIGIN}${page.esPath}">`, `<meta property="og:url" content="${ORIGIN}${page.enPath}">`);
  out = out.replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${encodeAttr(page.ogImageAlt)}">`);
  out = replaceOnce(out, '<meta property="og:locale" content="es_CR"><meta property="og:locale:alternate" content="en_US">', '<meta property="og:locale" content="en_US"><meta property="og:locale:alternate" content="es_CR">');
  for (const [from, to] of page.ld) out = replaceOnce(out, from, to);

  // The page lives one folder down: local files load from the site root.
  out = out.replace(/ (src|href)="(?![a-z]+:|#|\/)([^"]+)"/g, ' $1="/$2"');

  // Links between pages go to the English twins.
  out = out.replace(/ href="(\/[^"#]*)(#[^"]*)?"/g, (whole, path, hash = '') => {
    const twin = PAGES.find((p) => p.esPath === path);
    return twin ? ` href="${twin.enPath}${hash}"` : whole;
  });

  // Language link points back to the Spanish page.
  const toggle = /<a class="language-toggle" id="site-language" href="[^"]*" hreflang="en"([^>]*)>ES<\/a>/;
  if (!toggle.test(out)) throw new Error('No se encontró el enlace de idioma');
  out = out.replace(toggle, `<a class="language-toggle" id="site-language" href="${page.esPath}" hreflang="es"$1>EN</a>`);

  // Press documents in English.
  out = out.replace(/<a [^>]*id="localized-(?:epk|rider)"[^>]*>/g, (tag) => {
    const en = tag.match(/data-en="([^"]+)"/);
    return en ? tag.replace(/ href="[^"]*"/, ` href="${en[1]}"`) : tag;
  });

  out = out.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n<!-- Generado desde site/${page.es} por scripts/build-site-en.mjs. No editar a mano: npm run site:en -->`);
  return [out, [...missing]];
}

// Returns [{ page, html, missing }] for every page.
export function buildFromDisk() {
  const dictionary = readDictionary(readFileSync(join(siteDir, 'i18n.js'), 'utf8'));
  return PAGES.map((page) => {
    const [html, missing] = buildEnglishPage(readFileSync(join(siteDir, page.es), 'utf8'), dictionary, page);
    return { page, html, missing };
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const { page, html, missing } of buildFromDisk()) {
    mkdirSync(dirname(join(siteDir, page.en)), { recursive: true });
    writeFileSync(join(siteDir, page.en), html);
    console.log(`site/${page.en} listo.`);
    if (missing.length) console.log('Sin traducción (se quedan igual):\n- ' + missing.join('\n- '));
  }
}
