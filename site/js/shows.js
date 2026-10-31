// EN VIVO. The page lists the next show as a card (.next-show with data-show-date) above the history of past
// nights (.show-row). Once a show's date has passed (Costa Rica time) the card turns into a history row, keeping
// its place and type, in date order; a tentative date that passed simply disappears. Then the history folds into
// one dropdown per year, the latest open, and older nights fade a little.
import { todayInCostaRica } from './lib/dates.js';
import { tr } from './lib/i18n.js';

// 2026-11-13 → 13.11.26
const historyDate = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(2, 4)}`;

function toHistoryRow(show) {
  const { showDate, showPlace, showType } = show.dataset;
  const venue = show.querySelector('h3')?.textContent || '';
  show.classList.remove('next-show');
  show.classList.add('show-row');
  const date = document.createElement('time');
  date.dateTime = showDate;
  date.textContent = historyDate(showDate);
  const info = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = venue;
  info.append(title);
  if (showPlace) {
    const place = document.createElement('p');
    place.textContent = showPlace;
    info.append(place);
  }
  const type = document.createElement('span');
  if (showType && showType !== 'CLUB') type.textContent = showType;
  else {
    type.dataset.liveType = 'true';
    type.textContent = tr('EN VIVO');
  }
  show.replaceChildren(date, info, type);
  // Place it before the first older night, or last.
  const rows = [...document.querySelectorAll('.show-row:not([data-show-date])')];
  const older = rows.find((row) => row.querySelector(':scope > time')?.dateTime < showDate);
  if (older) older.before(show);
  else if (rows.length) rows[rows.length - 1].after(show);
  else document.querySelector('.show-history-label').after(show);
}

function foldByYear() {
  const rows = [...document.querySelectorAll('#vivo .show-row')];
  const years = new Map();
  rows.forEach((row, i) => {
    row.style.setProperty('--fade', String(1 - (0.4 * i) / Math.max(rows.length - 1, 1)));
    const year = row.querySelector('time')?.dateTime.slice(0, 4) || '';
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(row);
  });
  [...years].forEach(([year, list], i) => {
    const box = document.createElement('details');
    box.className = 'show-year';
    box.open = i === 0;
    const summary = document.createElement('summary');
    const label = document.createElement('span');
    label.textContent = year;
    const count = document.createElement('span');
    count.className = 'show-count';
    count.textContent = `${list.length} ${tr(list.length === 1 ? 'SHOW' : 'SHOWS')}`;
    summary.append(label, count);
    list[0].before(box);
    box.append(summary, ...list);
  });
}

export function initShows() {
  const today = todayInCostaRica();
  for (const show of document.querySelectorAll('[data-show-date]')) {
    if (show.dataset.showDate >= today) continue;
    if (show.dataset.showStatus === 'tentative') show.remove();
    else toHistoryRow(show);
  }
  foldByYear();
}
