// Home page motion: the page is a radio. Each section is a station; the menu underlines the station on screen, and each time a new station comes in
// one red line sweeps down the screen. Each station opens like a slit of light the first time it is seen, and shows,
// contacts and the Golden Circle tip up into place. Transforms and opacity only, so iPhones keep 60 fps.
// Visitors who ask for less motion keep the menu underline and nothing else.
// The CSS is in css/components/motion.css. Everything that hides waits for html.motion, so without JavaScript
// nothing is hidden.

const STATIONS = ['#inicio', '#musica', '#vivo', '#artista', '#contacto'];
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

function startStations(calm) {
  const stations = STATIONS.map((id) => ({ id, section: document.querySelector(id) })).filter((s) => s.section);
  if (stations.length < 2) return;
  const nav = document.querySelector('.artist-home > header nav');
  const links = stations.map((s) => nav?.querySelector(`a[href="${s.id}"]`));
  const sweep = document.createElement('span');
  sweep.className = 'tuner-sweep';
  sweep.setAttribute('aria-hidden', 'true');
  document.body.append(sweep);
  let on = -1;
  let frame = 0;
  const paint = () => {
    frame = 0;
    const header = document.querySelector('.artist-home > header')?.offsetHeight || 0;
    const tops = stations.map((s, i) => (i === 0 ? 0 : s.section.getBoundingClientRect().top + scrollY - header));
    const now = Math.min(stations.length - 1, Math.floor(stationProgress(scrollY + 2, tops) + 0.2));
    if (now === on) return;
    const first = on === -1;
    on = now;
    links.forEach((a, i) => a?.classList.toggle('is-tuned', i === on));
    if (!calm && !first) {
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
  startStations(calm);
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
