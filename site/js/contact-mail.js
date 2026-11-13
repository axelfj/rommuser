// BOOKINGS: a tap on an address opens the visitor's e-mail app (mailto), but many computers have none set up and
// then nothing seems to happen (Axel, 13.11). So the tap also copies the address and says so right under it.
import { tr } from './lib/i18n.js';

export function initContactMail() {
  const status = document.querySelector('#contacto .copy-status');
  for (const link of document.querySelectorAll('#contacto .contact-direct-links a[href^="mailto:"]')) {
    const address = decodeURIComponent(new URL(link.href).pathname);
    const note = document.createElement('p');
    note.className = 'mail-note';
    note.setAttribute('aria-hidden', 'true');
    link.closest('.contact-direct-links').after(note);
    let timer = 0;
    link.addEventListener('click', () => {
      navigator.clipboard?.writeText(address).then(
        () => {
          const text = `${tr('COPIADO')}: ${address}`;
          note.textContent = text;
          if (status) status.textContent = text;
          clearTimeout(timer);
          timer = setTimeout(() => {
            note.textContent = '';
          }, 5000);
        },
        () => {},
      );
    });
  }
}
