import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const PAGES = ['site/index.html', 'site/estudio/index.html', 'site/tienda/index.html', 'site/404.html', 'site/en/index.html', 'site/en/studio/index.html', 'site/en/store/index.html', 'site/es/index.html'];

describe('las tipografías de la marca se sirven desde rommuser.com', () => {
  it('ninguna página las pide a Google Fonts y todas precargan League Spartan y Poppins', () => {
    for (const page of PAGES) {
      const html = read(page);
      expect(html, page).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
      for (const file of ['league-spartan-latin-700-normal', 'poppins-latin-400-normal', 'poppins-latin-700-normal'])
        expect(html, page).toContain(`<link rel="preload" href="/assets/fonts/${file}.woff2" as="font" type="font/woff2" crossorigin>`);
    }
  });

  it('cada archivo que nombra fonts.css existe, con su licencia al lado', () => {
    const files = [...read('site/css/base/fonts.css').matchAll(/url\("\/(assets\/fonts\/[^"]+)"\)/g)].map((m) => m[1]);
    expect(files.length).toBe(6);
    for (const file of files) expect(existsSync(new URL('../site/' + file, import.meta.url)), file).toBe(true);
    expect(read('site/assets/fonts/OFL.txt')).toContain('SIL Open Font License');
  });

  it('la política de seguridad deja cargar las fuentes del propio sitio', () => {
    expect(read('site/_headers')).toMatch(/font-src 'self';/);
  });
});
