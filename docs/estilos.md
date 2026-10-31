# Estilos: un solo sistema para rommuser.com y studio.rommuser.com

- Fuente única: `tokens/rommuser.tokens.json` (formato W3C Design Tokens 2025.10). Colores Noche/Hueso/rojo, letra, escala de tamaños, espacios, movimiento y grano.
- `npm run tokens` genera `site/tokens.css`. No se edita a mano; un test falla si no está al día.
- studio.rommuser.com lo importa desde `src/styles.css` (`@import '../site/tokens.css'`) y no escribe colores sueltos (lo vigila `test/tokens.test.js`).
- rommuser.com lo importa primero en `site/css/site.css`, que junta un archivo CSS por sección (`site/css/base`, `layout`, `components`, `pages`); `npm run site` lo une en `site/build/site.css` y `site/build/studio.css`. Ningún archivo de `site/css/` define Noche, Hueso, rojo, líneas, gutter ni las fuentes; los leen de los tokens (lo vigila `test/tokens.test.js`). Qué archivo estiliza qué: [editar-el-sitio.md](editar-el-sitio.md).
- Pendiente, con cambio visual y OK de Axel: llevar los ~60 tamaños de letra del sitio a la escala `--step-*` y los grises con transparencia sueltos a tokens.
- Sin frameworks (Tailwind, Bootstrap, Sass, LESS): CSS nativo con `@layer`, `clamp()` y variables.
