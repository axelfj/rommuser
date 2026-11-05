import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildTokensCss } from '../scripts/build-tokens.mjs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const LOOSE_COLOR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(/i;

describe('tokens de marca', () => {
  it('site/tokens.css está al día con tokens/rommuser.tokens.json (npm run tokens)', () => {
    expect(read('site/tokens.css')).toBe(buildTokensCss());
  });

  it('usa los colores de Sombra y señal: Noche, Hueso y un solo rojo', () => {
    const css = read('site/tokens.css');
    expect(css).toContain('--night: #121212;');
    expect(css).toContain('--bone: #ebe8e2;');
    expect(css).toContain('--red: #c81d25;');
  });

  it('studio.rommuser.com toma la marca de tokens.css y no escribe colores sueltos', () => {
    const css = read('src/styles.css');
    expect(css).toContain("@import '../site/tokens.css';");
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(LOOSE_COLOR);
  });

  it.each(['index.html', 'plugins/index.html'])('studio.rommuser.com/%s muestra el mismo RR que rommuser.com y el mismo color de barra', (path) => {
    const html = read(path);
    expect(html).toContain('src="/site/assets/rr-light.svg"');
    expect(html).toContain('<meta name="theme-color" content="#121212" />');
  });

  const SITE_PAGES = ['index.html', 'es/index.html', 'en/index.html', 'estudio/index.html', 'en/studio/index.html', 'tienda/index.html', 'en/store/index.html', '404.html'];

  it.each(SITE_PAGES)('rommuser.com/%s carga una sola hoja con los tokens primero (build/site.css)', (path) => {
    const html = read('site/' + path);
    expect(html).toMatch(/<link rel="stylesheet" href="\/?build\/site\.css">/);
    expect(html).not.toMatch(/href="\/?(tokens|style)\.css"/);
  });

  it('site/css/site.css importa tokens.css antes que cualquier otro archivo', () => {
    const imports = [...read('site/css/site.css').matchAll(/@import "([^"]+)"[^;]*;/g)].map((m) => m[1]);
    expect(imports[0]).toBe('../tokens.css');
  });

  it('cada archivo del CSS entra en una capa declarada, en el orden tokens, base, site, utilities', () => {
    const order = ['tokens', 'base', 'site', 'utilities'];
    for (const entry of ['site/css/site.css', 'site/css/studio.css']) {
      const css = read(entry).replace(/\/\*[\s\S]*?\*\//g, '');
      const imports = [...css.matchAll(/@import "([^"]+)"([^;]*);/g)];
      if (entry.endsWith('site.css')) {
        expect(css).toContain('@layer ' + order.join(', ') + ';');
        expect(css.indexOf('@layer')).toBeLessThan(css.indexOf('@import'));
      }
      for (const [, file, rest] of imports) {
        if (file === '../tokens.css') continue; // tokens.css declares @layer tokens itself
        const layer = rest.match(/layer\((\w+)\)/)?.[1];
        expect(order, `${entry}: ${file}`).toContain(layer);
      }
    }
    expect(read('site/tokens.css')).toContain('@layer tokens {');
  });

  it('!important solo para lo oculto ([hidden]) y para quien pide menos movimiento', () => {
    const dir = new URL('../site/css/', import.meta.url);
    for (const file of readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.css'))) {
      const css = read('site/css/' + file).replace(/\/\*[\s\S]*?\*\//g, '');
      for (const [declaration] of css.matchAll(/[\w-]+:[^;{}]*!important/g)) {
        expect(['display: none !important', 'transition: none !important', 'animation: none !important'], file).toContain(declaration);
      }
    }
  });

  it('el CSS del sitio no vuelve a definir los colores ni las fuentes de la marca', () => {
    const dir = new URL('../site/css/', import.meta.url);
    for (const file of readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.css'))) {
      const css = read('site/css/' + file);
      expect(css, file).not.toMatch(/--(night|bone|red|line|line-strong|gutter|ease):/);
      expect(css, file).not.toContain("'League Spartan',Arial");
      expect(css, file).not.toContain('Poppins,Arial');
      expect(css, file).not.toMatch(/#12130f|#eae6e5|rgba\(18,19,15/i);
    }
  });
});

