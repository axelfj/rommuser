# ROMMUSER Studio

Chequeo de stems gratis y, más adelante, portal de mezcla de ROMMUSER.

El productor suelta su carpeta de stems y la página le dice, en español, qué corregir antes de mandarla a mezclar: sample rates distintos, clipping, picos sin margen, largos distintos, pistas en silencio, mono guardado en estéreo, bit depth bajo y nombres genéricos. Todo se analiza en el navegador (un Web Worker lee el WAV/AIFF directo); los archivos no se suben a ningún lado. Desde el reporte puede pedir mixdown o mastering.

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
| `VITE_FORM_ENDPOINT` | Endpoint tipo Formspree para recibir pedidos. Sin él, el formulario abre un correo a bookings@rommuser.com. |
| `VITE_PLAUSIBLE_DOMAIN` | Dominio en Plausible para contar chequeos y clics (sin cookies). Sin él no se carga analítica. |

Precios y textos del servicio: `src/config.ts`.

## Estructura

- `src/lib/header.ts`: lee encabezados WAV (RIFF/RF64) y AIFF/AIFC.
- `src/lib/analyze.ts`: recorre el audio por bloques de 4 MB (picos, clipping, silencio, L = R).
- `src/lib/checks.ts`: convierte el análisis en hallazgos y el veredicto.
- `src/worker.ts`, `src/main.ts`: análisis fuera del hilo principal y la página.

## Publicar

Es un sitio estático: Vercel o Cloudflare Pages con `npm run build` y carpeta `dist/`.
