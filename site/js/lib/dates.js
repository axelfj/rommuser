// Dates on the site are written YYYY-MM-DD (data-release, data-show-date, <time datetime>) and read in Costa Rica
// time, so a release or a show changes state at midnight in Costa Rica wherever the visitor is.
const ZONE = 'America/Costa_Rica';

export const todayInCostaRica = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: ZONE }).format(now);

export const yearInCostaRica = (now = new Date()) => new Intl.DateTimeFormat('en', { timeZone: ZONE, year: 'numeric' }).format(now);

// 2026-10-30 → 30.10.2026
export const shortDate = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

export const MONTHS = {
  es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
};
