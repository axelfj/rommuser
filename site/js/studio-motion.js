// /estudio motion: the hero rises in, each section rises once when about a fifth of it is visible, and the tagline's
// words light up as they cross a line at 65% of the screen, in reading order. Nothing moves for visitors who ask for
// less motion. The CSS for all of it is in css/pages/studio.css (.motion, .is-in, .shown, .word, .lit).

// Splits the tagline into one <span class="word"> per word (after translation, so it works in both languages).
function splitWords(tagline) {
  for (const node of [...tagline.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent.trim()) continue;
    const words = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        words.append(part);
        continue;
      }
      const word = document.createElement('span');
      word.className = 'word';
      word.textContent = part;
      words.append(word);
    }
    node.replaceWith(words);
  }
}

function lightWordsOnScroll(tagline) {
  const words = [...tagline.querySelectorAll('.word')];
  let queued = false;
  const paint = () => {
    queued = false;
    const line = innerHeight * 0.65;
    words.forEach((w) => w.classList.toggle('lit', w.getBoundingClientRect().top < line));
  };
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };
  // Only listen to scrolling while the tagline is on screen.
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      addEventListener('scroll', onScroll, { passive: true });
      paint();
    } else removeEventListener('scroll', onScroll);
  }).observe(tagline);
}

export function initStudioMotion() {
  const tagline = document.querySelector('.tagline-reveal');
  if (tagline) splitWords(tagline);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const root = document.documentElement;
  root.classList.add('motion');
  document.querySelectorAll('.studio-hero .rise').forEach((el, i) => el.style.setProperty('--i', i));
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-in')));
  const reveal = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('shown');
        reveal.unobserve(entry.target);
      }
    },
    { threshold: 0.2 },
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => reveal.observe(el));
  if (tagline) lightWordsOnScroll(tagline);
}
