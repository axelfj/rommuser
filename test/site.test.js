import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PAGES, buildFromDisk } from '../scripts/build-site-en.mjs';

const read = (path) => readFileSync(new URL('../site/' + path, import.meta.url), 'utf8');
const SPANISH = /\b(el|la|los|las|de|del|y|tu|tus|para|con|que|una?|más|sin|por)\b|[ñ¿¡]/i;
const PLACES = new Set(['EL BOILER', 'Amón Solar, El Sótano · San José', 'Ivo Villalobos · San José', 'EL BOTECITO DELUXE,', 'San José, Costa Rica']);

describe('rommuser.com', () => {
  const built = buildFromDisk();

  it.each(built.map((b) => [b.page.en, b]))('%s está al día con su página en español e i18n.js (npm run site:en)', (path, { html }) => {
    expect(read(path)).toBe(html);
  });

  it.each(built.map((b) => [b.page.es, b]))('todo texto en español visible de %s tiene traducción', (_, { missing }) => {
    expect(missing.filter((text) => SPANISH.test(text) && !PLACES.has(text))).toEqual([]);
  });

  it.each(PAGES.map((p) => [p.esPath, p]))('%s y su versión en inglés se enlazan entre sí para los buscadores', (_, page) => {
    for (const path of [page.es, page.en]) {
      const html = read(path);
      expect(html).toContain(`hreflang="es" href="https://rommuser.com${page.esPath}"`);
      expect(html).toContain(`hreflang="en" href="https://rommuser.com${page.enPath}"`);
    }
    expect(read(page.en)).toContain(`<link rel="canonical" href="https://rommuser.com${page.enPath}">`);
    expect(read('sitemap.xml')).toContain(`<loc>https://rommuser.com${page.esPath}</loc>`);
    expect(read('sitemap.xml')).toContain(`<loc>https://rommuser.com${page.enPath}</loc>`);
  });

  it('la política de seguridad deja que el formulario del Golden Circle envíe', () => {
    const endpoint = read('index.html').match(/class="fan-form" data-endpoint="([^"]+)"/)[1];
    const connect = read('_headers').match(/connect-src ([^;]+);/)[1].split(' ');
    expect(connect).toContain(new URL(endpoint).origin);
    expect(connect).toContain('https://script.googleusercontent.com');
  });

  it('acredita los sellos confirmados para Never Be y Echoes', () => {
    for (const path of ['index.html', 'en/index.html']) {
      expect(read(path)).toContain('<strong>NEVER BE</strong><small>HOUSE OF BOOGIE</small>');
      expect(read(path)).toContain('<strong>ECHOES</strong><small>LVLD MUSIC</small>');
    }
  });
});
