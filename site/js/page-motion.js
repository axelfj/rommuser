// Home page motion, "the dial": the page behaves like a radio being tuned, the way the bio says ROMMUSER tunes into
// the music. Four pieces, all transforms and opacity so iPhones keep 60 fps:
//   1. The dial. A ruler of ticks on the bottom edge of the top bar with a red needle. Scrolling moves the needle; on
//      a computer it glides from one menu link to the next and the link of the section on screen lights up, on a phone
//      it crosses the width and stops on a bright tick per section.
//   2. The hero scene. While the hero scrolls away, ROMMUSER drifts up and fades and the portrait slowly zooms and
//      darkens, like the camera pulling past it (--hero-p, 0 to 1).
//   3. Tuning in. Section titles come in through a scanline with a red ghost that settles into the letters, and a red
//      signal line crosses under them once.
//   4. Rising. Cards, shows and contact entries tip up from below in a short stagger the first time they appear.
// Visitors who ask for less motion get the dial (it only follows the scroll) and nothing else.
// The CSS is in css/components/motion.css. Everything waits for the .motion class, so without JavaScript nothing
// is hidden.

const STATIONS = ['#musica', '#vivo', '#artista', '#contacto'];
const RISE = [
  '#originales .tracks > .track',
  '#remixes .tracks > .track',
  '#mixtapes .tracks > .track',
  '#vivo .show-row',
  '#artista .artist-layout > *',
  '#contacto .contact-entry',
  '.fan-strip > *',
].join(',');
const TUNE = '.artist-home .section-heading, .artist-home .fan-strip';

const clamp = (n) => Math.min(1, Math.max(0, n));

// Where the needle sits for a given scroll position: piecewise between the stations, so it rests under a station
// while its section fills the screen and glides in between.
export function needleAt(scroll, stops) {
  if (!stops.length) return 0;
  if (scroll <= stops[0].y) return stops[0].x * clamp(scroll / Math.max(1, stops[0].y));
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1];
    const b = stops[i];
    if (scroll <= b.y) return a.x + (b.x - a.x) * ((scroll - a.y) / Math.max(1, b.y - a.y));
  }
  return stops[stops.length - 1].x;
}

function buildDial(header) {
  const dial = document.createElement('div');
  dial.className = 'dial';
  dial.setAttribute('aria-hidden', 'true');
  dial.innerHTML = '<span class="dial-ticks"></span><span class="dial-needle"></span>';
  header.append(dial);
  return dial;
}

function startDial(header) {
  const sections = STATIONS.map((id) => document.querySelector(id)).filter(Boolean);
  const links = STATIONS.map((id) => header.querySelector(`nav a[href="${id}"]`));
  if (!sections.length) return;
  const dial = buildDial(header);
  const needle = dial.querySelector('.dial-needle');
  const marks = sections.map(() => {
    const mark = document.createElement('span');
    mark.className = 'dial-mark';
    dial.append(mark);
    return mark;
  });
  let frame = 0;
  const paint = () => {
    frame = 0;
    const width = dial.clientWidth;
    const left = dial.getBoundingClientRect().left;
    const headerBottom = header.getBoundingClientRect().bottom;
    const end = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const stops = sections.map((section, i) => {
      const y = Math.min(end, section.getBoundingClientRect().top + scrollY - headerBottom);
      const link = links[i];
      const box = link && link.offsetWidth ? link.getBoundingClientRect() : null;
      const x = box ? box.left + box.width / 2 - left : width * (0.12 + 0.76 * (i / Math.max(1, sections.length - 1)));
      marks[i].style.transform = `translateX(${x.toFixed(1)}px)`;
      return { x, y };
    });
    needle.style.transform = `translateX(${needleAt(scrollY, stops).toFixed(1)}px)`;
    const probe = scrollY + innerHeight * 0.4;
    let on = -1;
    stops.forEach((s, i) => {
      if (probe >= s.y + headerBottom) on = i;
    });
    links.forEach((link, i) => link?.classList.toggle('is-tuned', i === on));
    marks.forEach((mark, i) => mark.classList.toggle('is-tuned', i === on));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(paint);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule);
  addEventListener('load', schedule);
  paint();
}

function startHeroScene(hero) {
  let frame = 0;
  const paint = () => {
    frame = 0;
    const p = clamp(scrollY / Math.max(1, hero.offsetHeight * 0.9));
    hero.style.setProperty('--hero-p', p.toFixed(3));
  };
  addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
  paint();
}

function onFirstSight(elements, rootMargin, show) {
  const seen = new IntersectionObserver((entries) => {
    const fresh = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    fresh.forEach((el, i) => {
      seen.unobserve(el);
      show(el, i);
    });
  }, { rootMargin, threshold: 0.12 });
  elements.forEach((el) => seen.observe(el));
}

export function initPageMotion() {
  const header = document.querySelector('.artist-home > header');
  if (!header) return;
  startDial(header);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('motion');
  const hero = document.querySelector('.artist-home .hero');
  if (hero) startHeroScene(hero);
  onFirstSight(document.querySelectorAll(TUNE), '0px 0px -12% 0px', (el) => el.classList.add('is-tuned'));
  // Rows folded inside a <details> (older years of shows) are left alone: they appear when it opens.
  const rising = [...document.querySelectorAll(RISE)].filter((el) => !el.closest('details'));
  rising.forEach((el) => el.classList.add('rise'));
  onFirstSight(rising, '0px 0px -6% 0px', (el, i) => {
    el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
    el.classList.add('is-in');
    // Once it has landed it goes back to its own styles (hover, focus, transitions).
    setTimeout(() => {
      el.classList.remove('rise', 'is-in');
      el.style.transitionDelay = '';
    }, 1200 + Math.min(i, 6) * 70);
  });
}
