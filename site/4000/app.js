(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPOTIFY = 'https://open.spotify.com/artist/0mwQErvVjNdLmpcmIaikFb';
  const pad = n => String(n).padStart(2, '0');

  const tracks = [
    { t: 'Pieces', s: 'Pieces', l: 'DENAR RCRDS', w: 'Gosve', d: '11.11.2026', soon: true, href: 'https://link.tracks.id/dItL', cta: 'Pre-save' },
    { t: "Don't Wanna", s: "Don't Wanna", l: 'Jendex Records', w: 'Gosve & Outlandar', d: '30.10.2026', soon: true },
    { t: 'Holy', s: 'Holy', l: 'DENAR RCRDS', d: '22.08.2026' },
    { t: 'The Number', s: 'The Number', l: 'Electric Eden Records', d: '01.05.2026', href: 'https://go.protonradio.com/r/rlu4malct04OQ' },
    { t: "IDELY (I Don't Even Love You)", s: 'IDELY', l: 'Electric Eden Records', d: '01.05.2026' },
    { t: 'Never Be', s: 'Never Be', l: 'House of Boogie', d: '20.03.2026' },
    { t: 'Dale', s: 'Dale', l: 'DENAR RCRDS', d: '31.10.2025' },
    { t: 'Echoes', s: 'Echoes', l: 'LVLD Music', d: '08.03.2025' },
    { t: 'Tikikai', s: 'Tikikai', l: 'Late Hours Music', d: '12.07.2024' },
  ];
  const shows = [
    ['2026-10-16', '360', 'Seis / La Fira · Santa Ana'],
    ['2026-07-17', '360', 'Seis / La Fira · Santa Ana'],
    ['2026-06-20', 'Kapok Festival', 'Uvita'],
    ['2026-06-19', 'Club Ibiza', 'Jacó'],
    ['2026-05-16', 'Secret Rooms', 'Ginebra · Heredia'],
    ['2026-05-02', 'Secret Rooms', 'El Boiler · San José'],
    ['2026-02-14', 'El Boiler', 'San José'],
    ['2025-05-23', 'Secret Rooms', 'Amón Solar, El Sótano · San José'],
    ['2023-05-06', 'Secret Rooms', 'El Botecito Deluxe · Ciudad Quesada'],
  ];

  /* reloj */
  const clock = document.getElementById('clock');
  const tick = () => { const n = new Date(); clock.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`; };
  tick(); setInterval(tick, 1000);

  /* ---------- órbitas ---------- */
  const system = document.getElementById('system');
  const rings = { 2026: 23, 2025: 35, 2024: 47 };   // radio en % del contenedor
  const offsets = { 2026: -70, 2025: 20, 2024: 200 };
  const byYear = {};
  tracks.forEach((tr, i) => { const y = tr.d.slice(-4); (byYear[y] = byYear[y] || []).push(i); });
  const nodes = [];
  Object.entries(byYear).forEach(([y, idx]) => {
    idx.forEach((i, k) => {
      const a = (offsets[y] + k * 360 / idx.length) * Math.PI / 180, r = rings[y];
      const x = 50 + Math.cos(a) * r, yy = 50 + Math.sin(a) * r;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'node' + (x < 50 ? ' left' : '') + (tracks[i].soon ? ' soon' : '');
      b.style.left = x + '%'; b.style.top = yy + '%';
      b.setAttribute('aria-label', `${tracks[i].t}, ${tracks[i].d}`);
      b.innerHTML = `<span>${tracks[i].s}</span>`;
      b.addEventListener('click', () => select(i));
      system.appendChild(b); nodes[i] = b;
    });
  });
  const $ = id => document.getElementById(id);
  function select(i) {
    const tr = tracks[i];
    nodes.forEach((n, k) => n.setAttribute('aria-pressed', String(k === i)));
    $('o-title').textContent = tr.t;
    $('o-state').textContent = tr.soon ? 'Por aterrizar' : 'Ya en la Tierra';
    $('o-label').textContent = tr.l;
    $('o-with').textContent = tr.w || 'Solo';
    $('o-date').textContent = tr.d;
    const a = $('o-link'); a.href = tr.href || SPOTIFY; a.textContent = tr.cta || (tr.soon ? 'Ver lanzamiento' : 'Escuchar');
    if (audio) audio.tone(i);
  }

  /* ---------- constelación ---------- */
  const NS = 'http://www.w3.org/2000/svg', sky = $('sky');
  const t0 = Date.UTC(2023, 0, 1), t1 = Date.UTC(2027, 0, 1);
  const X = d => 30 + (Date.parse(d) - t0) / (t1 - t0) * 940;
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); sky.appendChild(e); return e; };
  el('line', { x1: 30, x2: 970, y1: 200, y2: 200, stroke: 'var(--thread)', 'stroke-width': 1 });
  [2023, 2024, 2025, 2026, 2027].forEach(y => {
    const x = X(`${y}-01-01`);
    el('line', { x1: x, x2: x, y1: 194, y2: 206, stroke: 'var(--haze)', 'stroke-width': 1 });
    const t = el('text', { x, y: 226, 'text-anchor': 'middle', fill: 'var(--haze)', 'font-size': 11, 'font-family': 'Azeret Mono, monospace', 'letter-spacing': 2 }); t.textContent = y;
  });
  const pts = shows.map(([d], i) => [X(d), 60 + ((i * 53) % 110)]);
  el('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: 'none', stroke: 'var(--thread)', 'stroke-width': 1 });
  pts.forEach(([x, y], i) => {
    el('line', { x1: x, x2: x, y1: y, y2: 200, stroke: 'var(--thread)', 'stroke-dasharray': '2 4' });
    el('circle', { cx: x, cy: y, r: 3.5, fill: 'var(--ink)' });
  });
  const mx = X('2026-11-13');
  el('circle', { cx: mx, cy: 40, r: 9, fill: 'none', stroke: 'var(--ember)', 'stroke-width': 1, class: 'pulse' });
  el('circle', { cx: mx, cy: 40, r: 3.5, fill: 'var(--ember)' });
  const mt = el('text', { x: mx - 14, y: 44, 'text-anchor': 'end', fill: 'var(--ink)', 'font-size': 15, 'font-style': 'italic', 'font-family': 'Bodoni Moda, Georgia, serif' }); mt.textContent = 'Mambo';

  const list = $('stars');
  shows.forEach(([d, v, p]) => {
    const [y, m, dd] = d.split('-');
    const li = document.createElement('li');
    li.innerHTML = `<span class="d">${dd}.${m}.${y.slice(2)}</span><span><b>${v}</b><small>${p}</small></span>`;
    list.appendChild(li);
  });
  const cd = $('cd');
  const tcd = () => {
    const ms = new Date('2026-11-13T22:00:00-06:00') - new Date();
    if (ms <= 0) { cd.textContent = 'Encendida'; return; }
    cd.textContent = `${Math.floor(ms / 864e5)}d ${pad(Math.floor(ms / 36e5) % 24)}h`;
  };
  tcd(); setInterval(tcd, 60000);

  /* ---------- copiar ---------- */
  document.querySelectorAll('.copy').forEach(b => b.addEventListener('click', () => {
    const e = $(b.dataset.copy), reset = () => setTimeout(() => b.textContent = 'Copiar', 1600);
    const pick = () => { const r = document.createRange(); r.selectNodeContents(e); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = 'Seleccionado'; reset(); };
    try { navigator.clipboard.writeText(e.textContent).then(() => { b.textContent = 'Copiado'; reset(); }, pick); } catch (_) { pick(); }
  }));

  /* ---------- sonido: solo mientras sostienes ---------- */
  let audio = null;
  function makeAudio() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ctx = new AC(), out = ctx.createGain(); out.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; lp.Q.value = 4;
    lp.connect(out).connect(ctx.destination);
    const base = 55, roots = [0, 3, 5, 7, 10, 12, 15, 17, 19];
    // pares binaurales: izquierda y derecha separadas por pocos Hz
    const voices = [1, 1.5, 2, 3].map((r, i) => {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
      const p1 = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain(), p2 = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (p1.pan) { p1.pan.value = -1; p2.pan.value = 1; }
      o1.type = o2.type = i ? 'sine' : 'triangle'; g.gain.value = [.32, .16, .1, .05][i];
      o1.connect(p1).connect(g); o2.connect(p2).connect(g); g.connect(lp); o1.start(); o2.start();
      return { o1, o2, r };
    });
    const api = {
      ctx,
      tone(i) { const f = base * Math.pow(2, roots[i % roots.length] / 12); voices.forEach(v => { v.o1.frequency.setTargetAtTime(f * v.r, ctx.currentTime, .3); v.o2.frequency.setTargetAtTime(f * v.r + 4, ctx.currentTime, .3); }); },
      level(s) { out.gain.setTargetAtTime(s * .2, ctx.currentTime, .15); lp.frequency.setTargetAtTime(300 + s * 2400, ctx.currentTime, .2); }
    };
    api.tone(0); return api;
  }

  /* ---------- núcleo ---------- */
  const cv = $('orb'), cx = cv.getContext('2d'), holdBtn = $('hold'), meter = $('meter');
  let W = 0, H = 0, sync = 0, holding = false, pointer = { x: 0, y: 0 };
  const N = 1100, P = [];
  for (let i = 0; i < N; i++) {           // esfera de Fibonacci
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996;
    P.push([Math.cos(th) * r, y, Math.sin(th) * r]);
  }
  function size() {
    const d = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * d; cv.height = H * d; cx.setTransform(d, 0, 0, d, 0, 0);
  }
  addEventListener('resize', size); size();
  cv.parentElement.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); pointer.x = (e.clientX - r.left) / r.width - .5; pointer.y = (e.clientY - r.top) / r.height - .5; });

  const start = e => { e.preventDefault(); holding = true; if (!audio) audio = makeAudio(); if (audio) audio.ctx.resume(); };
  const stop = () => { holding = false; };
  holdBtn.addEventListener('pointerdown', start);
  addEventListener('pointerup', stop); addEventListener('pointercancel', stop);
  holdBtn.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) start(e); });
  holdBtn.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') stop(); });
  holdBtn.addEventListener('contextmenu', e => e.preventDefault());

  let ry = 0, rx = -.35;
  function draw(t) {
    sync += ((holding ? 1 : 0) - sync) * (holding ? .012 : .03);
    if (sync < .001) sync = 0;
    holdBtn.style.setProperty('--sync', sync.toFixed(3));
    meter.textContent = sync > .985 ? 'Sincronía 100% · Ya estás dentro' : `Sincronía ${Math.round(sync * 100)}%`;
    document.body.classList.toggle('synced', sync > .985);
    if (audio) audio.level(sync);

    cx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * (W < 600 ? .42 : .34), ox = W / 2, oy = H / 2 - 10;
    ry += .0016 + sync * .01; const tx = rx + pointer.y * .5, ty = ry + pointer.x * .8;
    const sY = Math.sin(ty), cY = Math.cos(ty), sX = Math.sin(tx), cX = Math.cos(tx);
    for (let i = 0; i < N; i++) {
      let [x, y, z] = P[i];
      // con la sincronía la esfera respira en anillos (latitudes que laten)
      const wave = 1 + sync * .18 * Math.sin(y * 14 - t / 220) + .02 * Math.sin(t / 900 + i);
      x *= wave; y *= wave; z *= wave;
      let x1 = x * cY - z * sY, z1 = x * sY + z * cY;
      let y1 = y * cX - z1 * sX, z2 = y * sX + z1 * cX;
      const persp = 2.6 / (2.6 + z2), px = ox + x1 * R * persp, py = oy + y1 * R * persp;
      const a = .18 + (1 - (z2 + 1) / 2) * .7;
      cx.fillStyle = `rgba(11,11,10,${a})`;
      const s = (z2 < 0 ? 1.6 : 1) * persp;
      cx.fillRect(px, py, s, s);
    }
    if (sync > .02) {   // el humano en el centro
      const g = cx.createRadialGradient(ox, oy, 0, ox, oy, R * .5 * sync);
      g.addColorStop(0, `rgba(255,90,43,${.55 * sync})`); g.addColorStop(1, 'rgba(255,90,43,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(ox, oy, R * .5 * sync, 0, 6.29); cx.fill();
    }
    if (!reduce || holding || sync > 0) requestAnimationFrame(draw);
    else setTimeout(() => requestAnimationFrame(draw), 400);
  }
  requestAnimationFrame(draw);

  select(0);
})();
