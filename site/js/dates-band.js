// The red band under the hero: the next releases and shows, read from the MÚSICA cards (data-release) and the
// next-show card (data-show-date), so a date only ever lives in one place. Past dates drop out on their own; with
// nothing ahead the band stays hidden. Each item says whether it is a release or a show and jumps to its section.
// The items are written as many times as it takes to fill the screen, then all of that once more, and the band slides
// by exactly half: the text leaves on the left and comes back in on the right with no empty stretch, at any width and
// with any number of dates. Only the first set is read by screen readers and reached with Tab.
import { MONTHS, todayInCostaRica } from './lib/dates.js';
import { pageLanguage, tr } from './lib/i18n.js';

function upcomingDates(today) {
  const items = [];
  document.querySelectorAll('.tracks .track[data-release]').forEach((card) => {
    const title = card.querySelector('.track-info strong')?.textContent.trim();
    if (title && card.dataset.release >= today) items.push({ date: card.dataset.release, text: title, kind: tr('LANZAMIENTO'), href: '#musica' });
  });
  document.querySelectorAll('.next-show[data-show-date]').forEach((show) => {
    const name = show.querySelector('h3')?.textContent.trim();
    const text = [name, show.dataset.showPlace].filter(Boolean).join(', ');
    if (name && show.dataset.showDate >= today) items.push({ date: show.dataset.showDate, text, kind: tr('EN VIVO'), href: '#vivo' });
  });
  return items.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function group(items, copy) {
  const months = MONTHS[pageLanguage()];
  const g = document.createElement('span');
  g.className = 'dates-group';
  for (const { date, text, kind, href } of items) {
    const item = document.createElement('a');
    item.className = 'dates-item';
    item.href = href;
    if (copy) item.tabIndex = -1;
    const time = document.createElement('time');
    time.dateTime = date;
    const [, m, d] = date.split('-');
    time.textContent = `${d} ${months[m - 1]}`;
    const label = document.createElement('small');
    label.textContent = kind;
    item.append(time, ` ${text} `, label);
    g.append(item);
  }
  return g;
}

// The band moves at the same pace whatever its length: this many pixels per second.
const PIXELS_PER_SECOND = 22;

function copyOf(items) {
  const copy = group(items, true);
  copy.setAttribute('aria-hidden', 'true');
  return copy;
}

// Fills the track with 2 × n sets, n being the sets it takes to cover the band; the animation moves it by -50%.
function fill(band, track, items) {
  const first = track.firstElementChild;
  const width = first.getBoundingClientRect().width;
  if (!width) return;
  const sets = Math.max(1, Math.ceil(band.clientWidth / width));
  if (track.children.length !== sets * 2) {
    while (track.children.length > 1) track.lastElementChild.remove();
    for (let i = 1; i < sets * 2; i++) track.append(copyOf(items));
  }
  track.style.setProperty('--dates-duration', `${((sets * width) / PIXELS_PER_SECOND).toFixed(1)}s`);
}

export function initDatesBand() {
  const band = document.querySelector('.dates-band');
  const track = band?.querySelector('.dates-track');
  if (!track) return;
  const items = upcomingDates(todayInCostaRica());
  if (!items.length) return;
  track.append(group(items, false));
  band.hidden = false;
  const refill = () => fill(band, track, items);
  refill();
  // Again once the brand fonts are in (they change the width of the text) and whenever the band changes width.
  document.fonts?.ready.then(refill);
  if ('ResizeObserver' in window) new ResizeObserver(refill).observe(band);
}
