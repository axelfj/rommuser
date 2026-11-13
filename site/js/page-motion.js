// Home page motion: the page is a tuner. A vertical dial runs down the right edge of the screen with a red needle
// and the frequency in MHz; each section is a station (its frequency is data-mhz on its heading, see index.html)
// and the needle rests on it while it is on screen. Each time a new station comes in, one red line sweeps down the
// screen, and the station opens like a slit of light the first time it is seen. Cards, shows and contacts tip up
// into place the first time they appear. Transforms and opacity only, so iPhones keep 60 fps.
// Visitors who ask for less motion get the dial (it only follows the scroll) and nothing else.
// The CSS is in css/components/motion.css. Everything that hides waits for html.motion, so without JavaScript
// nothing is hidden.

import { tr } from './lib/i18n.js';

const STATIONS = [
  { id: '#inicio', mhz: 88.1, label: 'INICIO' },
  { id: '#musica', mhz: 92.7 },
  { id: '#vivo', mhz: 97.3 },
  { id: '#artista', mhz: 101.9 },
  { id: '#contacto', mhz: 106.5 },
];
const RISE = [
  '#vivo .show-row',
  '#contacto .contact-entry',
  '.fan-strip > *',
].join(',');
const APERTURES = '.artist-home main > section:not(.hero)';

const clamp = (n) => Math.min(1, Math.max(0, n));

// How far through the stations a scroll position is: 0 at the first station's top, 1 at the second's, and so on.
export function stationProgress(scroll, tops) {
  if (!tops.length) return 0;
  let p = 0;
  for (let i = 0; i < tops.length; i++) {
    if (scroll < tops[i]) break;
    const next = tops[i + 1];
    p = next === undefined ? i : i + clamp((scroll - tops[i]) / Math.max(1, next - tops[i]));
  }
  return p;
}

// The frequency shown for that progress, gliding between the stations' own frequencies.
export function frequencyAt(p, mhz) {
  const i = Math.min(mhz.length - 1, Math.floor(p));
  const next = mhz[Math.min(i + 1, mhz.length - 1)];
  return (mhz[i] + (next - mhz[i]) * (p - i)).toFixed(1);
}

function buildTuner(stations) {
  const tuner = document.createElement('div');
  tuner.className = 'tuner';
  tuner.setAttribute('aria-hidden', 'true');
  tuner.innerHTML = '<span class="tuner-fm">FM</span><span class="tuner-ruler"><span class="tuner-needle"></span></span><span class="tuner-freq"><b>88.1</b>MHZ</span>';
  const ruler = tuner.querySelector('.tuner-ruler');
  const marks = stations.map((s, i) => {
    const mark = document.createElement('span');
    mark.className = 'tuner-mark';
    mark.textContent = s.label;
    mark.style.top = `${(i / Math.max(1, stations.length - 1)) * 100}%`;
    ruler.append(mark);
    return mark;
  });
  document.body.append(tuner);
  return { tuner, ruler, marks, needle: tuner.querySelector('.tuner-needle'), freq: tuner.querySelector('.tuner-freq b') };
}

function startTuner(calm) {
  const stations = STATIONS.map((s) => ({ ...s, section: document.querySelector(s.id) })).filter((s) => s.section);
  if (stations.length < 2) return;
  // Each station is named on the dial with its own heading, so it reads the page's language.
  for (const s of stations) {
    if (s.label) s.label = tr(s.label);
    else s.label = (s.section.querySelector('.section-heading h2, h2')?.textContent || '').trim();
  }
  stations.find((s) => s.id === '#contacto').label = 'BOOKINGS';
  const { ruler, marks, needle, freq } = buildTuner(stations);
  const nav = document.querySelector('.artist-home > header nav');
  const links = stations.map((s) => nav?.querySelector(`a[href="${s.id}"]`));
  const sweep = document.createElement('span');
  sweep.className = 'tuner-sweep';
  sweep.setAttribute('aria-hidden', 'true');
  document.body.append(sweep);
  const mhz = stations.map((s) => s.mhz);
  let on = -1;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const header = document.querySelector('.artist-home > header')?.offsetHeight || 0;
    const tops = stations.map((s, i) => (i === 0 ? 0 : s.section.getBoundingClientRect().top + scrollY - header));
    const p = stationProgress(scrollY + 2, tops);
    needle.style.transform = `translateY(${((p / (stations.length - 1)) * ruler.clientHeight).toFixed(1)}px)`;
    freq.textContent = frequencyAt(p, mhz);
    const now = Math.min(stations.length - 1, Math.floor(p + 0.2));
    if (now === on) return;
    on = now;
    marks.forEach((m, i) => m.classList.toggle('is-on', i === on));
    links.forEach((a, i) => a?.classList.toggle('is-tuned', i === on));
    if (!calm) {
      sweep.classList.remove('go');
      void sweep.offsetWidth;
      sweep.classList.add('go');
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('load', schedule);
  paint();
}

function onFirstSight(elements, options, show) {
  const seen = new IntersectionObserver((entries) => {
    const fresh = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    fresh.forEach((el, i) => {
      seen.unobserve(el);
      show(el, i);
    });
  }, options);
  elements.forEach((el) => seen.observe(el));
}

export function initPageMotion() {
  if (!document.querySelector('.artist-home > header')) return;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('tuned');
  startTuner(calm);
  if (calm || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('motion');
  const apertures = document.querySelectorAll(APERTURES);
  apertures.forEach((s) => s.classList.add('aperture'));
  onFirstSight(apertures, { rootMargin: '0px 0px -10% 0px', threshold: 0 }, (s) => s.classList.add('is-open'));
  // Rows folded inside a <details> (older years of shows) are left alone: they appear when it opens.
  const rising = [...document.querySelectorAll(RISE)].filter((el) => !el.closest('details'));
  rising.forEach((el) => el.classList.add('rise'));
  onFirstSight(rising, { rootMargin: '0px 0px -6% 0px', threshold: 0.12 }, (el, i) => {
    el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
    el.classList.add('is-in');
    setTimeout(() => {
      el.classList.remove('rise', 'is-in');
      el.style.transitionDelay = '';
    }, 1200 + Math.min(i, 6) * 70);
  });
}
