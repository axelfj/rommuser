// "© 2026 ROMMUSER / COSTA RICA" in the footer, with the year in Costa Rica. It rechecks every minute and when the
// tab comes back, so a page left open over New Year's Eve still turns over.
import { yearInCostaRica } from './lib/dates.js';

export function initFooterYear() {
  const footer = document.getElementById('footer-year');
  if (!footer) return;
  const refresh = () => {
    footer.textContent = `© ${yearInCostaRica()} ROMMUSER / COSTA RICA`;
  };
  refresh();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
  setInterval(refresh, 60000);
}
