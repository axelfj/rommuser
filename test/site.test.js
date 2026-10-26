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

  it('English is the default entry and Spanish remains explicitly accessible', () => {
    expect(read('_redirects')).toMatch(/^\/ \/en\/ 302/m);
    expect(read('es/index.html')).toContain('<html lang="es">');
    expect(read('es/index.html')).toContain('href="/style.css"');
    expect(read('en/index.html')).toContain('href="/es/" hreflang="es"');
    expect(read('i18n.js')).not.toContain('navigator.languages');
  });

  it('la política de seguridad deja que el formulario del Golden Circle envíe', () => {
    const endpoint = read('index.html').match(/class="fan-form" data-endpoint="([^"]+)"/)[1];
    const connect = read('_headers').match(/connect-src ([^;]+);/)[1].split(' ');
    expect(connect).toContain(new URL(endpoint).origin);
    expect(connect).toContain('https://script.googleusercontent.com');
  });

  it('anuncia el lanzamiento del 11.12.2026 como ID / ID, con el mismo formato que los demás', () => {
    const row = read('index.html').match(/<button class="track music-choice upcoming"[^>]*data-release="2026-12-11">.*?<\/button>/s)?.[0];
    expect(row).toContain('<strong>ID</strong><small>ID</small>');
    expect(row).toContain('<time class="release-date" datetime="2026-12-11">11.12.2026</time>');
    expect(row).not.toContain('disabled');
    expect(read('en/index.html')).toContain('<strong>ID</strong><small>ID</small>');
  });

  it('el correo de bookings llega con los datos que hace falta para cotizar, en cada idioma', () => {
    const es = decodeURIComponent(read('index.html').match(/href="mailto:bookings@rommuser\.com\?([^"]+)"/)[1]);
    const en = decodeURIComponent(read('en/index.html').match(/href="mailto:bookings@rommuser\.com\?([^"]+)"/)[1]);
    for (const field of ['Fecha:', 'Ciudad y venue:', 'Capacidad:', 'Presupuesto:']) expect(es).toContain(field);
    for (const field of ['Date:', 'City and venue:', 'Capacity:', 'Budget:']) expect(en).toContain(field);
  });

  it('la ventana de escuchar pone Spotify primero y no muestra plataformas sin enlace', () => {
    const ids = [...read('index.html').matchAll(/id="listen-([a-z]+)"/g)].map((m) => m[1]).filter((id) => !['dialog', 'title'].includes(id));
    expect(ids.slice(0, 3)).toEqual(['spotify', 'apple', 'soundcloud']);
    const app = read('app.js');
    expect(app).not.toContain('ENLACE PENDIENTE');
    expect(app).toContain("element.hidden=isTrack&&!href");
  });

  it('BOOKINGS, sin credenciales escritas, Golden Circle después de la música, sin repetir enlaces en la página', () => {
    for (const path of ['index.html', 'en/index.html']) {
      const html = read(path);
      const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
      expect(html).toContain('<a href="#contacto">BOOKINGS</a>');
      expect(html).not.toContain('>CONTACTO</a>');
      expect(html).not.toContain('originales y un remix firmados');
      expect(html.indexOf('id="musica"')).toBeLessThan(html.indexOf('id="lista"'));
      expect(html).not.toMatch(/docs\.google\.com\/document\/d\/[\w-]+\/edit/);
      // Every outbound link (EPK, rider, set videos, mailto) appears once in the page body.
      const hrefs = [...main.matchAll(/<a [^>]*href="((?:https|mailto)[^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.filter((h, k) => hrefs.indexOf(h) !== k)).toEqual([]);
    }
  });

  // Regla del sitio: una sola etiqueta por acción en todo rommuser.com, en cada idioma.
  it.each([
    ['index.html', { preorder: 'PRE-ORDER', presave: 'PRE-SAVE', upcoming: 'PRÓXIMAMENTE', listen: 'ESCUCHAR' }],
    ['en/index.html', { preorder: 'PRE-ORDER', presave: 'PRE-SAVE', upcoming: 'COMING SOON', listen: 'LISTEN' }],
  ])('%s usa la misma etiqueta para la misma acción en cada lanzamiento', (path, labels) => {
    const html = read(path);
    const rows = [...html.matchAll(/<(a|button) class="track music-choice([^"]*)"[^>]*>.*?<span class="track-type">([^<]*)<\/span><\/\1>/gs)];
    expect(rows.length).toBeGreaterThan(0);
    for (const [, , classes, label] of rows) {
      const action = classes.includes('preorder') ? 'preorder' : classes.includes('presave') ? 'presave' : classes.includes('upcoming') ? 'upcoming' : 'listen';
      expect(label).toBe(labels[action]);
    }
    for (const synonym of ['PREVENTA', 'PREORDER', 'PRE-GUARDAR', 'VER LANZAMIENTO', 'VIEW RELEASE']) expect(html).not.toContain(synonym);
  });

  it('acredita los sellos confirmados para Never Be y Echoes', () => {
    for (const path of ['index.html', 'en/index.html']) {
      expect(read(path)).toContain('<strong>NEVER BE</strong><small>HOUSE OF BOOGIE</small>');
      expect(read(path)).toContain('<strong>ECHOES</strong><small>LVLD MUSIC</small>');
    }
  });

  it('acredita los sellos de FIRMADO EN, con LVLD Music en lugar de LFTD Global', () => {
    const html = read('index.html');
    for (const label of ['HouseYouNite', 'DENAR RCRDS', 'LVLD Music', 'Electric Eden', 'Late Hours']) expect(html).toContain(label);
    expect(html).not.toContain('LFTD');
  });
});
