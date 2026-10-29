import { readFileSync } from 'node:fs';
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

  it.each(SITE_PAGES)('rommuser.com/%s carga tokens.css antes que style.css', (path) => {
    const html = read('site/' + path);
    const tokens = html.search(/<link rel="stylesheet" href="\/?tokens\.css">/);
    const style = html.search(/<link rel="stylesheet" href="\/?style\.css">/);
    expect(tokens).toBeGreaterThan(-1);
    expect(tokens).toBeLessThan(style);
  });

  it('el CSS del sitio no vuelve a definir los colores ni las fuentes de la marca', () => {
    for (const path of ['site/style.css', 'site/studio.css']) {
      const css = read(path);
      expect(css).not.toMatch(/--(night|bone|red|line|line-strong|gutter|ease):/);
      expect(css).not.toContain("'League Spartan',Arial");
      expect(css).not.toContain('Poppins,Arial');
      expect(css).not.toMatch(/#12130f|#eae6e5|rgba\(18,19,15/i);
    }
  });
});

