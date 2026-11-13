// The newest release, playable at the top of the page without scrolling (people arrive from the Instagram bio).
// It reads the newest released MÚSICA card with a visualizer (data-video) or else a YouTube link, so it moves on by itself on the next release day.
// The video loads only after a tap, as a visible YouTube player: a player you can see and tap plays on iPhone and
// inside the Instagram browser, where the hidden SoundCloud widget behind ESCUCHAR is blocked.
import { todayInCostaRica } from './lib/dates.js';

const CARDS = '#originales .track:is([data-video],[data-youtube]):not(.presave)';

export function newestRelease(cards, today) {
  return [...cards]
    .map((card) => ({ card, iso: card.querySelector('time')?.getAttribute('datetime') || '' }))
    .filter((t) => t.iso && t.iso <= today)
    .sort((a, b) => b.iso.localeCompare(a.iso))[0]?.card || null;
}

export function youtubeId(url) {
  const match = /(?:v=|youtu\.be\/|embed\/)([\w-]{11})/.exec(url || '');
  return match ? match[1] : '';
}

export function initHeroRelease(player) {
  const box = document.querySelector('.hero-release');
  const card = newestRelease(document.querySelectorAll(CARDS), todayInCostaRica());
  const id = youtubeId(card?.dataset.video || card?.dataset.youtube);
  if (!box || !id) return;
  const name = card.querySelector('.track-info strong')?.textContent || '';
  const button = box.querySelector('.hero-release-play');
  box.querySelector('img').src = card.querySelector('.track-cover img')?.getAttribute('src') || '';
  box.querySelector('strong').textContent = name;
  box.querySelector('small').textContent = card.querySelector('.track-info small')?.textContent || '';
  button.setAttribute('aria-label', `${box.querySelector('.hero-release-cta').textContent}: ${name}`);
  box.hidden = false;
  button.addEventListener('click', () => {
    player?.close();
    const frame = document.createElement('iframe');
    frame.className = 'hero-release-video';
    frame.title = name;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture';
    frame.allowFullscreen = true;
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0`;
    button.replaceWith(frame);
  });
}
