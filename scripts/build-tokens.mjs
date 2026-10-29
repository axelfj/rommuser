// Genera site/tokens.css desde tokens/rommuser.tokens.json (formato W3C Design Tokens 2025.10).
// El sitio lo carga con <link href="/tokens.css"> y studio.rommuser.com lo importa desde src/styles.css.
// Uso: npm run tokens
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SOURCE = new URL('../tokens/rommuser.tokens.json', import.meta.url);
const TARGET = new URL('../site/tokens.css', import.meta.url);

// El grano de página no es un valor de diseño sino una textura; vive aquí para que haya una sola.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")";

// Nombres cortos que ya usa el CSS del sitio.
const NAMES = {
  'color-': '',
  'space-gutter': 'gutter',
  'motion-ease': 'ease',
  'motion-duration': 'duration',
};

const rename = (path) => {
  const name = path.join('-');
  if (NAMES[name]) return NAMES[name];
  return name.startsWith('color-') ? name.slice(6) : name;
};

const dim = ({ value, unit }) => `${value}${unit}`;

const css = (token, type) => {
  const v = token.$value;
  const fluid = token.$extensions?.['com.rommuser.fluid'];
  switch (type) {
    case 'color': {
      if (v.alpha === undefined) return v.hex;
      const [r, g, b] = v.components.map((c) => Math.round(c * 255));
      return `rgba(${r},${g},${b},${v.alpha})`;
    }
    case 'fontFamily':
      return v.map((f) => (f.includes(' ') ? `'${f}'` : f)).join(',');
    case 'dimension':
      return fluid ? `clamp(${dim(v)},${fluid.preferred},${dim(fluid.max)})` : dim(v);
    case 'duration':
      return dim(v);
    case 'cubicBezier':
      return `cubic-bezier(${v.join(',')})`;
    case 'number':
      return token.$extensions?.['com.rommuser.unit'] ? `${v}${token.$extensions['com.rommuser.unit']}` : String(v);
    default:
      throw new Error(`Tipo de token sin traducir a CSS: ${type}`);
  }
};

function collect(group, path = [], inherited) {
  const type = group.$type ?? inherited;
  // JSON pone primero las claves enteras ("0" antes que "-2"); la escala se ordena por número.
  const numeric = (key) => (/^-?\d+$/.test(key) ? Number(key) : NaN);
  return Object.entries(group)
    .filter(([key]) => !key.startsWith('$'))
    .sort(([a], [b]) => (Number.isNaN(numeric(a) - numeric(b)) ? 0 : numeric(a) - numeric(b)))
    .flatMap(([key, node]) =>
      '$value' in node
        ? [[rename([...path, key]), css(node, node.$type ?? type), node.$description]]
        : collect(node, [...path, key], type),
    );
}

export function buildTokensCss(tokens = JSON.parse(readFileSync(SOURCE, 'utf8'))) {
  const lines = collect(tokens).map(([name, value, note]) => `    --${name}: ${value};${note ? ` /* ${note} */` : ''}`);
  lines.push(`    --grain: ${GRAIN};`);
  return [
    '/* Generado por scripts/build-tokens.mjs desde tokens/rommuser.tokens.json. No editar a mano: npm run tokens. */',
    '@layer tokens {',
    '  :root {',
    ...lines,
    '  }',
    '}',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(TARGET, buildTokensCss());
  console.log('site/tokens.css actualizado');
}
