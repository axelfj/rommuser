// MÚSICA as a deck and a dial of frequencies. On wide screens each tab shows one release as big as the screen
// allows (cover, name, label, date and its action) beside the list of every release; pointing at or focusing a row
// tunes the deck to it, and the deck's button does exactly what the row does (opens the listen window, plays the
// mixtape or opens the pre-save). On phones the deck stays hidden and the cards are a carousel you swipe
// (css/components/stations.css). The cards themselves are untouched, so player.js, release-day.js, the planets and
// the release automation read them as before.

const CARDS = ':scope > .tracks > .track';

function buildDeck(panel) {
  const deck = document.createElement('div');
  deck.className = 'deck';
  deck.innerHTML =
    '<div class="deck-cover" aria-hidden="true"></div>' +
    '<div class="deck-info"><p class="deck-freq"></p><p class="deck-title"></p><p class="deck-meta"></p>' +
    '<button class="deck-action" type="button"></button></div>';
  panel.prepend(deck);
  return {
    deck,
    cover: deck.querySelector('.deck-cover'),
    freq: deck.querySelector('.deck-freq'),
    title: deck.querySelector('.deck-title'),
    meta: deck.querySelector('.deck-meta'),
    action: deck.querySelector('.deck-action'),
  };
}

export function initMusicDeck() {
  for (const panel of document.querySelectorAll('#musica [role="tabpanel"]')) {
    const cards = [...panel.querySelectorAll(CARDS)];
    if (!cards.length) continue;
    const parts = buildDeck(panel);
    let current = null;
    const tune = (card) => {
      if (card === current) return;
      current?.classList.remove('is-tuned');
      current = card;
      card.classList.add('is-tuned');
      const cover = card.querySelector('.track-cover');
      parts.cover.replaceChildren(...[...(cover?.childNodes || [])].map((n) => n.cloneNode(true)));
      if (cover?.dataset.cover !== undefined) parts.cover.dataset.cover = '';
      else delete parts.cover.dataset.cover;
      parts.cover.classList.remove('swap');
      void parts.cover.offsetWidth;
      parts.cover.classList.add('swap');
      parts.freq.textContent = `${card.querySelector('.track-n')?.textContent || ''} / ${String(cards.length).padStart(2, '0')}`;
      parts.title.textContent = card.querySelector('.track-info strong')?.textContent || '';
      const label = card.querySelector('.track-info small')?.textContent || '';
      const date = card.querySelector('.release-date')?.textContent || '';
      parts.meta.textContent = [label, date].filter(Boolean).join(' · ');
      parts.action.textContent = card.querySelector('.track-type')?.textContent || '';
      parts.action.disabled = card.disabled === true;
      parts.action.classList.toggle('is-presave', card.classList.contains('presave'));
    };
    parts.action.addEventListener('click', () => current?.click());
    for (const card of cards) {
      card.addEventListener('pointerenter', () => tune(card));
      card.addEventListener('focus', () => tune(card));
    }
    tune(cards[0]);
  }
}
