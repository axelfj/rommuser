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

  it('studio.rommuser.com muestra el mismo RR que rommuser.com y el mismo color de barra', () => {
    const html = read('index.html');
    expect(html).toContain('src="/site/assets/rr-light.svg"');
    expect(html).toContain('<meta name="theme-color" content="#121212" />');
  });
});
