// The red band under the hero: the next releases and shows, read from the MÚSICA cards (data-release) and the
// next-show card (data-show-date), so a date only ever lives in one place. Past dates drop out on their own; with
// nothing ahead the band stays hidden. It stands still: a labelled list of real dates read like stations on a dial,
// each saying whether it is a release or a show and jumping to its section; a date that is today pulses.
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

function list(items, today) {
  const months = MONTHS[pageLanguage()];
  const g = document.createDocumentFragment();
  for (const { date, text, kind, href } of items) {
    const item = document.createElement('a');
    item.className = 'dates-item';
    item.href = href;
    if (date === today) item.classList.add('is-today');
    const time = document.createElement('time');
    time.dateTime = date;
    const [, m, d] = date.split('-');
    const day = document.createElement('b');
    day.textContent = d;
    time.append(day, ` ${months[m - 1]}`);
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
  const today = todayInCostaRica();
  const items = upcomingDates(today);
  if (!items.length) return;
  track.append(list(items, today));
  band.hidden = false;
}
