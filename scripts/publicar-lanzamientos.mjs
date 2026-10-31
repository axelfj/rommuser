// Reveals each upcoming release on its day. Until then the home page lists it as an "ID"
// (title and label hidden); from its date (Costa Rica time) this swaps in the real title,
// label and listen link from scripts/lanzamientos.json and rebuilds the English page.
// Runs every day from .github/workflows/lanzamientos.yml; by hand: npm run lanzamientos
// (FECHA=2026-10-30 npm run lanzamientos simulates a day).
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLATFORMS } from '../site/js/lib/platforms.js';
import { writePages } from './build-site-en.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = join(root, 'site', 'index.html');
const releases = JSON.parse(readFileSync(join(root, 'scripts', 'lanzamientos.json'), 'utf8'));
const today = process.env.FECHA || new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Costa_Rica' }).format(new Date());

const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// A card still to come: a pre-save link (<a class="track music-choice upcoming presave" ...>) or an older "ID"
// button (<button class="track music-choice upcoming" ...>), with its date in data-release. Attributes may sit on
// separate lines, as site/index.html writes them.
function findUpcoming(html, date) {
  for (const m of html.matchAll(/<(a|button)\b([^>]*)>/g)) {
    const attrs = m[2];
    if (!/\bclass="track music-choice upcoming\b/.test(attrs) || !attrs.includes(`data-release="${date}"`)) continue;
    const close = html.indexOf(`</${m[1]}>`, m.index);
    const lineStart = html.lastIndexOf('\n', m.index) + 1;
    return { start: m.index, end: close + m[1].length + 3, attrs, inner: html.slice(m.index + m[0].length, close), indent: html.slice(lineStart, m.index), multiline: m[0].includes('\n') };
  }
  return null;
}

let html = readFileSync(page, 'utf8');
const revealed = [];
for (const release of releases.filter((r) => r.fecha <= today).sort((a, b) => a.fecha.localeCompare(b.fecha))) {
  const card = findUpcoming(html, release.fecha);
  if (!card) continue; // already out
  // Keep the verified links the pre-save card already carries (e.g. the Beatport pre-order, which becomes the release
  // page), and add any filled in scripts/lanzamientos.json; without links the card would send fans to the newsletter
  // instead of the track.
  const links = {};
  for (const key of PLATFORMS) {
    const found = card.attrs.match(new RegExp(`\\sdata-${key}="([^"]*)"`));
    if (found) links[key] = found[1];
    if (release[key]) links[key] = escape(release[key]);
  }
  const attrs = ['class="track music-choice"', `data-track="${escape(release.titulo)}"`, ...PLATFORMS.filter((key) => links[key]).map((key) => `data-${key}="${links[key]}"`)];
  const opening = card.multiline ? `<button\n${attrs.map((a) => `${card.indent}  ${a}`).join('\n')}\n${card.indent}>` : `<button ${attrs.join(' ')}>`;
  const inner = card.inner
    .replace(/<strong>.*?<\/strong>/, `<strong>${escape(release.titulo)}</strong>`)
    .replace(/<small>.*?<\/small>/, `<small>${escape(release.sello)}</small>`)
    .replace(/<time class="release-date"/, '<time class="release-date latest-release"')
    .replace(/<span class="track-type">.*?<\/span>/, '<span class="track-type">ESCUCHAR</span>');
  // The newest release is the one highlighted in red.
  const before = html.slice(0, card.start).replace(/ latest-release"/g, '"');
  const after = html.slice(card.end).replace(/ latest-release"/g, '"');
  html = before + opening + inner + '</button>' + after;
  revealed.push(`${release.titulo} (${release.fecha})`);
}

if (revealed.length) {
  writeFileSync(page, html);
  writePages();
}
console.log(revealed.length ? `Publicados: ${revealed.join(', ')}` : `Nada que publicar hoy (${today}).`);
