// Builds site/en/index.html from site/index.html (the Spanish source) and the dictionary in site/i18n.js,
// so English visitors and search engines get a real English page at /en/.
// Run after changing the site's copy: npm run site:en
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');

export const ORIGIN = 'https://rommuser.com';

const HEAD = {
  description: 'ROMMUSER is a house and techno DJ and producer with a melodic soul from San José, Costa Rica. Listen to his releases, watch his live sets and book him for clubs, festivals, events or to mix and master your track.',
  ogDescription: 'House and techno, with a melodic soul. Music, live sets and bookings from Costa Rica.',
  ogImageAlt: 'ROMMUSER, DJ and producer from Costa Rica',
  ldDescription: 'House and techno DJ and producer with a melodic soul from Costa Rica.',
};

export function readDictionary(i18nSource) {
  const match = i18nSource.match(/const english=(\{.*?\});\n/s);
  if (!match) throw new Error('No se encontró el diccionario english en i18n.js');
  return JSON.parse(match[1]);
}

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const encodeText = (s) => s.replace(/&/g, '&amp;').replace(/ /g, '&nbsp;').replace(/</g, '&lt;');
const encodeAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

// Returns [english html, list of visible text left as is because the dictionary has no entry].
export function buildEnglishPage(html, dictionary) {
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
  out = out.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${encodeAttr(HEAD.description)}">`);
  out = replaceOnce(out, `<link rel="canonical" href="${ORIGIN}/">`, `<link rel="canonical" href="${ORIGIN}/en/">`);
  out = out.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${encodeAttr(dictionary['ROMMUSER | DJ y productor de house y techno · Costa Rica'])}">`);
  out = out.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${encodeAttr(HEAD.ogDescription)}">`);
  out = replaceOnce(out, `<meta property="og:url" content="${ORIGIN}/">`, `<meta property="og:url" content="${ORIGIN}/en/">`);
  out = out.replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${encodeAttr(HEAD.ogImageAlt)}">`);
  out = replaceOnce(out, '<meta property="og:locale" content="es_CR"><meta property="og:locale:alternate" content="en_US">', '<meta property="og:locale" content="en_US"><meta property="og:locale:alternate" content="es_CR">');
  out = out.replace(/("@type":"MusicGroup".*?"description":")[^"]*(")/, (_, a, b) => a + HEAD.ldDescription + b);
  out = out.replace('"knowsAbout":["Mezcla","Mastering",', '"knowsAbout":["Mixing","Mastering",');

  // The page lives one folder down: local files load from the site root.
  out = out.replace(/ (src|href)="(?![a-z]+:|#|\/)([^"]+)"/g, ' $1="/$2"');

  // Language link points back to Spanish.
  const toggle = /<a class="language-toggle" id="site-language" href="\/en\/" hreflang="en"([^>]*)>ES<\/a>/;
  if (!toggle.test(out)) throw new Error('No se encontró el enlace de idioma');
  out = out.replace(toggle, '<a class="language-toggle" id="site-language" href="/" hreflang="es"$1>EN</a>');

  // Press documents in English.
  out = out.replace(/<a [^>]*id="localized-(?:epk|rider)"[^>]*>/g, (tag) => {
    const en = tag.match(/data-en="([^"]+)"/);
    return en ? tag.replace(/ href="[^"]*"/, ` href="${en[1]}"`) : tag;
  });

  out = out.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Generado desde site/index.html por scripts/build-site-en.mjs. No editar a mano: npm run site:en -->');
  return [out, [...missing]];
}

export function buildFromDisk() {
  const html = readFileSync(join(siteDir, 'index.html'), 'utf8');
  const dictionary = readDictionary(readFileSync(join(siteDir, 'i18n.js'), 'utf8'));
  return buildEnglishPage(html, dictionary);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [page, missing] = buildFromDisk();
  mkdirSync(join(siteDir, 'en'), { recursive: true });
  writeFileSync(join(siteDir, 'en', 'index.html'), page);
  console.log('site/en/index.html listo.');
  if (missing.length) console.log('Sin traducción (se quedan igual):\n- ' + missing.join('\n- '));
}
