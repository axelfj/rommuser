# Estilos: un solo sistema para rommuser.com y studio.rommuser.com

- Fuente única: `tokens/rommuser.tokens.json` (formato W3C Design Tokens 2025.10). Colores Noche/Hueso/rojo, letra, escala de tamaños, espacios, movimiento y grano.
- `npm run tokens` genera `site/tokens.css`. No se edita a mano; un test falla si no está al día.
- studio.rommuser.com lo importa desde `src/styles.css` (`@import '../site/tokens.css'`) y no escribe colores sueltos (lo vigila `test/tokens.test.js`).
- rommuser.com lo va a cargar con `<link rel="stylesheet" href="/tokens.css">` cuando se pase `site/style.css` y `site/studio.css` a los tokens (fase 2).
- Sin frameworks (Tailwind, Bootstrap, Sass, LESS): CSS nativo con `@layer`, `clamp()` y variables.
