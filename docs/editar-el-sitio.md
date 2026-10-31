# Cómo editar rommuser.com

El sitio está en `site/`. Las páginas en español son la fuente: el inglés, la portada en `/es/` y los archivos que
carga el navegador se generan con un solo comando. Cada archivo hace una sola cosa y lo dice en su primera línea.

## La regla

1. Editas una fuente (abajo está cuál).
2. Corres `npm run site`.
3. Corres `npm test`. Si olvidaste el paso 2, una prueba falla y te lo dice.

La primera vez en una computadora nueva: instala Node 22 y corre `npm install`.

**Nunca edites a mano** `site/build/`, `site/en/`, `site/es/index.html` ni `site/tokens.css`. Se generan y el
próximo `npm run site` (o `npm run tokens`) borra lo que les cambies.

## Quiero cambiar… → edito…

| Quiero cambiar | Edito | Después |
|---|---|---|
| Un texto de la portada | `site/index.html` | `npm run site` |
| Un texto de /estudio, /tienda o la página 404 | `site/estudio/index.html`, `site/tienda/index.html`, `site/404.html` | `npm run site` |
| La traducción al inglés de un texto | `site/i18n/en.json` (texto en español → texto en inglés) | `npm run site` |
| La descripción en inglés para Google y redes | `PAGES` en `scripts/build-site-en.mjs` | `npm run site` |
| Colores, letra, tamaños, espacios, grano | `tokens/rommuser.tokens.json` ([estilos.md](estilos.md)) | `npm run tokens` y `npm run site` |
| El aspecto de una sección | su archivo en `site/css/components/` (tabla abajo) | `npm run site` |
| El aspecto de /estudio | `site/css/pages/studio.css` | `npm run site` |
| Lo que hace una parte de la página | su archivo en `site/js/` (tabla abajo) | `npm run site` |
| Las fechas que revela el bot de lanzamientos | `scripts/lanzamientos.json` | nada, corre solo cada día |

Si cambias un texto en español, cambia también su línea en `en.json`. `npm run site` lista al final los textos que se
quedaron sin traducción ("Sin traducción"); los nombres propios (sellos, ROMMUSER, redes) se quedan así a propósito.

## CSS: un archivo por sección

`site/css/site.css` solo importa los archivos en orden; `site/css/studio.css` hace lo mismo para /estudio. Para
agregar un archivo nuevo, lo creas y agregas su `@import` en el lugar que le toca.

| Archivo | Qué estiliza |
|---|---|
| `base/fonts.css` | League Spartan y Poppins, servidas desde `site/assets/fonts` (nunca desde Google) |
| `base/elements.css` | Etiquetas sueltas (cuerpo, enlaces, botones, títulos, foco) |
| `base/shared.css` | Lo que comparten varias secciones: letra de etiquetas, subrayados, tamaño de controles |
| `base/utilities.css` | `.sr-only` (texto solo para lectores de pantalla) y `.red` |
| `base/grain.css` | El grano sobre la portada |
| `layout/sections.css` | Márgenes de cada sección, "01 / MÚSICA" y títulos de sección |
| `components/header.css` | Barra de arriba, menú del teléfono, BOOKINGS, ES / EN |
| `components/hero.css` | Inicio: foto, frase, botones y FIRMADO EN |
| `components/dates-band.css` | La franja roja de próximas fechas |
| `components/music.css` | MÚSICA: pestañas y portadas |
| `components/listen-dialog.css` | La ventana de "dónde escuchar" que abre una portada |
| `components/player.css` | La barra de abajo mientras suena un tema |
| `components/artist.css` y `artist-system.css` | El artista: bio, sellos con banderas y el RR con los temas en órbita |
| `components/shows.css` | EN VIVO: próxima fecha e historial por año |
| `components/fans.css` | Golden Circle |
| `components/contact.css` | BOOKINGS: correos y press kit |
| `components/footer.css` | Pie de página |
| `pages/store.css`, `pages/studio.css` | /tienda y /estudio |

Los colores no se escriben sueltos: se usan las variables de `tokens.css` (`var(--red)`, `var(--bone)`…). Una prueba
falla si un archivo CSS vuelve a definir los colores o las fuentes de la marca.

## JavaScript: un archivo por función

`site/js/pages/` dice qué carga cada página (`home.js`, `studio.js`, `store.js`). Cada archivo de `site/js/` hace
una cosa: `menu.js`, `music-tabs.js`, `listen-dialog.js`, `release-day.js`, `shows.js`, `dates-band.js`,
`player.js`, `artist-system.js`, `fan-form.js`, `studio-form.js`, `studio-motion.js`, `header-shrink.js`,
`footer-year.js`, `language-link.js`. Lo que comparten está en `site/js/lib/`:

- `dates.js`: el día de hoy en Costa Rica y los nombres de los meses.
- `platforms.js`: la lista de plataformas (Spotify, Apple…). La usan la ventana de escuchar y el bot.
- `i18n.js`: el inglés de los mensajes que escriben los scripts, tomado del mismo `en.json`.
- `forms.js` y `turnstile.js`: lo que comparten los dos formularios.

Un mensaje nuevo que escribe un script se escribe como `tr('Texto en español')` y se agrega a `en.json`.

## Recetas

### Agregar un tema a MÚSICA

1. Guarda la portada en `site/assets/covers/<nombre>.webp`.
2. En `site/index.html`, copia la tarjeta de un tema que ya salió (un `<button class="track music-choice">`) y
   cambia título, sello, número, fecha y portada.
3. Pon un enlace por plataforma: `data-spotify`, `data-apple`, `data-beatport`, `data-soundcloud`, `data-deezer`,
   `data-amazon`, `data-bandcamp`, `data-youtube`. La ventana de escuchar muestra un logo por cada enlace que tenga.
4. El tema más nuevo lleva `latest-release` en su `<time>` (sale en rojo). Quítaselo al anterior.
5. `npm run site`. La órbita de El artista lo toma sola. Si el sello lleva "CON …", agrega su inglés a `en.json`
   (`npm run site` te avisa si falta).

### Un tema que todavía no sale (pre-save)

Copia la tarjeta de un pre-save (`<a class="track music-choice upcoming presave" …>`): el `href` es el enlace del
pre-save y `data-release="AAAA-MM-DD"` es el día de salida. Agrega la misma fecha, título y sello a
`scripts/lanzamientos.json`.

El día de salida pasan dos cosas sin que hagas nada: la página ya dice ESCUCHAR (`release-day.js`) y el bot diario
(`scripts/publicar-lanzamientos.mjs`, desde `.github/workflows/lanzamientos.yml`) reescribe la tarjeta con los
enlaces de `lanzamientos.json`. Para ver qué haría un día: `FECHA=2026-12-11 npm run lanzamientos` (cambia los
archivos de verdad; si solo era una prueba, `git checkout site` lo deshace). El bot hoy no puede publicar solo porque
`main` está protegido; mientras tanto se sube con un PR ese día.

### Agregar o cambiar un show

Edita la tarjeta `.next-show` en EN VIVO: `data-show-date`, `data-show-place`, `data-show-type`, el nombre en `<h3>`
y la fecha en `<time>`. Cuando la fecha pasa, la tarjeta se vuelve una fila del historial sola y la franja roja la
deja de mostrar. Un show pasado que falte se agrega copiando una `.show-row`.

### Cambiar un precio de /estudio

Cada precio aparece en varios lugares porque lo leen personas, Google y redes: la tarjeta, la pregunta frecuente,
las descripciones del `<head>` y los datos para Google (`application/ld+json`) en `site/estudio/index.html`, más su
inglés en `site/i18n/en.json` y en `PAGES` de `scripts/build-site-en.mjs`. Busca el número (por ejemplo `250`) en esos
tres archivos y cámbialo en todos. Si los datos para Google en español y en `PAGES` no coinciden, `npm run site` se
detiene y dice qué texto no encontró.

## Cómo se arma

`npm run site` (`scripts/build-site.mjs`) hace tres cosas:

1. Junta los CSS en `site/build/site.css` y `site/build/studio.css`. Solo los une y quita espacios: los valores
   quedan como los escribiste.
2. Junta los JS de cada página en `site/build/home.js`, `studio.js` y `store.js`.
3. Escribe las páginas en inglés (`site/en/`) y la portada en `/es/` desde las páginas en español y `en.json`.

Cloudflare Pages publica `site/` tal cual, sin compilar nada, por eso lo generado también va en el repositorio.
