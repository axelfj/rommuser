// MÚSICA as a deck and a list of frequencies (Axel, 13.11). Each tab shows one release at a time on the deck: its
// cover, name, label and date, one logo per platform it is on (each logo goes straight to it, one click, no window
// in between) and, when the page can play it, ▶ VER EL VISUALIZER (the cover turns into the video) or
// ▶ ESCUCHAR AQUÍ (the SoundCloud player at the foot of the page). A pre-save shows PRE-SAVE instead.
// Pointing at, focusing or tapping a row of the list tunes the deck to it. The cards themselves are untouched, so
// player.js, release-day.js, the planets and the release automation read them as before; a click that a script
// sends to a card (the player's PLATAFORMAS) still opens the listen dialog.
import { tr } from './lib/i18n.js';
import { PLATFORMS } from './lib/platforms.js';
import { youtubeId } from './hero-release.js';

const CARDS = ':scope > .tracks > .track';

// The platforms under the deck, streaming first, then where DJs buy: the logo and name come from the listen dialog.
// Every release shows this same set (Axel, 13.11), so Bandcamp, which only has The Number EP, stays in the listen
// dialog and out of the deck.
const ORDER = ['spotify', 'apple', 'youtube', 'soundcloud', 'amazon', 'deezer', 'tidal', 'beatport'];

function platformLogos() {
  return [...document.querySelectorAll('#listen-dialog .listen-links a[id^="listen-"]')]
    .map((a) => ({ key: a.id.slice('listen-'.length), name: a.title || a.getAttribute('aria-label') || '', icon: a.querySelector('img')?.getAttribute('src') }))
    .filter((p) => PLATFORMS.includes(p.key) && ORDER.includes(p.key) && p.icon)
    .sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
}

function buildDeck(panel) {
  const deck = document.createElement('div');
  deck.className = 'deck';
  deck.innerHTML =
    '<div class="deck-cover"></div>' +
    '<div class="deck-info"><p class="deck-freq"></p><p class="deck-title"></p><p class="deck-meta"></p>' +
    '<div class="deck-actions"><button class="deck-play" type="button"></button><a class="deck-presave" target="_blank" rel="noopener noreferrer"></a></div><p class="deck-links"></p></div>';
  panel.prepend(deck);
  const $ = (s) => deck.querySelector(s);
  return { deck, cover: $('.deck-cover'), freq: $('.deck-freq'), title: $('.deck-title'), meta: $('.deck-meta'), links: $('.deck-links'), play: $('.deck-play'), presave: $('.deck-presave') };
}

export function initMusicDeck(player) {
  const logos = platformLogos();
  for (const panel of document.querySelectorAll('#musica [role="tabpanel"]')) {
    const cards = [...panel.querySelectorAll(CARDS)];
    if (!cards.length) continue;
    panel.classList.add('has-deck');
    const parts = buildDeck(panel);
    const total = String(cards.length).padStart(2, '0');
    let current = null;

    const showCover = (card) => {
      const cover = card.querySelector('.track-cover');
      parts.cover.replaceChildren(...[...(cover?.childNodes || [])].map((n) => n.cloneNode(true)));
      parts.cover.querySelectorAll('img').forEach((img) => {
        img.loading = 'eager';
      });
      parts.cover.toggleAttribute('data-cover', !!cover?.hasAttribute('data-cover'));
      parts.cover.classList.remove('swap', 'is-video');
      void parts.cover.offsetWidth;
      parts.cover.classList.add('swap');
    };

    const tune = (card) => {
      if (card === current) return;
      current?.classList.remove('is-tuned');
      current = card;
      card.classList.add('is-tuned');
      showCover(card);
      parts.freq.textContent = `${card.querySelector('.track-n')?.textContent || ''} / ${total}`;
      parts.title.textContent = card.querySelector('.track-info strong')?.textContent || '';
      const label = card.querySelector('.track-info small')?.textContent || '';
      const date = card.querySelector('.release-date')?.textContent || '';
      parts.meta.textContent = [label, date].filter(Boolean).join(' · ');
      const presave = card.classList.contains('presave');
      parts.links.replaceChildren(
        ...logos
          .filter((p) => !presave && card.dataset[p.key])
          .map((p) => {
            const a = document.createElement('a');
            a.href = card.dataset[p.key];
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.setAttribute('aria-label', `${p.name}: ${parts.title.textContent}`);
            a.title = p.name;
            const img = document.createElement('img');
            img.src = p.icon;
            img.alt = '';
            img.width = 20;
            img.height = 20;
            const name = document.createElement('span');
            name.textContent = p.name;
            a.append(img, name);
            return a;
          }),
      );
      parts.links.hidden = !parts.links.childElementCount;
      parts.presave.hidden = !presave;
      if (presave) {
        parts.presave.href = card.href;
        parts.presave.textContent = card.querySelector('.track-type')?.textContent || 'PRE-SAVE';
      }
      const video = youtubeId(card.dataset.video);
      const track = player?.tracks?.find((t) => t.row === card);
      parts.play.hidden = presave || (!video && !track);
      parts.play.dataset.mode = video ? 'video' : 'audio';
      parts.play.textContent = video ? tr('VER EL VISUALIZER') : tr('ESCUCHAR AQUÍ');
      if (!presave && !parts.links.childElementCount && parts.play.hidden) {
        parts.meta.textContent = [parts.meta.textContent, card.querySelector('.track-type')?.textContent].filter(Boolean).join(' · ');
      }
    };

    parts.play.addEventListener('click', () => {
      if (!current) return;
      if (parts.play.dataset.mode === 'video') {
        player?.close?.();
        const frame = document.createElement('iframe');
        frame.title = parts.title.textContent;
        frame.allow = 'autoplay; encrypted-media; picture-in-picture';
        frame.allowFullscreen = true;
        frame.src = `https://www.youtube-nocookie.com/embed/${youtubeId(current.dataset.video)}?autoplay=1&playsinline=1&rel=0`;
        parts.cover.removeAttribute('data-cover');
        parts.cover.classList.add('is-video');
        parts.cover.replaceChildren(frame);
        parts.play.hidden = true;
        return;
      }
      const track = player?.tracks?.find((t) => t.row === current);
      if (track) player.play(track);
    });

    for (const card of cards) {
      card.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') tune(card);
      });
      card.addEventListener('focus', () => tune(card));
      // A visitor's click on a row tunes the deck instead of opening the listen dialog or the pre-save page.
      card.addEventListener(
        'click',
        (event) => {
          if (!event.isTrusted) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          tune(card);
          const top = parts.deck.getBoundingClientRect().top;
          if (top < 0) parts.deck.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        },
        { capture: true },
      );
    }
    tune(cards[0]);
  }
}
