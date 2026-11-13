// BOOKINGS: a tap on an address opens the visitor's e-mail app (mailto), but many computers have none set up and
// then nothing seems to happen (Axel, 13.11). So the tap also copies the address and says so right under it, and
// each address gets a second way in: ESCRIBIR EN GMAIL, Gmail's compose window with the address (and, for bookings,
// the subject) already filled in.
import { tr } from './lib/i18n.js';

export function initContactMail() {
  const status = document.querySelector('#contacto .copy-status');
  for (const link of document.querySelectorAll('#contacto .contact-direct-links a[href^="mailto:"]')) {
    const url = new URL(link.href);
    const address = decodeURIComponent(url.pathname);
    const note = document.createElement('p');
    note.className = 'mail-note';
    note.setAttribute('aria-hidden', 'true');
    const gmail = document.createElement('a');
    gmail.className = 'mail-gmail';
    gmail.target = '_blank';
    gmail.rel = 'noopener noreferrer';
    const compose = new URLSearchParams({ view: 'cm', fs: '1', to: address });
    const subject = url.searchParams.get('subject');
    const body = url.searchParams.get('body');
    if (subject) compose.set('su', subject);
    if (body) compose.set('body', body);
    gmail.href = `https://mail.google.com/mail/?${compose}`;
    gmail.textContent = tr('ESCRIBIR EN GMAIL');
    const box = link.closest('.contact-direct-links');
    box.after(note);
    note.after(gmail);
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
