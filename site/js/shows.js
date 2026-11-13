// EN VIVO. The page lists the next show as a card (.next-show with data-show-date) above the history of past
// nights (.show-row). Once a show's date has passed (Costa Rica time) the card turns into a history row, keeping
// its place and type, in date order; a tentative date that passed simply disappears. The next night counts down to
// itself, and the past nights read as one log.
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

// The past nights become a log: every show at once, newest first, older ones fading a little.
function buildLog() {
  const rows = [...document.querySelectorAll('#vivo .show-row')];
  if (!rows.length) return;
  const log = document.createElement('div');
  log.className = 'show-log';
  log.setAttribute('role', 'list');
  rows[0].before(log);
  rows.forEach((row, i) => {
    row.setAttribute('role', 'listitem');
    row.style.setProperty('--fade', String(1 - (0.4 * i) / Math.max(rows.length - 1, 1)));
    log.append(row);
  });
}

// T− 03D 04H 12M 09S to the next night (21:00 in Costa Rica, UTC−6), or EN VIVO HOY on the day itself.
export function countdown(showDate, now, today) {
  if (showDate === today) return tr('EN VIVO HOY');
  const ms = Date.parse(`${showDate}T21:00:00-06:00`) - now;
  if (!(ms > 0)) return '';
  const s = Math.floor(ms / 1000);
  const two = (n) => String(n).padStart(2, '0');
  return `T− ${two(Math.floor(s / 86400))}D ${two(Math.floor(s / 3600) % 24)}H ${two(Math.floor(s / 60) % 60)}M ${two(s % 60)}S`;
}

function startCountdown(today) {
  const next = document.querySelector('#vivo .next-show[data-show-date]');
  if (!next) return;
  const count = document.createElement('p');
  count.className = 'next-count';
  count.setAttribute('aria-hidden', 'true');
  next.append(count);
  const { showDate } = next.dataset;
  if (showDate === today) next.classList.add('is-tonight');
  const tick = () => {
    count.textContent = countdown(showDate, Date.now(), today);
  };
  tick();
  if (showDate !== today) setInterval(tick, 1000);
}

export function initShows() {
  const today = todayInCostaRica();
  for (const show of document.querySelectorAll('[data-show-date]')) {
    if (show.dataset.showDate >= today) continue;
    if (show.dataset.showStatus === 'tentative') show.remove();
    else toHistoryRow(show);
  }
  buildLog();
  startCountdown(today);
}
