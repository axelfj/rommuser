// On the home page, on desktop, the top bar shrinks continuously from the top of the page to the end of the hero
// (94px → 47px, logo 58px → 32px). It only sets the --nav-* variables; components/header.css uses them.
export function initHeaderShrink() {
  const header = document.querySelector('.artist-home > header');
  const hero = document.querySelector('.artist-home .hero');
  if (!header || !hero) return;
  let frame = 0;
  const resize = () => {
    frame = 0;
    const end = Math.max(1, hero.getBoundingClientRect().bottom + window.scrollY - 94);
    const progress = window.innerWidth > 900 ? Math.min(1, Math.max(0, window.scrollY / end)) : 0;
    header.style.setProperty('--nav-height', `${94 - 47 * progress}px`);
    header.style.setProperty('--nav-logo-size', `${58 - 26 * progress}px`);
    header.style.setProperty('--nav-language-height', `${44 - 12 * progress}px`);
    header.style.setProperty('--nav-language-padding', `${9 - 6 * progress}px`);
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(resize);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', schedule);
  resize();
}
