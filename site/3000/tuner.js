// /3000/: the page is a tuner. The red needle on the right ruler follows the scroll, the frequency counts as it
// moves, and each time a new station comes in a red line sweeps the screen and the station opens like a slit of
// light. MÚSICA keeps one cover on screen and the rest as a list; the visualizer plays in a screen over the page.
// All of it reads the real tracks and shows embedded in the page (#data). Plain script, no build step.
(() => {
  const data = JSON.parse(document.getElementById('data').textContent);
  const $ = (s, root = document) => root.querySelector(s);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  const LINKS = [['spotify', 'SPOTIFY'], ['apple', 'APPLE MUSIC'], ['youtube', 'YOUTUBE'], ['soundcloud', 'SOUNDCLOUD'], ['beatport', 'BEATPORT'], ['tidal', 'TIDAL'], ['deezer', 'DEEZER'], ['amazon', 'AMAZON'], ['bandcamp', 'BANDCAMP']];
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Costa_Rica' }).format(new Date());
  const short = (iso) => (iso ? iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(2, 4) : '');
  const ytId = (url) => (/(?:v=|youtu\.be\/)([\w-]{11})/.exec(url || '') || [])[1] || '';

  // ── The visualizer screen ──
  const screen = $('.screen');
  const play = (url) => {
    const id = ytId(url);
    if (!id) return;
    screen.querySelector('iframe')?.remove();
    const frame = document.createElement('iframe');
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    frame.title = 'Visualizer';
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
    screen.prepend(frame);
    screen.showModal();
  };
  screen.querySelector('button').addEventListener('click', () => screen.close());
  screen.addEventListener('close', () => screen.querySelector('iframe')?.remove());

  // ── 00 · SEÑAL: what is on air now = the newest released track ──
  const released = data.tracks.filter((t) => t.date && t.date <= today && !t.presave);
  const latest = released[0];
  const now = $('[data-open-latest]');
  if (latest) {
    now.querySelector('img').src = latest.cover;
    now.querySelector('strong').textContent = latest.name;
    now.addEventListener('click', () => (latest.video || latest.youtube ? play(latest.video || latest.youtube) : null));
  } else now.hidden = true;

  // ── 01 · MÚSICA ──
  const deck = $('.deck');
  const cover = $('.deck-cover');
  const list = $('.freqs');
  let current = -1;
  const show = (i) => {
    if (i === current) return;
    current = i;
    const t = data.tracks[i];
    const img = cover.querySelector('img');
    img.src = t.cover;
    img.alt = t.name;
    if (!calm) {
      cover.classList.remove('swap');
      void cover.offsetWidth;
      cover.classList.add('swap');
    }
    $('.deck-title', deck).textContent = t.name;
    $('.deck-meta', deck).replaceChildren(...[t.label, t.date > today ? `SALE ${short(t.date)}` : short(t.date)].map((x) => Object.assign(document.createElement('span'), { textContent: x })));
    const links = $('.deck-links', deck);
    links.replaceChildren();
    if (t.presave) links.append(Object.assign(document.createElement('a'), { className: 'play', href: t.presave, target: '_blank', rel: 'noopener noreferrer', textContent: 'PRE-SAVE ↗' }));
    if (t.video || t.youtube) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'play', textContent: t.video ? '▶ VISUALIZER' : '▶ PLAY' });
      b.addEventListener('click', () => play(t.video || t.youtube));
      links.append(b);
    }
    for (const [key, label] of LINKS) if (t[key]) links.append(Object.assign(document.createElement('a'), { href: t[key], target: '_blank', rel: 'noopener noreferrer', textContent: label }));
    list.querySelectorAll('button').forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
  };
  data.tracks.forEach((t, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    const n = Object.assign(document.createElement('span'), { className: 'mono', textContent: (88.1 + i * 2.1).toFixed(1) });
    const name = Object.assign(document.createElement('strong'), { textContent: t.name });
    const d = Object.assign(document.createElement('span'), { className: 'mono', textContent: t.date > today ? 'PRÓXIMO' : short(t.date) });
    b.append(n, name, d);
    b.addEventListener('click', () => show(i));
    b.addEventListener('mouseenter', () => matchMedia('(hover: hover)').matches && show(i));
    const li = document.createElement('li');
    li.append(b);
    list.append(li);
  });
  show(Math.max(0, data.tracks.indexOf(latest)));

  // ── 02 · EN VIVO ──
  const next = data.next;
  const when = $('.next-when');
  const count = $('.count');
  $('.next-name').textContent = next.name;
  $('.next-place').textContent = `${next.place} · ${short(next.date)}`;
  if (next.date === today) {
    when.textContent = '● EN VIVO HOY';
    count.textContent = 'ESTA NOCHE';
  } else if (next.date > today) {
    when.textContent = 'PRÓXIMA FECHA';
    const target = new Date(`${next.date}T21:00:00-06:00`);
    const tick = () => {
      let s = Math.max(0, Math.floor((target - Date.now()) / 1000));
      const p = (n) => String(n).padStart(2, '0');
      const dd = Math.floor(s / 86400); s %= 86400;
      count.textContent = `T− ${p(dd)}D ${p(Math.floor(s / 3600))}H ${p(Math.floor((s % 3600) / 60))}M ${p(s % 60)}S`;
    };
    tick();
    setInterval(tick, 1000);
  } else {
    when.textContent = 'ÚLTIMA FECHA';
  }
  const log = $('.log');
  for (const s of data.shows) {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.append(Object.assign(document.createElement('strong'), { textContent: s.name }), Object.assign(document.createElement('small'), { textContent: s.place }));
    if (s.video) info.append(document.createElement('br'), Object.assign(document.createElement('a'), { href: s.video, target: '_blank', rel: 'noopener noreferrer', textContent: '▶ VER EL SET' }));
    li.append(Object.assign(document.createElement('span'), { className: 'mono', textContent: short(s.date) }), info);
    log.append(li);
  }

  // ── Clock ──
  const clock = $('.clock-time');
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tickClock = () => (clock.textContent = `CR ${fmt.format(new Date())}`);
  tickClock();
  setInterval(tickClock, 1000);

  // ── The tuner ──
  const stations = [...document.querySelectorAll('.station')];
  const marks = [...document.querySelectorAll('.tuner-stations a')];
  const ruler = $('.tuner-ruler');
  const needle = $('.tuner-needle');
  const freq = $('.tuner-freq b');
  const sweep = $('.sweep');
  const mhz = marks.map((a) => parseFloat(a.dataset.mhz));
  let on = -1;
  let frame = 0;
  const place = () => {
    const h = ruler.clientHeight;
    marks.forEach((a, i) => (a.style.top = `${(i / (marks.length - 1)) * 100}%`));
    // Progress through the stations, with each station's top as a whole number.
    const tops = stations.map((s) => s.offsetTop);
    const y = scrollY + 2;
    let p = 0;
    for (let i = 0; i < tops.length; i++) {
      const end = tops[i + 1] ?? document.documentElement.scrollHeight;
      if (y >= tops[i]) p = i + Math.min(1, (y - tops[i]) / Math.max(1, end - tops[i])) * (i < tops.length - 1 ? 1 : 0);
    }
    p = Math.min(marks.length - 1, p);
    needle.style.transform = `translateY(${((p / (marks.length - 1)) * h).toFixed(1)}px)`;
    const i = Math.floor(p);
    const f = mhz[i] + (mhz[Math.min(i + 1, mhz.length - 1)] - mhz[i]) * (p - i);
    freq.textContent = f.toFixed(1);
    const station = Math.round(p - 0.15 < 0 ? 0 : Math.floor(p + 0.15));
    if (station !== on) {
      on = station;
      marks.forEach((a, j) => a.classList.toggle('on', j === on));
      if (!calm) {
        sweep.classList.remove('go');
        void sweep.offsetWidth;
        sweep.classList.add('go');
      }
    }
  };
  addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; place(); }); }, { passive: true });
  addEventListener('resize', place);
  place();

  // Each station opens the first time a fifth of it is on screen.
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('open'); seen.unobserve(e.target); }
  }, { threshold: 0.18 });
  stations.forEach((s) => seen.observe(s));
})();
