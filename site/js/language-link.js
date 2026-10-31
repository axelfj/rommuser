// The ES / EN link remembers the visitor's choice. The browser's own language never picks the page: rommuser.com
// opens in English (/en/) and Spanish is one tap away (/es/).
import { pageLanguage } from './lib/i18n.js';

export function initLanguageLink() {
  document.getElementById('site-language')?.addEventListener('click', () => {
    try {
      localStorage.setItem('rommuser-language', pageLanguage() === 'es' ? 'en' : 'es');
    } catch {}
  });
}
