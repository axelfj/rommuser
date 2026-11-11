// "El sistema" in El artista: the RR sits at the centre and every released original orbits it, newest closest to
// the core. Tapping a planet plays that track through the page's one player (player.js), and while it plays the RR
// turns like a record at 33⅓, the core breathes on the beat and notes leave the planet. Releases still to come cross
// the frame as comets, one at a time and soonest first, carrying their name and date like an announcement; each
// pass comes in from a random side and the core's gravity bends it.
// Everything is read from the MÚSICA cards, so nothing here is typed twice. It always moves (Axel's call, like the red
// band); a device that asks for less motion gets it at half speed. Colours come from the brand tokens (--bone, --red).
import { shortDate, todayInCostaRica } from './lib/dates.js';
import { tr } from './lib/i18n.js';

export function initArtistSystem(player) {
  const figure = document.querySelector('.artist-system');
  const canvas = figure?.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const rows = [...document.querySelectorAll('#originales .track[data-track]')];
  const today = todayInCostaRica();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const tokens = getComputedStyle(document.documentElement);
  const BONE = tokens.getPropertyValue('--bone').trim();
  const RED = tokens.getPropertyValue('--red').trim();
  const BEAT = 60 / 124; // one beat at 124 BPM, in seconds
  const golden = Math.PI * (3 - Math.sqrt(5));
  const bodies = rows
    .map((row) => {
      const iso = row.querySelector('time')?.getAttribute('datetime') || '';
      return {
        row,
        name: row.dataset.track,
        short: row.dataset.track.replace(/\s*\(.*\)$/, ''),
        label: row.querySelector('.track-info small')?.textContent || '',
        iso,
        track: player?.tracks.find((t) => t.row === row),
        upcoming: !iso || iso >= today,
      };
    })
    .filter((b) => b.iso);
  const released = bodies.filter((b) => !b.upcoming).sort((a, b) => b.iso.localeCompare(a.iso));
  const upcoming = bodies.filter((b) => b.upcoming).sort((a, b) => a.iso.localeCompare(b.iso));
  if (!released.some((b) => b.track)) return;
  const layer = figure.querySelector('.system-bodies');
  figure.querySelector('.system-now').textContent = tr('TOCA UN PLANETA PARA ESCUCHARLO AQUÍ');
  layer.setAttribute('aria-label', tr('Originales de ROMMUSER'));
  released.forEach((b, i) => {
    b.phase = i * golden * 2.3;
    b.orbit = i;
    // A release without a SoundCloud link still orbits; it just can't be played here.
    const button = document.createElement(b.track ? 'button' : 'span');
    button.className = 'system-body';
    button.innerHTML = '<span class="system-name"></span>';
    button.firstChild.textContent = b.short;
    layer.append(button);
    b.el = button;
    if (!b.track) return;
    button.type = 'button';
    button.setAttribute('aria-label', tr('Escuchar aquí') + ': ' + b.name + ', ' + b.label + ', ' + shortDate(b.iso));
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', () => player.play(b.track));
    button.addEventListener('pointerenter', () => {
      hover = b;
      paint();
    });
    button.addEventListener('pointerleave', () => {
      if (hover === b) hover = null;
      paint();
    });
    button.addEventListener('focus', () => {
      hover = b;
      paint();
    });
    button.addEventListener('blur', () => {
      if (hover === b) hover = null;
      paint();
    });
  });
  upcoming.forEach((b, i) => {
    const tag = document.createElement('span');
    tag.className = 'system-body is-upcoming' + (i === 0 ? ' is-next' : '');
    tag.innerHTML = '<span class="system-name"></span><span class="system-date"></span>';
    tag.firstChild.textContent = b.short;
    tag.lastChild.textContent = tr('EN CAMINO') + ' · ' + b.iso.slice(8, 10) + '.' + b.iso.slice(5, 7);
    layer.append(tag);
    b.el = tag;
  });
  const logo = new Image();
  logo.src = '/assets/rr-light.svg';
  logo.addEventListener('load', paint);
  let w = 0,
    h = 0,
    t = 0,
    last = 0,
    frame = 0,
    visible = false,
    hover = null,
    current = null,
    playing = false,
    beatClock = 0,
    pulse = 0,
    spin = 0,
    disc = 0;
  const RPM33 = (Math.PI * 2 * (100 / 3)) / 60;
  const notes = Array.from({ length: 10 }, (_, i) => ({
    kind: i % 3,
    a: (i / 10) * Math.PI * 2,
    r: 1.02 + (i % 4) * 0.04,
    speed: 0.025 + (i % 3) * 0.01,
    bob: i * 1.7,
    size: 0.8 + (i % 2) * 0.25,
  }));
  const sparks = [];
  figure.hidden = false;
  function geometry() {
    // Leave room for the names beside the outer ring; flatter on desktop, rounder on phones.
    const mobile = w < 620,
      room = mobile ? 36 : 140,
      rx = Math.max(80, Math.min((w - room * 2) / 2, h * (mobile ? 0.9 : 1.1))),
      ry = Math.min(rx * (mobile ? 0.62 : 0.5), h * 0.36);
    return { cx: w / 2, cy: h * 0.48, rx, ry, inner: rx * 0.26, outer: rx * 0.8, mobile };
  }
  function orbitRadius(g, i) {
    return released.length < 2 ? g.inner : g.inner + ((g.outer - g.inner) * i) / (released.length - 1);
  }
  function place(g, b, radius, speed) {
    const a = b.phase + t * speed,
      x = g.cx + Math.cos(a) * radius,
      y = g.cy + Math.sin(a) * radius * (g.ry / g.rx),
      z = Math.sin(a);
    b.x = x;
    b.y = y;
    b.z = z;
    b.s = 0.78 + (0.22 * (z + 1)) / 2;
    return b;
  }
  function sphere(x, y, r, alpha, ring) {
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    grad.addColorStop(0, BONE);
    grad.addColorStop(0.55, '#8f8c86');
    grad.addColorStop(1, '#1d1d1c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (ring) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  function note(kind) {
    ctx.beginPath();
    ctx.ellipse(-5, 9, 5, 3.5, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(0, -11);
    if (kind === 0) ctx.quadraticCurveTo(9, -6, 8, 2);
    if (kind === 1) ctx.lineTo(10, -7);
    ctx.stroke();
    if (kind === 1) {
      ctx.beginPath();
      ctx.ellipse(5, 13, 5, 3.5, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(10, 12);
      ctx.lineTo(10, -7);
      ctx.stroke();
    }
  }
  // Comets: each upcoming release takes its turn to cross the frame, then the next one follows. Every pass enters from
  // a random point outside the frame, aimed past the core at a random distance, and the core's gravity bends it: it
  // speeds up as it swings close, its tail traces the curve, and it leaves on a new heading. Each pass's path is worked
  // out once (in units of the record's radius), so a repaint after a resize or a hover draws the same one.
  const COMET_GAP = 11,
    COMET_CROSS = 8,
    GRAVITY = 0.35,
    seed = (Math.random() * 2 ** 32) >>> 0,
    paths = new Map();
  // The same comet, pass and key always give the same number in [0, 1) during one visit; a new visit, new paths.
  function random(...keys) {
    let x = seed;
    for (const k of keys) x = Math.imul(x ^ (k + 0x9e3779b9), 0x85ebca6b) ^ (x >>> 13);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return ((x ^ (x >>> 16)) >>> 0) / 2 ** 32;
  }
  // Comets fly in the plane of the record, among the planets.
  const project = (g, p) => ({ x: g.cx + p.x * g.rx, y: g.cy + p.y * g.ry });
  const outside = (g, p, margin) => {
    const { x, y } = project(g, p);
    return x < -margin || x > w + margin || y < -margin || y > h + margin;
  };
  function cometPath(g, i, pass) {
    const key = `${i}:${pass}:${w}x${h}`;
    if (paths.has(key)) return paths.get(key);
    // Start just outside the frame on a random side, heading past the core by 0.4 to 0.75 of the record's radius.
    const angle = random(i, pass, 1) * Math.PI * 2,
      ux = -Math.cos(angle),
      uy = -Math.sin(angle),
      miss = (0.4 + random(i, pass, 2) * 0.35) * (random(i, pass, 3) < 0.5 ? -1 : 1),
      speed = 0.85 + random(i, pass, 4) * 0.15;
    let edge = 0.5;
    while (!outside(g, { x: -ux * edge - uy * miss, y: -uy * edge + ux * miss }, 24)) edge += 0.05;
    let x = -ux * edge - uy * miss,
      y = -uy * edge + ux * miss,
      vx = ux * speed,
      vy = uy * speed,
      closest = Infinity;
    const points = [{ x, y }];
    for (let step = 0; step < 4000; step++) {
      const r2 = x * x + y * y + 0.0025,
        pull = GRAVITY / (r2 * Math.sqrt(r2));
      vx -= x * pull * 0.01;
      vy -= y * pull * 0.01;
      x += vx * 0.01;
      y += vy * 0.01;
      points.push({ x, y });
      const r = Math.sqrt(x * x + y * y);
      closest = Math.min(closest, r);
      if (r > closest + 0.3 && outside(g, { x, y }, 24)) break;
    }
    if (paths.size > 8) paths.clear();
    paths.set(key, points);
    return points;
  }
  // A point between two samples of a path.
  function at(path, k) {
    const a = path[Math.floor(k)],
      b = path[Math.min(path.length - 1, Math.floor(k) + 1)],
      f = k - Math.floor(k);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  }
  function comet(g, b, i) {
    const cycle = Math.max(upcoming.length, 2) * COMET_GAP,
      since = t - i * COMET_GAP,
      pass = Math.floor(since / cycle),
      p = (since - pass * cycle) / COMET_CROSS;
    b.on = p <= 1;
    if (!b.on) return void (b.x ??= -100, b.y ??= -100);
    b.path = cometPath(g, i, pass);
    b.head = p * (b.path.length - 1);
    const head = project(g, at(b.path, b.head)),
      back = project(g, at(b.path, Math.max(0, b.head - 2)));
    b.x = head.x;
    b.y = head.y;
    b.z = 1;
    b.s = 1;
    b.dx = head.x - back.x;
    b.dy = head.y - back.y;
  }
  function drawComet(g, b) {
    const next = b.el.classList.contains('is-next'),
      tail = Math.max(2, Math.round((b.path.length - 1) * 0.16)),
      end = Math.max(0, b.head - tail),
      spine = [];
    for (let k = b.head; k > end; k -= 3) spine.push(project(g, at(b.path, k)));
    spine.push(project(g, at(b.path, end)));
    // The tail is a ribbon along the path behind the head, 3px each side at the head and nothing at the end.
    const left = [],
      right = [];
    spine.forEach((pt, k) => {
      const o = spine[Math.min(spine.length - 1, k + 1)],
        q = spine[Math.max(0, k - 1)],
        dx = q.x - o.x,
        dy = q.y - o.y,
        d = Math.hypot(dx, dy) || 1,
        half = 3 * (1 - k / (spine.length - 1 || 1));
      left.push([pt.x - (dy / d) * half, pt.y + (dx / d) * half]);
      right.push([pt.x + (dy / d) * half, pt.y - (dx / d) * half]);
    });
    const last = spine[spine.length - 1],
      fade = ctx.createLinearGradient(b.x, b.y, last.x, last.y);
    fade.addColorStop(0, next ? 'rgba(200,29,37,.7)' : 'rgba(235,232,226,.55)');
    fade.addColorStop(1, 'rgba(235,232,226,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = fade;
    ctx.beginPath();
    left.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    right.reverse().forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
    // Dust shed along the tail.
    ctx.fillStyle = BONE;
    for (let k = 1; k < 6; k++) {
      const f = k / 6,
        pt = spine[Math.min(spine.length - 1, Math.round(f * 0.8 * (spine.length - 1)))],
        wob = Math.sin(t * 3 + k * 1.9) * 4;
      ctx.globalAlpha = 0.35 * (1 - f);
      ctx.beginPath();
      ctx.arc(pt.x + wob, pt.y - wob, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    sphere(b.x, b.y, g.mobile ? 4 : 5, 1, false);
    if (next) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, (g.mobile ? 4 : 5) + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
  function paint() {
    if (!w) return;
    const g = geometry();
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 1;
    released.forEach((b, i) => place(g, b, orbitRadius(g, i), 0.2 * Math.pow(g.inner / orbitRadius(g, i), 1.5)));
    upcoming.forEach((b, i) => comet(g, b, i));
    // Grooves and the fixed light across them, so the system reads as a record seen at an angle.
    ctx.save();
    ctx.translate(g.cx, g.cy);
    ctx.scale(1, g.ry / g.rx);
    ctx.strokeStyle = BONE;
    ctx.globalAlpha = 0.035;
    for (let r = g.inner * 0.7; r < g.outer * 1.06; r += g.mobile ? 4 : 5) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = BONE;
    ctx.globalAlpha = 0.014;
    for (const a of [-0.8, Math.PI - 0.8])
      for (const spread of [0.36, 0.24, 0.12]) {
        ctx.beginPath();
        ctx.arc(0, 0, g.outer * 1.06, a - spread / 2, a + spread / 2);
        ctx.arc(0, 0, g.inner * 0.7, a + spread / 2, a - spread / 2, true);
        ctx.closePath();
        ctx.fill();
      }
    ctx.restore();
    // Orbits: thin bone lines, the hovered or playing one brighter.
    released.forEach((b, i) => {
      const r = orbitRadius(g, i),
        lit = b === hover || b === current;
      ctx.globalAlpha = lit ? 0.6 : 0.16;
      ctx.strokeStyle = lit && b === current ? RED : BONE;
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy, r, (r * g.ry) / g.rx, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    const drawBody = (b) =>
      sphere(
        b.x,
        b.y,
        (g.mobile ? 7 : 9) * b.s * (b === current ? 1 + pulse * 0.18 : 1),
        0.55 + (0.45 * (b.z + 1)) / 2,
        b === current,
      );
    const all = [...released, ...upcoming];
    released
      .filter((b) => b.z < 0)
      .sort((a, b) => a.z - b.z)
      .forEach(drawBody);
    // Core: the RR with two halos; it breathes on the beat while a track plays.
    const core = (g.mobile ? 40 : 56) * (1 + pulse * 0.07);
    [1.55, 2.2].forEach((m, i) => {
      ctx.globalAlpha = (playing ? 0.34 : 0.16) * (1 - i * 0.4) + pulse * 0.25;
      ctx.strokeStyle = playing ? RED : BONE;
      ctx.beginPath();
      ctx.ellipse(g.cx, g.cy, core * m * 0.5, core * m * 0.5 * (g.ry / g.rx) * 1.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    if (logo.complete && logo.naturalWidth) {
      ctx.save();
      ctx.translate(g.cx, g.cy);
      ctx.rotate(disc);
      ctx.drawImage(logo, -core / 2, -core / 2, core, core);
      ctx.restore();
    }
    released
      .filter((b) => b.z >= 0)
      .sort((a, b) => a.z - b.z)
      .forEach(drawBody);
    upcoming.forEach((b) => {
      if (b.on) drawComet(g, b);
    });
    // Notes drift on a loose halo around the system.
    ctx.fillStyle = BONE;
    ctx.strokeStyle = BONE;
    ctx.lineWidth = 1.6;
    for (const n of notes) {
      const a = n.a + t * n.speed,
        x = g.cx + Math.cos(a) * g.rx * n.r,
        y = g.cy + Math.sin(a) * g.ry * n.r * 1.5 + Math.sin(t * 0.6 + n.bob) * 10;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 0.4 + n.bob) * 0.35);
      ctx.scale(n.size * (g.mobile ? 0.75 : 1), n.size * (g.mobile ? 0.75 : 1));
      ctx.globalAlpha = 0.16 + (0.12 * (Math.sin(a) + 1)) / 2;
      note(n.kind);
      ctx.restore();
    }
    // While a track plays, notes leave its planet and rise away from the core.
    for (const s of sparks) {
      const k = s.age / s.life;
      ctx.save();
      ctx.translate(s.x + s.vx * s.age, s.y + s.vy * s.age - k * k * 30);
      ctx.rotate(s.spin * s.age);
      ctx.globalAlpha = (1 - k) * 0.75;
      ctx.fillStyle = s.red ? RED : BONE;
      ctx.strokeStyle = ctx.fillStyle;
      note(s.kind);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    // Names sit on the outer side of each body and flip inward when they would leave the frame.
    for (const b of all) {
      b.el.style.transform = `translate(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px)`;
      const lw = (b.lw ??= Math.max(...[...b.el.children].map((c) => c.offsetWidth))) + 22;
      // A comet's name trails behind its head (on the side it comes from) until that would leave the frame.
      const left = b.upcoming ? (b.dx >= 0 ? b.x - lw > 0 : b.x + lw > w) : b.x < g.cx ? b.x - lw > 0 : b.x + lw > w;
      b.el.classList.toggle('is-left', left);
      b.el.classList.toggle('is-back', b.z < -0.2);
      if (b.upcoming) b.el.classList.toggle('is-gone', !b.on);
    }
  }
  function loop(stamp) {
    frame = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (stamp - (last || stamp)) / 1000);
    last = stamp;
    // The system always moves, like the red band (Axel's call): a device that asks for less motion gets it at half speed.
    const pace = reduce.matches ? 0.5 : 1;
    {
      t += dt * pace;
      if (playing && current) {
        beatClock += dt;
        if (beatClock >= BEAT) {
          beatClock -= BEAT;
          pulse = 1;
          const g = geometry(),
            dx = current.x - g.cx,
            dy = current.y - g.cy,
            d = Math.hypot(dx, dy) || 1;
          sparks.push({
            x: current.x,
            y: current.y,
            vx: (dx / d) * 28 + (Math.random() - 0.5) * 14,
            vy: (dy / d) * 20 - 16,
            age: 0,
            life: 2.6,
            kind: sparks.length % 3,
            spin: (Math.random() - 0.5) * 0.8,
            red: Math.random() < 0.25,
          });
        }
      }
      pulse = Math.max(0, pulse - dt * 3.2);
      // Like a turntable: it spins up when a track plays and runs down on pause, then rests where it stopped.
      spin += ((playing ? RPM33 : 0) - spin) * Math.min(1, dt * (playing ? 2.4 : 1.4));
      if (!playing && spin < 0.01) spin = 0;
      disc = (disc + spin * dt) % (Math.PI * 2);
      for (const s of sparks) s.age += dt;
      while (sparks.length && sparks[0].age > sparks[0].life) sparks.shift();
    }
    paint();
    frame = requestAnimationFrame(loop);
  }
  function start() {
    if (!frame && visible && !document.hidden) {
      last = 0;
      frame = requestAnimationFrame(loop);
    }
  }
  function resize() {
    const r = canvas.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = w * d;
    canvas.height = h * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    paint();
  }
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : (cancelAnimationFrame(frame), (frame = 0));
  }).observe(figure);
  document.addEventListener('visibilitychange', start);
  reduce.addEventListener?.('change', () => {
    paint();
    start();
  });
  // Follow the shared player: the playing track's planet turns red and the system starts to breathe.
  player.on((p) => {
    current = released.find((b) => b.track && b.track === p.current) || null;
    playing = Boolean(current && p.playing);
    if (playing && beatClock === 0) beatClock = BEAT;
    for (const b of released) if (b.track) b.el.setAttribute('aria-pressed', String(b === current && playing));
    figure.classList.toggle('is-playing', playing);
    paint();
    start();
  });
}
