# Estilos: un solo sistema para rommuser.com y studio.rommuser.com

- Fuente única: `tokens/rommuser.tokens.json` (formato W3C Design Tokens 2025.10). Colores Noche/Hueso/rojo, letra, escala de tamaños, espacios, movimiento y grano.
- `npm run tokens` genera `site/tokens.css`. No se edita a mano; un test falla si no está al día.
- studio.rommuser.com lo importa desde `src/styles.css` (`@import '../site/tokens.css'`) y no escribe colores sueltos (lo vigila `test/tokens.test.js`).
- rommuser.com lo carga con `<link rel="stylesheet" href="/tokens.css">` antes de `style.css` en cada página. `site/style.css` y `site/studio.css` ya no definen Noche, Hueso, rojo, líneas, gutter ni las fuentes; los leen de los tokens (lo vigila `test/tokens.test.js`).
- Pendiente, con cambio visual y OK de Axel: llevar los ~60 tamaños de letra del sitio a la escala `--step-*` y los grises con transparencia sueltos a tokens.
- Sin frameworks (Tailwind, Bootstrap, Sass, LESS): CSS nativo con `@layer`, `clamp()` y variables.
