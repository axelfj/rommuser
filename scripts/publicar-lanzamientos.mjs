// Reveals each upcoming release on its day. Until then the home page lists it as an "ID"
// (title and label hidden); from its date (Costa Rica time) this swaps in the real title,
// label and listen link from scripts/lanzamientos.json and rebuilds the English page.
// Runs every day from .github/workflows/lanzamientos.yml; by hand: npm run lanzamientos
// (FECHA=2026-10-30 npm run lanzamientos simulates a day).
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = join(root, 'site', 'index.html');
const releases = JSON.parse(readFileSync(join(root, 'scripts', 'lanzamientos.json'), 'utf8'));
const today = process.env.FECHA || new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Costa_Rica' }).format(new Date());

// Same platforms as the listening dialog in site/app.js.
const PLATFORMS = ['amazon', 'apple', 'bandcamp', 'beatport', 'deezer', 'soundcloud', 'spotify', 'youtube'];
const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let html = readFileSync(page, 'utf8');
const revealed = [];
for (const release of releases.filter((r) => r.fecha <= today).sort((a, b) => a.fecha.localeCompare(b.fecha))) {
  // An upcoming release is an "ID" button (or an older disabled one), or a pre-save link once the label sends one.
  const upcoming = new RegExp(`<button class="track music-choice upcoming" type="button" (?:disabled |data-track="ID" )data-release="${release.fecha}">(.*?)</button>|<a class="track music-choice upcoming presave" [^>]*data-release="${release.fecha}">(.*?)</a>`, 's');
  const match = html.match(upcoming);
  if (!match) continue; // already out
  // Keep the verified links the pre-save row already carries (e.g. the Beatport pre-order, which
  // becomes the release page), and add any filled in scripts/lanzamientos.json; without links the
  // row would send fans to the newsletter instead of the track.
  const opening = match[0].slice(0, match[0].indexOf('>'));
  const links = {};
  for (const key of PLATFORMS) {
    const found = opening.match(new RegExp(` data-${key}="([^"]*)"`));
    if (found) links[key] = found[1];
    if (release[key]) links[key] = escape(release[key]);
  }
  const link = PLATFORMS.filter((key) => links[key]).map((key) => ` data-${key}="${links[key]}"`).join('');
  const inner = (match[1] ?? match[2])
    .replace(/<strong>.*?<\/strong>/, `<strong>${escape(release.titulo)}</strong>`)
    .replace(/<small>.*?<\/small>/, `<small>${escape(release.sello)}</small>`)
    .replace(/<time class="release-date"/, '<time class="release-date latest-release"')
    .replace(/<span class="track-type">.*?<\/span>/, '<span class="track-type">ESCUCHAR</span>');
  // The newest release is the one highlighted in red.
  html = html.replace(/ latest-release"/g, '"');
  html = html.replace(match[0], `<button class="track music-choice" data-track="${escape(release.titulo)}"${link}>${inner}</button>`);
  revealed.push(`${release.titulo} (${release.fecha})`);
}

if (revealed.length) {
  writeFileSync(page, html);
  execFileSync('node', [join(root, 'scripts', 'build-site-en.mjs')], { stdio: 'inherit' });
}
console.log(revealed.length ? `Publicados: ${revealed.join(', ')}` : `Nada que publicar hoy (${today}).`);
