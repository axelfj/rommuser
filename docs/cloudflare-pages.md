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

## Public language

The default homepage redirects to `/en/`. Spanish is explicitly available at `/es/`. `site/index.html` remains the Spanish source; run `npm run site` after any change to regenerate the bundled CSS and JS in `site/build/`, the English pages and the Spanish secondary homepage ([editar-el-sitio.md](editar-el-sitio.md)). Browser language does not override this policy.

Editorial rules and completion evidence: [brand-policy.md](brand-policy.md).
