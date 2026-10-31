// The red band under the hero: the next releases and shows, read from the MÚSICA cards (data-release) and the
// next-show card (data-show-date), so a date only ever lives in one place. Past dates drop out on their own; with
// nothing ahead the band stays hidden. Each item says whether it is a release or a show and jumps to its section.
// The items are written twice so the band can scroll in a loop; the copy is hidden from screen readers and Tab.
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

export function initDatesBand() {
  const band = document.querySelector('.dates-band');
  const track = band?.querySelector('.dates-track');
  if (!track) return;
  const items = upcomingDates(todayInCostaRica());
  if (!items.length) return;
  const copy = group(items, true);
  copy.setAttribute('aria-hidden', 'true');
  track.append(group(items, false), copy);
  band.hidden = false;
}
