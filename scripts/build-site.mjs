// Builds what rommuser.com serves from the files you edit. Run it after any change under site/: npm run site
//
//   You edit                                        The site serves (generated: never edit by hand)
//   site/css/site.css and the files it imports   →  site/build/site.css    (every page)
//   site/css/studio.css and the files it imports →  site/build/studio.css  (/estudio only)
//   site/js/pages/<page>.js and what it imports  →  site/build/<page>.js
//   site/index.html, estudio/, tienda/ + i18n/en.json → site/en/…, site/es/index.html (scripts/build-site-en.mjs)
//
// test/site.test.js fails when a generated file is out of date, so a forgotten build never reaches main.
import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writePages } from './build-site-en.mjs';

export const siteDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'site');

export const BUNDLES = [
  { from: 'css/site.css', to: 'build/site.css' },
  { from: 'css/studio.css', to: 'build/studio.css' },
  { from: 'js/pages/home.js', to: 'build/home.js' },
  { from: 'js/pages/studio.js', to: 'build/studio.js' },
  { from: 'js/pages/store.js', to: 'build/store.js' },
];

const HEADER = (from) => `/* Generado desde site/${from} por scripts/build-site.mjs. No editar a mano: npm run site */\n`;

// Returns [{ to, text }] without writing anything.
export async function buildBundles() {
  return Promise.all(
    BUNDLES.map(async ({ from, to }) => {
      const result = await esbuild.build({
        entryPoints: [join(siteDir, from)],
        outfile: join(siteDir, to),
        bundle: true,
        // CSS only loses its spaces and comments, so every value reaches the browser exactly as written.
        ...(from.endsWith('.js') ? { minify: true, format: 'iife' } : { minifyWhitespace: true }),
        write: false,
        charset: 'utf8',
        legalComments: 'none',
        // Pictures stay where they are (site/assets): CSS points at them with /assets/... paths.
        external: ['/assets/*'],
        logLevel: 'silent',
      });
      return { to, text: HEADER(from) + result.outputFiles[0].text };
    }),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const { to, text } of await buildBundles()) {
    mkdirSync(dirname(join(siteDir, to)), { recursive: true });
    writeFileSync(join(siteDir, to), text);
    console.log(`site/${to} listo.`);
  }
  for (const { path, missing } of writePages()) {
    console.log(`site/${path} listo.`);
    if (missing.length) console.log('  Sin traducción (se quedan igual): ' + missing.join(' · '));
  }
}
