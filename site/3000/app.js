(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPOTIFY = 'https://open.spotify.com/artist/0mwQErvVjNdLmpcmIaikFb';

  // Catálogo real de rommuser.com. La "frecuencia" es solo el canal del dial.
  const tracks = [
    { t: 'Pieces', l: 'DENAR RCRDS', w: 'con Gosve', d: '11.11.2026', hz: 111.1, soon: true, href: 'https://link.tracks.id/dItL', cta: 'Pre-save' },
    { t: "Don't Wanna", l: 'Jendex Records', w: 'con Gosve & Outlandar', d: '30.10.2026', hz: 128.0, soon: true },
    { t: 'Holy', l: 'DENAR RCRDS', d: '22.08.2026', hz: 144.4 },
    { t: 'The Number', l: 'Electric Eden Records', d: '01.05.2026', hz: 162.6, href: 'https://go.protonradio.com/r/rlu4malct04OQ' },
    { t: "IDELY (I Don't Even Love You)", l: 'Electric Eden Records', d: '01.05.2026', hz: 177.7 },
    { t: 'Never Be', l: 'House of Boogie', d: '20.03.2026', hz: 196.3 },
    { t: 'Dale', l: 'DENAR RCRDS', d: '31.10.2025', hz: 222.0 },
    { t: 'Echoes', l: 'LVLD Music', d: '08.03.2025', hz: 248.8 },
    { t: 'Tikikai', l: 'Late Hours Music', d: '12.07.2024', hz: 432.0 },
  ];

  const shows = [
    ['16.10.26', '360', 'Seis / La Fira · Santa Ana', 'CLUB'],
    ['17.07.26', '360', 'Seis / La Fira · Santa Ana', 'CLUB'],
    ['20.06.26', 'Kapok Festival', 'Uvita', 'FESTIVAL'],
    ['19.06.26', 'Club Ibiza', 'Jacó', 'CLUB'],
    ['16.05.26', 'Secret Rooms', 'Ginebra · Heredia', 'CLUB'],
    ['02.05.26', 'Secret Rooms', 'El Boiler · San José', 'CLUB'],
    ['14.02.26', 'El Boiler', 'San José', 'CLUB'],
    ['23.05.25', 'Secret Rooms', 'Amón Solar, El Sótano · San José', 'CLUB'],
    ['06.05.23', 'Secret Rooms', 'El Botecito Deluxe · Ciudad Quesada', 'CLUB'],
  ];

  /* ---------- texto que se decodifica ---------- */
  const glyphs = 'ΛΞΣΨΩ01#/\\<>+=*▓░';
  function decode(el, delay) {
    const target = el.dataset.text; if (reduce) return;
    let frame = 0; const total = 26 + target.length * 3;
    setTimeout(function tick() {
      el.textContent = target.split('').map((c, i) => frame > i * 4 + 14 ? c : glyphs[(Math.random() * glyphs.length) | 0]).join('');
      if (++frame < total) requestAnimationFrame(tick); else el.textContent = target;
    }, delay);
  }
  document.querySelectorAll('.scramble').forEach((el, i) => decode(el, 200 + i * 260));

  /* ---------- reloj del año 3000 ---------- */
  const clock = document.getElementById('clock');
  const pad = n => String(n).padStart(2, '0');
  function tickClock() {
    const n = new Date();
    clock.textContent = `3000.${pad(n.getMonth() + 1)}.${pad(n.getDate())} · ${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  }
  tickClock(); setInterval(tickClock, 1000);
  const integ = document.getElementById('integ');
  setInterval(() => { integ.textContent = (99.2 + Math.random() * .7).toFixed(1) + '%'; }, 1600);

  /* ---------- sintonizador ---------- */
  const list = document.getElementById('channels'), dial = document.getElementById('dial');
  const rF = document.getElementById('r-freq'), rT = document.getElementById('r-title'), rM = document.getElementById('r-meta'), rL = document.getElementById('r-link');
  tracks.forEach((tr, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" data-i="${i}"><span class="hz">${tr.hz.toFixed(1)} Hz</span><span class="nm">${tr.t}${tr.soon ? '<span class="soon">PRONTO</span>' : ''}</span><span class="yr">${tr.d.slice(-4)}</span></button>`;
    list.appendChild(li);
  });
  let audio = null;
  let current = 0, targetHz = tracks[0].hz, shownHz = targetHz;
  function tune(i) {
    current = i; const tr = tracks[i]; targetHz = tr.hz;
    dial.value = i;
    list.querySelectorAll('button').forEach(b => b.setAttribute('aria-current', String(+b.dataset.i === i)));
    rT.textContent = tr.t;
    rM.textContent = [tr.l, tr.w, tr.d].filter(Boolean).join(' · ');
    rL.href = tr.href || SPOTIFY;
    rL.textContent = tr.cta || (tr.soon ? 'Ver lanzamiento' : 'Escuchar');
    if (audio) audio.retune(tr.hz);
  }
  list.addEventListener('click', e => { const b = e.target.closest('button'); if (b) tune(+b.dataset.i); });
  dial.addEventListener('input', () => tune(+dial.value));
  tune(0);

  /* ---------- bitácora ---------- */
  const log = document.getElementById('log');
  shows.forEach(([d, v, p, k]) => {
    const [dd, mm, yy] = d.split('.');
    const ago = 3000 - (2000 + +yy);
    const li = document.createElement('li');
    li.innerHTML = `<span class="d">${d}</span><span class="ago">HACE ${ago} AÑOS</span><span class="v"><b>${v}</b><span>${p}</span></span><span class="k">${k}</span>`;
    log.appendChild(li);
  });
  const count = document.getElementById('count');
  function tickCount() {
    const ms = new Date('2026-11-13T22:00:00-06:00') - new Date();
    if (ms <= 0) { count.innerHTML = '<strong>EN VIVO</strong>señal abierta'; return; }
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    count.innerHTML = `<strong>${d}d ${pad(h)}h ${pad(m)}m</strong>para la señal`;
  }
  tickCount(); setInterval(tickCount, 30000);

  /* ---------- copiar correo ---------- */
  document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', () => {
    const el = document.getElementById(b.dataset.copy);
    const done = () => { b.textContent = 'Copiado'; setTimeout(() => b.textContent = 'Copiar', 1600); };
    const pick = () => { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Seleccionado'; setTimeout(() => b.textContent = 'Copiar', 1600); };
    try { navigator.clipboard.writeText(el.textContent).then(done, pick); } catch (e) { pick(); }
  }));

  /* ---------- resonancia (audio solo al tocar) ---------- */
  const resBtn = document.getElementById('resonate');
  function makeAudio() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ctx = new AC(), master = ctx.createGain(); master.gain.value = 0;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 900; filt.Q.value = 6;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = .08; lfoG.gain.value = 500;
    lfo.connect(lfoG).connect(filt.frequency); lfo.start();
    filt.connect(master).connect(ctx.destination);
    const ratios = [1, 1.5, 2, 3.01];
    const oscs = ratios.map((r, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = i ? 'sine' : 'triangle'; g.gain.value = [.3, .16, .12, .05][i]; o.connect(g).connect(filt); o.start(); return [o, r]; });
    const an = ctx.createAnalyser(); an.fftSize = 1024; master.connect(an);
    const api = {
      ctx, an, on: false,
      retune(hz) { const base = hz / 2; oscs.forEach(([o, r]) => o.frequency.setTargetAtTime(base * r, ctx.currentTime, .4)); },
      set(on) { api.on = on; ctx.resume(); master.gain.setTargetAtTime(on ? .18 : 0, ctx.currentTime, .6); }
    };
    api.retune(tracks[current].hz);
    return api;
  }
  resBtn.addEventListener('click', () => {
    if (!audio) audio = makeAudio();
    if (!audio) { resBtn.textContent = 'Sin audio en este navegador'; return; }
    const on = !audio.on; audio.set(on);
    resBtn.setAttribute('aria-pressed', String(on));
    resBtn.textContent = on ? 'Silenciar resonancia' : 'Activar resonancia';
  });

  /* ---------- osciloscopio ---------- */
  const sc = document.getElementById('scope'), sx = sc.getContext('2d');
  const buf = new Uint8Array(1024);
  function drawScope(t) {
    const dpr = Math.min(devicePixelRatio || 1, 2), w = sc.clientWidth, h = sc.clientHeight;
    if (sc.width !== w * dpr) { sc.width = w * dpr; sc.height = h * dpr; }
    sx.setTransform(dpr, 0, 0, dpr, 0, 0); sx.clearRect(0, 0, w, h);
    shownHz += (targetHz - shownHz) * .08;
    rF.textContent = shownHz.toFixed(1) + ' Hz';
    sx.strokeStyle = 'rgba(242,240,234,.12)'; sx.lineWidth = 1;
    for (let x = 0; x <= w; x += w / 8) { sx.beginPath(); sx.moveTo(x, 0); sx.lineTo(x, h); sx.stroke(); }
    sx.beginPath(); sx.moveTo(0, h / 2); sx.lineTo(w, h / 2); sx.stroke();
    sx.strokeStyle = '#f2f0ea'; sx.lineWidth = 1.4; sx.beginPath();
    const live = audio && audio.on; if (live) audio.an.getByteTimeDomainData(buf);
    for (let x = 0; x <= w; x++) {
      let y;
      if (live) y = (buf[Math.floor(x / w * 1023)] / 128 - 1) * h * 1.6;
      else { const k = shownHz / 40; y = Math.sin(x / w * k * Math.PI * 2 + t / 600) * h * .28 * Math.sin(x / w * Math.PI) + Math.sin(x * .3 + t / 90) * 1.2; }
      x ? sx.lineTo(x, h / 2 + y) : sx.moveTo(x, h / 2 + y);
    }
    sx.stroke();
  }

  /* ---------- campo de frecuencia ---------- */
  const fc = document.getElementById('field'), fx = fc.getContext('2d');
  let W, H, pts = [], mouse = { x: -1e4, y: -1e4 };
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
    fc.width = W * dpr; fc.height = H * dpr; fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(160, W * H / 9000));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.3 + .2, p: Math.random() * 6.28, s: Math.random() * .25 + .05 }));
  }
  addEventListener('resize', resize); resize();
  addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  function drawField(t) {
    fx.clearRect(0, 0, W, H);
    // anillos de onda alrededor del centro
    const cx = W * .72, cy = H * .38, amp = audio && audio.on ? 1.8 : 1;
    fx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const r = ((t / 40 + i * 90) % 630) + 20;
      fx.strokeStyle = `rgba(242,240,234,${(1 - r / 650) * .08 * amp})`;
      fx.beginPath();
      for (let a = 0; a <= 6.30; a += .05) {
        const rr = r + Math.sin(a * 6 + t / 700 + i) * 6 * amp;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * .62;
        a ? fx.lineTo(x, y) : fx.moveTo(x, y);
      }
      fx.closePath(); fx.stroke();
    }
    // polvo estelar
    for (const p of pts) {
      p.y -= p.s; p.x += Math.sin(t / 3000 + p.p) * .15;
      if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W; }
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 14000) { const f = (14000 - d2) / 14000 * 2.2; p.x += dx / 60 * f; p.y += dy / 60 * f; }
      fx.fillStyle = `rgba(242,240,234,${.25 + .35 * Math.sin(t / 900 + p.p) ** 2})`;
      fx.fillRect(p.x, p.y, p.r, p.r);
    }
  }

  function loop(t) { drawField(t); drawScope(t); if (!reduce) requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  if (reduce) setInterval(() => drawScope(performance.now()), 250);
})();
