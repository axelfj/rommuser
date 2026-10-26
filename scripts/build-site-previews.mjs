// Builds noindex design previews of the Spanish artist page: one page per variant stylesheet in site/preview/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const variants = [
  { slug: 'papel', name: 'A · PAPEL', font: 'Instrument+Serif:ital@0;1' },
  { slug: 'negativo', name: 'B · NEGATIVO', font: 'Space+Mono:wght@400;700' },
  { slug: 'poster', name: 'C · PÓSTER', font: 'Anton' },
];
const source = readFileSync(new URL('../site/es/index.html', import.meta.url), 'utf8');

for (const v of variants) {
  const others = [{ slug: '', name: 'ACTUAL' }, ...variants].map((o) => {
    const href = o.slug ? `/preview/${o.slug}/` : '/es/';
    return `<a href="${href}"${o.slug === v.slug ? ' aria-current="page"' : ''}>${o.name}</a>`;
  }).join('');
  const html = source
    .replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, nofollow">')
    .replace('<link rel="stylesheet" href="/receiver.css">', `<link rel="stylesheet" href="/receiver.css"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${v.font}&amp;display=swap"><link rel="stylesheet" href="/preview/${v.slug}.css">`)
    .replace('<body class="artist-home">', `<body class="artist-home v-${v.slug}"><div class="variant-switch" role="navigation" aria-label="Versiones de diseño">${others}</div>`);
  mkdirSync(new URL(`../site/preview/${v.slug}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`../site/preview/${v.slug}/index.html`, import.meta.url), html);
  console.log(`site/preview/${v.slug}/index.html listo.`);
}
