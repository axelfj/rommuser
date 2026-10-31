# ROMMUSER Studio

Chequeo de stems gratis y contratación de mezcla y mastering a través de SoundBetter.

El productor suelta su carpeta de stems y la página le dice, en español, qué corregir antes de mandarla a mezclar: sample rates distintos, clipping, picos sin margen, largos distintos, pistas en silencio, mono guardado en estéreo, bit depth bajo y nombres genéricos. Todo se analiza en el navegador (un Web Worker lee el WAV/AIFF directo); los archivos no se suben a ningún lado. La página ofrece un único botón principal al perfil de ROMMUSER en SoundBetter para consultar y contratar mezcla o mastering. El reporte puede copiarse y compartirse manualmente; no se envían archivos ni datos del chequeo a SoundBetter al hacer clic.

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas con WAV/AIFF sintéticos
npm run build      # typecheck + build estático en dist/
```

## Configuración (opcional)

| Variable | Para qué |
|---|---|
| `VITE_PLAUSIBLE_DOMAIN` | Dominio en Plausible para contar chequeos y clics (sin cookies). Sin él no se carga analítica. |

Texto y enlace de contratación: `index.html` (español/inglés). Contacto y analítica: `src/config.ts`. Studio ya no publica precios ni carga el formulario de pedidos o su desafío Turnstile. Las integraciones históricas permanecen en el repositorio; no se modifican servicios externos.

## Estructura

- `src/lib/header.ts`: lee encabezados WAV (RIFF/RF64) y AIFF/AIFC.
- `src/lib/analyze.ts`: recorre el audio por bloques de 4 MB (picos, clipping, silencio, L = R).
- `src/lib/checks.ts`: convierte el análisis en hallazgos y el veredicto.
- `src/worker.ts`, `src/main.ts`: análisis fuera del hilo principal y la página.

## Sitio rommuser.com

El sitio está en `site/`: páginas en español como fuente, un CSS por sección en `site/css/`, un JS por función en `site/js/` y el inglés en `site/i18n/en.json`. Después de cualquier cambio: `npm run site` y `npm test`. Qué archivo editar para cada cosa: [docs/editar-el-sitio.md](docs/editar-el-sitio.md).

## Publicar

Es un sitio estático: Vercel o Cloudflare Pages con `npm run build` y carpeta `dist/`.
