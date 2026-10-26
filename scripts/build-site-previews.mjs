// Builds noindex structural previews of the artist site in site/preview/: three different layouts over the same content.
import { writeFileSync, mkdirSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Content mirrors site/index.html (ES). Dates as shown there; Pieces stays undated until DENAR confirms.
const releases = [
  { title: 'ID', label: 'ID', date: '11.12.2026', year: 2026, status: 'upcoming' },
  { title: 'PIECES', label: 'DENAR RCRDS · con GOSVE', date: '', year: 2026, status: 'presave', href: 'https://link.tracks.id/dItL' },
  { title: "DON'T WANNA", label: 'Jendex Records · GOSVE feat. ROMMUSER & Outlandar', date: '30.10.2026', year: 2026, status: 'presave', href: 'https://www.beatport.com/release/dont-wanna/7598860' },
  { title: 'HOLY', label: 'DENAR RCRDS', date: '22.08.2026', year: 2026, href: 'https://open.spotify.com/track/4EjfoMJQ5B11CHIWuMDgjS' },
  { title: 'THE NUMBER', label: 'Electric Eden Records', date: '17.04.2026', year: 2026, href: 'https://open.spotify.com/track/4FfVy0JY7a8HyCeeekVZwh' },
  { title: "IDELY (I DON'T EVEN LOVE YOU)", label: 'Electric Eden Records', date: '17.04.2026', year: 2026, href: 'https://open.spotify.com/track/5cgIVGmMSvu7feMoJu7llg' },
  { title: 'NEVER BE', label: 'House Of Boogie', date: '20.03.2026', year: 2026, href: 'https://open.spotify.com/track/13gslr8dsnTQWhSQ5dgflZ' },
  { title: 'DALE', label: 'DENAR RCRDS', date: '31.10.2025', year: 2025, href: 'https://open.spotify.com/track/1IrQ670X2GCrSkke6XeIy3' },
  { title: 'ECHOES', label: 'LVLD Music', date: '08.03.2025', year: 2025, href: 'https://open.spotify.com/track/1ELooVJ9vxKjgBK0sSNpJp' },
  { title: 'TIKIKAI', label: 'Late Hours Music', date: '12.07.2024', year: 2024, href: 'https://open.spotify.com/track/5hkQznyQ6PdAwKN6GljPYk' },
];
const nextShow = { title: 'MAMBO', place: 'Casa Grande', date: '13.11.2026', type: 'CLUB', href: 'https://instagram.com/rommuser' };
const shows = [
  { date: '16.10.2026', title: '360', place: 'Seis / La Fira · Santa Ana, Costa Rica', type: 'CLUB' },
  { date: '17.07.2026', title: '360', place: 'Seis / La Fira · Santa Ana, Costa Rica', type: 'CLUB' },
  { date: '20.06.2026', title: 'KAPOK FESTIVAL', place: 'Uvita, Costa Rica', type: 'FESTIVAL', video: 'https://youtu.be/HbsjPDnovKE?t=105' },
  { date: '19.06.2026', title: 'CLUB IBIZA', place: 'Jacó, Costa Rica', type: 'CLUB' },
  { date: '16.05.2026', title: 'SECRET ROOMS', place: 'Ginebra · Heredia, Costa Rica', type: 'CLUB' },
  { date: '02.05.2026', title: 'SECRET ROOMS', place: 'El Boiler · San José, Costa Rica', type: 'CLUB', video: 'https://www.youtube.com/watch?v=P4GjT1SAnZQ' },
  { date: '14.02.2026', title: 'EL BOILER', place: 'San José, Costa Rica', type: 'CLUB' },
  { date: '23.05.2025', title: 'SECRET ROOMS', place: 'Amón Solar, El Sótano · San José, Costa Rica', type: 'CLUB' },
  { date: '06.05.2023', title: 'SECRET ROOMS', place: 'El Botecito Deluxe · Ciudad Quesada, Costa Rica', type: 'CLUB' },
];
const rooms = '2023 El Botecito Deluxe · 2025 Amón Solar · 2026 El Boiler · 2026 Ginebra';
const roomsHref = 'https://www.instagram.com/secretroomsrecs/';
const labels = ['DENAR RCRDS', 'Electric Eden', 'Late Hours', 'LVLD Music', 'HouseYouNite', 'Jendex Records'];
const bio = 'ROMMUSER produce y mezcla house y techno desde Costa Rica. Su música se mueve entre el groove, la tensión y la melodía. En la pista, esos elementos conviven: momentos que empujan el cuerpo y otros para cerrar los ojos.';
const manifesto = 'La música ya existe. ROMMUSER la sintoniza y la trae a la tierra.';
const sets = 'https://on.soundcloud.com/CIXUJTAwHQNQ6iZRd1';
const remixes = 'https://on.soundcloud.com/26B31B2rW5U11bgGiK';
const booking = 'mailto:bookings@rommuser.com?subject=Booking%20ROMMUSER&body=Hola%20ROMMUSER%2C%0A%0AFecha%3A%0ACiudad%20y%20venue%3A%0ACapacidad%3A%0AHorario%20y%20duraci%C3%B3n%20del%20set%3A%0APresupuesto%3A%0A';
const epk = 'https://docs.google.com/document/d/18n2WqJGcaiTso_TtyPlYY8XAW2wxHLRng7rvMjYR-KI/view';
const rider = 'https://docs.google.com/document/d/13EAdRQe6IrBC89S12bn34mVWEBE98g0zuRltf77ArXc/view';
const socials = [
  ['Spotify', 'https://open.spotify.com/artist/0mwQErvVjNdLmpcmIaikFb'], ['Apple Music', 'https://music.apple.com/us/artist/rommuser/1650613442'],
  ['SoundCloud', 'https://soundcloud.com/rommuser'], ['YouTube', 'https://www.youtube.com/channel/UC6I_rdHIWCi-WciXjxWphMQ'],
  ['Instagram', 'https://instagram.com/rommuser'], ['TikTok', 'https://www.tiktok.com/@rommuser'],
];

const ext = (href, text, cls = '') => `<a${cls ? ` class="${cls}"` : ''} href="${esc(href)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
const action = (r, cls = '') => r.status === 'upcoming' ? `<span class="${cls} is-soon">PRÓXIMAMENTE</span>`
  : ext(r.href, r.status === 'presave' ? 'PRE-SAVE' : 'ESCUCHAR', cls);
const dateOf = (r) => r.date || 'FECHA POR ANUNCIAR';
const year = (d) => d.slice(-4);
const socialLinks = socials.map(([n, h]) => ext(h, n)).join('');

const variants = [
  { slug: 'noche', name: 'A · LA NOCHE' },
  { slug: 'periodico', name: 'B · EL PERIÓDICO' },
  { slug: 'caja', name: 'C · LA CAJA' },
];
const page = (v, body, script = '') => `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">
<title>ROMMUSER · ${esc(v.name)} (preview)</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=League+Spartan:wght@500;700;900&amp;family=Instrument+Serif:ital@0;1&amp;family=Space+Mono:wght@400;700&amp;display=swap">
<link rel="stylesheet" href="/preview/${v.slug}.css"><link rel="icon" href="/assets/rr-192.png"></head>
<body class="pv pv-${v.slug}">
<div class="variant-switch" role="navigation" aria-label="Versiones de diseño">${[{ slug: '', name: 'ACTUAL' }, ...variants].map((o) => `<a href="${o.slug ? `/preview/${o.slug}/` : '/es/'}"${o.slug === v.slug ? ' aria-current="page"' : ''}>${o.name}</a>`).join('')}</div>
${body}
${script ? `<script src="/preview/${script}"></script>` : ''}
</body></html>
`;

// A · LA NOCHE: the site is one night, read top to bottom from doors to dawn. A clock follows the scroll.
const noche = page(variants[0], `
<aside class="clock" aria-hidden="true"><span class="clock-time">22:00</span><span class="clock-label">PUERTAS</span><span class="clock-bar"><i></i></span></aside>
<main>
<section class="hour h-doors" data-time="22:00" data-label="PUERTAS" id="inicio">
  <p class="stamp">22:00 · PUERTAS</p>
  <figure class="doors-photo"><img src="/assets/portrait.webp" alt="ROMMUSER, retrato en blanco y negro" width="1080" height="1350"></figure>
  <h1>ROMMUSER</h1>
  <p class="tag">House y techno, con alma melódica.</p>
  <p class="whisper">Música para cerrar los ojos. Bajá. La noche ya empezó.</p>
</section>
<section class="hour h-warm" data-time="23:00" data-label="EN CABINA" id="artista">
  <p class="stamp">23:00 · EN CABINA</p>
  <h2>Entre el cuerpo <em>y lo que sentís.</em></h2>
  <p class="lede">${esc(bio)}</p>
  <blockquote>${esc(manifesto)}</blockquote>
</section>
<section class="hour h-peak" data-time="00:30" data-label="TRACKLIST" id="musica">
  <p class="stamp">00:30 · TRACKLIST</p>
  <h2>Lo que suena <em>esta noche.</em></h2>
  <ol class="tracklist">${releases.map((r, i) => `<li${r.status ? ` class="is-${r.status}"` : ''}><span class="t-n">${String(i + 1).padStart(2, '0')}</span><span class="t-main"><strong>ROMMUSER — ${esc(r.title)}</strong><small>[${esc(r.label)}]</small></span><time>${dateOf(r)}</time>${action(r, 't-act')}</li>`).join('')}</ol>
  <p class="more">${ext(sets, 'SETS Y SESIONES DE ESTUDIO ↗')}${ext(remixes, 'REMIXES Y EDITS ↗')}</p>
</section>
<section class="hour h-nights" data-time="02:00" data-label="NOCHES ANTERIORES" id="vivo">
  <p class="stamp">02:00 · LA PISTA</p>
  <div class="next"><span>PRÓXIMA NOCHE</span><strong>${nextShow.title}</strong><em>${esc(nextShow.place)}</em><time>${nextShow.date}</time>${ext(nextShow.href, 'NOVEDADES EN INSTAGRAM')}</div>
  <h2>Noches <em>anteriores.</em></h2>
  <ul class="nights">${shows.map((s) => `<li><time>${s.date}</time><strong>${esc(s.title)}</strong><span>${esc(s.place)}</span><i>${s.type}</i>${s.video ? ext(s.video, '▶ VER EL SET') : ''}</li>`).join('')}</ul>
</section>
<section class="hour h-after" data-time="04:00" data-label="AFTER" id="secret-rooms">
  <p class="stamp">04:00 · AFTER</p>
  <div class="door" aria-hidden="true"><img src="/assets/rr-light.svg" alt="" width="70" height="70"></div>
  <div><h2>Secret <em>Rooms.</em></h2><p>Secret Rooms es la noche de ROMMUSER. Un lugar para encontrarnos alrededor de la música.</p><p class="years">${esc(rooms)}</p>${ext(roomsHref, 'ENTRÁ A SECRET ROOMS ↗', 'line')}</div>
</section>
<section class="hour h-dawn" data-time="06:00" data-label="AMANECER" id="contacto">
  <p class="stamp">06:00 · AMANECER</p>
  <h2>La próxima noche <em>puede ser la tuya.</em></h2>
  <dl class="contact"><div><dt>BOOKINGS</dt><dd><a href="${esc(booking)}">bookings@rommuser.com</a></dd></div><div><dt>CONTACTO</dt><dd><a href="mailto:contact@rommuser.com">contact@rommuser.com</a></dd></div><div><dt>PRESS KIT</dt><dd>${ext(epk, 'EPK')} · ${ext(rider, 'RIDER')}</dd></div></dl>
  <p class="signed"><span>FIRMADO EN</span>${labels.map(esc).join(' · ')}</p>
  <nav class="socials" aria-label="Redes">${socialLinks}</nav>
  <p class="foot">© 2026 ROMMUSER / COSTA RICA</p>
</section>
</main>`, 'noche.js');

// B · EL PERIÓDICO: a broadsheet front page. Masthead, lead story, agenda, discography listings, classifieds.
const lead = releases.find((r) => r.title === "DON'T WANNA");
const periodico = page(variants[1], `
<header class="masthead" id="inicio">
  <div class="mast-top"><span>EDICIÓN 2026</span><span>COSTA RICA</span><span>HOUSE Y TECHNO, CON ALMA MELÓDICA</span><span>${releases.length} LANZAMIENTOS · ${shows.length + 1} FECHAS</span></div>
  <h1>ROMMUSER</h1>
  <nav class="mast-nav" aria-label="Secciones"><a href="#musica">Discografía</a><a href="#vivo">Agenda</a><a href="#secret-rooms">Secret Rooms</a><a href="#contacto">Clasificados</a></nav>
</header>
<main class="paper">
<article class="lead">
  <p class="kicker">LANZAMIENTO · 30.10.2026</p>
  <h2>Dos lanzamientos con GOSVE cierran el 2026</h2>
  <p class="deck">Don't Wanna (GOSVE feat. ROMMUSER &amp; Outlandar) sale el 30.10.2026 por Jendex Records. Pieces, por DENAR RCRDS, ya tiene pre-save abierto.</p>
  <div class="cols"><p class="dropcap">${esc(bio)}</p><p>${esc(manifesto)}</p><p class="cta">${ext(lead.href, 'PRE-SAVE DON\'T WANNA')} ${ext(releases[1].href, 'PRE-SAVE PIECES')}</p></div>
</article>
<figure class="portrait"><img src="/assets/portrait.webp" alt="ROMMUSER, retrato en blanco y negro" width="1080" height="1350"><figcaption>ROMMUSER, DJ y productor. Costa Rica.</figcaption></figure>
<aside class="agenda" id="vivo">
  <h3>Agenda</h3>
  <div class="next"><p class="kicker">PRÓXIMA FECHA</p><strong>${nextShow.title}</strong><span>${esc(nextShow.place)} · ${nextShow.date}</span>${ext(nextShow.href, 'Novedades en Instagram')}</div>
  <h4>Fechas anteriores</h4>
  <ul>${shows.map((s) => `<li><time>${s.date}</time><b>${esc(s.title)}</b><span>${esc(s.place)}</span>${s.video ? ext(s.video, 'Ver el set') : ''}</li>`).join('')}</ul>
</aside>
<section class="listings" id="musica">
  <h3>Discografía <small>del más reciente al primero</small></h3>
  <table><thead><tr><th>Título</th><th>Sello</th><th>Fecha</th><th></th></tr></thead><tbody>${releases.map((r) => `<tr${r.status ? ` class="is-${r.status}"` : ''}><td>${esc(r.title)}</td><td>${esc(r.label)}</td><td>${dateOf(r)}</td><td>${action(r)}</td></tr>`).join('')}</tbody></table>
  <p class="more">También: ${ext(sets, 'sets y sesiones de estudio')} · ${ext(remixes, 'remixes y edits')}</p>
</section>
<section class="rooms" id="secret-rooms">
  <p class="kicker">LA NOCHE PROPIA</p>
  <h3>Secret Rooms: una puerta, la misma pista</h3>
  <p>Secret Rooms es la noche de ROMMUSER. Un lugar para encontrarnos alrededor de la música.</p>
  <p class="years">${esc(rooms)}</p>
  ${ext(roomsHref, 'Entrá a Secret Rooms →')}
</section>
<section class="classifieds" id="contacto">
  <h3>Clasificados</h3>
  <div class="ad"><b>SE BUSCA PISTA.</b> Clubes, festivales y eventos. Escribí con fecha, ciudad, capacidad, horario y presupuesto. <a href="${esc(booking)}">bookings@rommuser.com</a></div>
  <div class="ad"><b>PRENSA.</b> Kit de prensa y rider técnico disponibles. ${ext(epk, 'EPK')} · ${ext(rider, 'Rider')}</div>
  <div class="ad"><b>CONTACTO GENERAL.</b> Estudio, prensa y colaboraciones. <a href="mailto:contact@rommuser.com">contact@rommuser.com</a></div>
  <div class="ad"><b>FIRMADO EN.</b> ${labels.map(esc).join(', ')}.</div>
</section>
</main>
<footer class="colophon"><span>© 2026 ROMMUSER / COSTA RICA</span><nav aria-label="Redes">${socialLinks}</nav></footer>`);

// C · LA CAJA: a record crate you flip sideways. Sleeves for releases, stubs for shows, a door, a back cover.
let catalog = 0;
const caja = page(variants[2], `
<header class="crate-head"><a class="crate-brand" href="#inicio">ROMMUSER</a><nav aria-label="Secciones"><a href="#musica">DISCOS</a><a href="#vivo">FECHAS</a><a href="#secret-rooms">SECRET ROOMS</a><a href="#contacto">BOOKINGS</a></nav></header>
<main class="crate" tabindex="0" aria-label="Caja de ROMMUSER, desplazá hacia los lados">
  <section class="card c-cover" id="inicio"><img src="/assets/portrait.webp" alt="ROMMUSER, retrato en blanco y negro" width="1080" height="1350"><div><p class="mono">LA CAJA DE</p><h1>ROMMUSER</h1><p class="serif">House y techno, con alma melódica. Música para cerrar los ojos.</p><p class="mono hint">PASÁ LOS DISCOS →</p></div></section>
  <section class="card c-divider" id="musica"><p class="mono">LADO A</p><h2>Discos</h2><p class="serif">${releases.length} lanzamientos, del más reciente al primero.</p></section>
  ${releases.map((r) => { catalog += 1; return `<article class="card sleeve${catalog % 2 ? '' : ' sleeve-light'}${r.status ? ` is-${r.status}` : ''}"><span class="mono cat">RR-${String(catalog).padStart(2, '0')} · ${r.date ? year(r.date) : '2026'}</span><span class="disc" aria-hidden="true"></span><h3>${esc(r.title)}</h3><p class="mono">${esc(r.label)}</p><p class="mono date">${dateOf(r)}</p>${action(r, 'pill')}</article>`; }).join('')}
  <section class="card c-divider c-divider-dark"><p class="mono">LADO B</p><h2>Más <em>frecuencias.</em></h2>${ext(sets, 'SETS Y SESIONES ↗', 'pill')}${ext(remixes, 'REMIXES Y EDITS ↗', 'pill')}</section>
  <section class="card c-divider" id="vivo"><p class="mono">FECHAS</p><h2>Tickets</h2><p class="serif">Cada noche, con su fecha.</p></section>
  <article class="card stub stub-next"><p class="mono">PRÓXIMA</p><h3>${nextShow.title}</h3><p>${esc(nextShow.place)}</p><p class="stub-date">${nextShow.date}</p><p class="mono">${nextShow.type}</p>${ext(nextShow.href, 'NOVEDADES ↗', 'pill')}</article>
  ${shows.map((s, i) => `<article class="card stub"><p class="mono">ADMIT ONE · Nº ${String(shows.length - i).padStart(3, '0')}</p><h3>${esc(s.title)}</h3><p>${esc(s.place)}</p><p class="stub-date">${s.date}</p><p class="mono">${s.type}</p>${s.video ? ext(s.video, '▶ VER EL SET', 'pill') : ''}</article>`).join('')}
  <section class="card c-door" id="secret-rooms"><div class="door" aria-hidden="true"><img src="/assets/rr-light.svg" alt="" width="64" height="64"></div><p class="mono">LA NOCHE PROPIA DE ROMMUSER</p><h2>Secret <em>Rooms.</em></h2><p class="serif">Un lugar para encontrarnos alrededor de la música.</p><p class="mono">${esc(rooms)}</p>${ext(roomsHref, 'ENTRÁ ↗', 'pill')}</section>
  <section class="card c-liner" id="artista"><p class="mono">NOTAS DE LA FUNDA</p><p class="serif big">${esc(manifesto)}</p><p>${esc(bio)}</p></section>
  <section class="card c-back" id="contacto"><p class="mono">CONTRATAPA</p><h2>Bookings</h2><a class="big-mail" href="${esc(booking)}">bookings@rommuser.com</a><p><a href="mailto:contact@rommuser.com">contact@rommuser.com</a></p><p>${ext(epk, 'EPK ↗', 'pill')}${ext(rider, 'RIDER ↗', 'pill')}</p><p class="mono">FIRMADO EN ${labels.map(esc).join(' · ')}</p><nav class="socials" aria-label="Redes">${socialLinks}</nav><p class="mono">© 2026 ROMMUSER / COSTA RICA</p></section>
</main>
<div class="crate-progress" aria-hidden="true"><i></i></div>`, 'caja.js');

for (const [v, html] of [[variants[0], noche], [variants[1], periodico], [variants[2], caja]]) {
  mkdirSync(new URL(`../site/preview/${v.slug}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`../site/preview/${v.slug}/index.html`, import.meta.url), html);
  console.log(`site/preview/${v.slug}/index.html listo.`);
}
