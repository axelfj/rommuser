// On a release's day (Costa Rica time) its MÚSICA card stops being a pre-save, even before the daily release job
// rewrites the page: the label reads ESCUCHAR and, when the card already carries platform links (data-soundcloud,
// data-spotify, ...), a tap opens the listen dialog instead of the pre-save page. A card without links keeps its
// verified smartlink (href) as the destination.
import { todayInCostaRica } from './lib/dates.js';
import { tr } from './lib/i18n.js';

export function revealReleasedTracks(cards, today) {
  for (const card of cards) {
    if (card.dataset.release > today) continue;
    card.classList.remove('upcoming');
    card.querySelector('.track-type').textContent = tr('ESCUCHAR');
    if (card.classList.contains('presave') && card.dataset.soundcloud) {
      card.classList.remove('presave');
      card.dataset.track = card.querySelector('strong').textContent;
    }
    if (!card.hasAttribute('href')) {
      card.disabled = false;
      card.dataset.track = card.querySelector('strong').textContent;
    }
  }
}

export function initReleaseDay() {
  revealReleasedTracks(document.querySelectorAll('.track.upcoming[data-release]'), todayInCostaRica());
}
