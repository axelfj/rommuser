// PROPOSAL (Axel, 13.11: "como si desde el 3000 volviéramos al pasado a hacer rommuser.com"). The year-3000 version
// of the home page is a layer over the current one, switched by html.y3000, so both can be compared on the same
// page: the AÑO 2026 / 3000 switch in the corner flips it live, and ?3000 in the address opens it directly.
// What it adds (CSS in css/components/era-3000.css):
//   - the page becomes an instrument: corner brackets on the screen, the Costa Rica coordinates and local time
//     ticking, and the scroll read as a radio frequency (88.0 → 108.0), the needle of the dial in numbers;
//   - every section opens like a light aperture: a red slit across the middle that opens up to the full section;
//   - section titles carry their number, huge and only outlined, behind them;
//   - ROMMUSER is interlaced like a hologram, and a scanline passes over it every few seconds;
//   - on a computer, the cursor carries a small red reticle.
// Once Axel picks an era, this file and the switch go away (or the 3000 rules become the site's own).
import { tr } from './lib/i18n.js';

const KEY = 'rommuser-era';
const SECTIONS = '.artist-home main > section:not(.hero), .artist-home .dates-band';

const remembered = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const remember = (era) => {
  try {
    localStorage.setItem(KEY, era);
  } catch {
    /* private window: it still switches, it just isn't kept */
  }
};

// Scroll position as a radio frequency, 88.0 at the top and 108.0 at the bottom.
export const frequency = (progress) => (88 + 20 * Math.min(1, Math.max(0, progress))).toFixed(1);

function buildHud() {
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.setAttribute('aria-hidden', 'true');
  hud.innerHTML =
    '<span class="hud-corner tl"></span><span class="hud-corner tr"></span><span class="hud-corner bl"></span><span class="hud-corner br"></span>' +
    '<p class="hud-read hud-place">09°56′N 84°05′W · <span class="hud-clock"></span></p>' +
    '<p class="hud-read hud-freq">FM <span class="hud-mhz">88.0</span></p>';
  document.body.append(hud);
  const clock = hud.querySelector('.hud-clock');
  const mhz = hud.querySelector('.hud-mhz');
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const tick = () => {
    clock.textContent = `CR ${time.format(new Date())}`;
  };
  tick();
  setInterval(tick, 1000);
  const header = document.querySelector('.artist-home > header');
  let frame = 0;
  const tune = () => {
    frame = 0;
    // The top brackets sit just under the top bar, which shrinks while scrolling on a computer.
    hud.style.setProperty('--hud-top', `${Math.round(header.getBoundingClientRect().bottom)}px`);
    mhz.textContent = frequency(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(tune);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  tune();
}

function buildSwitch(setEra) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'era-switch';
  button.innerHTML = `<span class="era-label"></span> <span class="era-a">2026</span><span class="era-b">3000</span>`;
  button.querySelector('.era-label').textContent = tr('AÑO');
  const sync = () => {
    const future = document.documentElement.classList.contains('y3000');
    button.setAttribute('aria-pressed', String(future));
    button.setAttribute('aria-label', `${tr('AÑO')} ${future ? '3000' : '2026'}`);
  };
  button.addEventListener('click', () => {
    setEra(document.documentElement.classList.contains('y3000') ? '2026' : '3000');
    sync();
  });
  document.body.append(button);
  sync();
}

function openApertures() {
  const sections = [...document.querySelectorAll(SECTIONS)];
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    sections.forEach((s) => s.classList.add('is-open'));
    return;
  }
  sections.forEach((s) => s.classList.add('aperture'));
  const seen = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      seen.unobserve(e.target);
      e.target.classList.add('is-open');
    }
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
  sections.forEach((s) => seen.observe(s));
}

function startReticle() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const dot = document.createElement('span');
  dot.className = 'reticle';
  dot.setAttribute('aria-hidden', 'true');
  document.body.append(dot);
  let x = -100;
  let y = -100;
  let tx = x;
  let ty = y;
  let frame = 0;
  const follow = () => {
    x += (tx - x) * 0.22;
    y += (ty - y) * 0.22;
    dot.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(follow) : 0;
  };
  addEventListener('pointermove', (e) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!frame) frame = requestAnimationFrame(follow);
  }, { passive: true });
}

export function initEra3000() {
  if (!document.querySelector('.artist-home > header')) return;
  const asked = /[?&](3000|era=3000)\b/.test(location.search) ? '3000' : remembered();
  let built = false;
  const setEra = (era) => {
    const future = era === '3000';
    document.documentElement.classList.toggle('y3000', future);
    remember(era);
    if (future && !built) {
      built = true;
      buildHud();
      openApertures();
      startReticle();
    }
  };
  buildSwitch(setEra);
  setEra(asked === '3000' ? '3000' : '2026');
  document.querySelector('.era-switch').setAttribute('aria-pressed', String(asked === '3000'));
}
