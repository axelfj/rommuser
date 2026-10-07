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

const escape = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let html = readFileSync(page, 'utf8');
const revealed = [];
for (const release of releases.filter((r) => r.fecha <= today).sort((a, b) => a.fecha.localeCompare(b.fecha))) {
  const upcoming = new RegExp(`<button class="track music-choice upcoming" type="button" disabled data-release="${release.fecha}">(.*?)</button>`, 's');
  const match = html.match(upcoming);
  if (!match) continue; // already out
  const link = release.spotify ? ` data-spotify="${escape(release.spotify)}"` : '';
  const inner = match[1]
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
