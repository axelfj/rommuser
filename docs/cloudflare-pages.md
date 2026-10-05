# Publicar en Cloudflare Pages

El repo tiene dos sitios. En Cloudflare son dos proyectos de Pages conectados al mismo repo de GitHub.

| Proyecto | Root directory | Build command | Output directory | Dominio |
| --- | --- | --- | --- | --- |
| rommuser-web | `site` | (vacío) | `.` | rommuser.com y www.rommuser.com |
| rommuser-studio | (vacío, raíz del repo) | `npm run build` | `dist` | studio.rommuser.com |

- Rama de producción: `main`. Cada PR genera una vista previa en ambos proyectos.
- La versión de Node sale de `.node-version` (22).
- Headers de seguridad: `site/_headers` y `public/_headers` (Vite lo copia a `dist/`).
- Redirecciones de studio: `public/_redirects`.
- `www` → `rommuser.com`: agregar `www.rommuser.com` como dominio del proyecto y una
  regla en Rules → Redirect Rules (Hostname = www.rommuser.com → `https://rommuser.com${uri}`, 301).

Netlify sigue funcionando con `netlify.toml` y `site/netlify.toml` mientras dure la prueba.
