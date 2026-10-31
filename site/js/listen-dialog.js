// Tapping a card in MÚSICA never starts playback: it opens the listen dialog so the fan picks where to listen
// (Axel, 31.10). The dialog shows the card's cover on top and one logo per platform the card links to
// (data-spotify, data-apple, ... on the card; see lib/platforms.js). The title stays for screen readers only: most
// covers already carry the name and the label, and the card the fan tapped shows them too.
// Pre-saves are plain links and never open it. A card with no links at all (an "ID") sends the fan to the Golden
// Circle sign-up instead of an empty list. The generic "MÚSICA DE ROMMUSER" button shows every platform's artist page.
import { coverTone } from './lib/cover-tone.js';
import { tr } from './lib/i18n.js';
import { PLATFORMS } from './lib/platforms.js';

const ALL_MUSIC = 'MÚSICA DE ROMMUSER';

export function initListenDialog() {
  const dialog = document.getElementById('listen-dialog');
  if (!dialog) return;
  const title = document.getElementById('listen-title');
  const art = dialog.querySelector('.listen-art');
  const platforms = PLATFORMS.map((key) => ({ key, element: document.getElementById('listen-' + key) }))
    .filter((p) => p.element)
    .map((p) => ({ ...p, artistPage: p.element.href }));

  const goToSignup = () => {
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('lista')?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
    document.getElementById('fan-email')?.focus({ preventScroll: true });
  };

  let coverRequest = 0;
  const showCover = (card) => {
    // A mixtape without artwork gets a plain black band with the RR mark (data-cover).
    const cover = card.querySelector('.track-cover');
    const typeset = !!cover?.hasAttribute('data-cover');
    art.hidden = !cover;
    art.toggleAttribute('data-cover', typeset);
    art.replaceChildren(...(cover && !typeset ? cover.cloneNode(true).childNodes : []));
    // The band under the cover takes the colour of the cover's bottom edge (--listen-tone in listen-dialog.css).
    dialog.style.removeProperty('--listen-tone');
    const request = ++coverRequest;
    const image = cover?.querySelector('img');
    if (!image) return;
    coverTone(image).then((tone) => {
      if (tone && request === coverRequest) dialog.style.setProperty('--listen-tone', tone);
    });
  };

  const open = (card) => {
    const isTrack = card.dataset.track !== ALL_MUSIC;
    if (isTrack && !platforms.some(({ key }) => card.dataset[key])) return goToSignup();
    for (const { key, element, artistPage } of platforms) {
      const href = card.dataset[key];
      element.hidden = isTrack && !href;
      element.href = href || artistPage;
    }
    title.dataset.original = card.dataset.track;
    title.textContent = tr(card.dataset.track);
    showCover(card);
    dialog.showModal();
  };

  document.querySelectorAll('.music-choice:not(.presave)').forEach((card) =>
    card.addEventListener('click', (event) => {
      event.preventDefault();
      open(card);
    }),
  );
  dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
  // A click on the dark backdrop around the panel closes it too.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
}
