import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFromDisk } from '../scripts/build-site-en.mjs';

const read = (path) => readFileSync(new URL('../site/' + path, import.meta.url), 'utf8');
const SPANISH = /\b(el|la|los|las|de|del|y|tu|tus|para|con|que|una?|más|sin|por)\b|[ñ¿¡]/i;
const PLACES = new Set(['EL BOILER', 'El Sótano · San José', 'EL BOTECITO DELUXE,', 'San José, Costa Rica']);

describe('rommuser.com', () => {
  it('site/en/index.html está al día con index.html e i18n.js (npm run site:en)', () => {
    const [page] = buildFromDisk();
    expect(read('en/index.html')).toBe(page);
  });

  it('todo texto en español visible tiene su traducción al inglés', () => {
    const [, missing] = buildFromDisk();
    expect(missing.filter((text) => SPANISH.test(text) && !PLACES.has(text))).toEqual([]);
  });

  it('las dos versiones se enlazan entre sí para los buscadores', () => {
    for (const path of ['index.html', 'en/index.html']) {
      const html = read(path);
      expect(html).toContain('hreflang="es" href="https://rommuser.com/"');
      expect(html).toContain('hreflang="en" href="https://rommuser.com/en/"');
    }
    expect(read('en/index.html')).toContain('<link rel="canonical" href="https://rommuser.com/en/">');
    expect(read('sitemap.xml')).toContain('<loc>https://rommuser.com/en/</loc>');
  });

  it('la política de seguridad deja que el formulario del Golden Circle envíe', () => {
    const endpoint = read('index.html').match(/class="fan-form" data-endpoint="([^"]+)"/)[1];
    const connect = read('_headers').match(/connect-src ([^;]+);/)[1].split(' ');
    expect(connect).toContain(new URL(endpoint).origin);
    expect(connect).toContain('https://script.googleusercontent.com');
  });

  it('solo acredita los sellos aprobados', () => {
    for (const path of ['index.html', 'en/index.html']) {
      expect(read(path)).not.toMatch(/HOUSE OF BOOGIE|LFTD|LVLD|HOUSEYOUNITE/i);
    }
  });
});
