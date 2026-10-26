# Presencia + diez direcciones visuales

Nueva propuesta aditiva sobre fb0c952 del PR #43. No sustituye Noche, Periódico ni Caja y no modifica las rutas públicas ES/EN.

- /preview/presencia/es/ y /preview/presencia/en/: variante navegable generada desde el HTML del artista. Reutiliza site/assets/portrait.webp, la fotografía ya presente en el repositorio, sin subir el archivo adjunto ni sus metadatos personales. Conserva enlaces, catálogo, shows, selector musical y accesibilidad existente.
- /preview/propuestas/: galería de diez imágenes conceptuales nuevas, ampliables. La galería distingue bocetos de datos reales. Los errores de texto generativo (nombre partido en Archivo, duraciones ilustrativas en Silencio, Secret Rooms como fila musical en algunos bocetos) no deben implementarse.
- Los tres candidatos recomendados son Presencia, Contacto y Medianoche. Presencia tiene implementación funcional; los restantes son propuestas visuales.
- Generación de imágenes: herramienta integrada imagegen, modo ui-mockup, referencias 1.png/2.png/3.png. Direcciones por imagen y rutas finales en design-concepts.json. Restricciones comunes: identidad real, lentes/cabello/ropa preservados, negro y hueso, sin conciertos inventados, sin fechas ni métricas ficticias.
- Reproducir la variante después de modificar el sitio: npm run site:en y node scripts/build-presence.mjs. Las imágenes son artefactos estáticos, no datos de catálogo.
- Producción no se publica ni se fusiona. PR de comparación para revisión.
