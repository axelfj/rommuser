// /estudio quote form. Checks the fields that can be wrong (artist, e-mail, optional link), then sends the request
// to contact@ through the Apps Script in data-endpoint (integraciones/estudio-pedidos.gs, behind Turnstile).
// Until data-endpoint is set it opens the visitor's e-mail app with the request filled in instead
// (docs/estudio-pedidos.md explains how to turn the endpoint on).
import { isEmail, sendToAppsScript } from './lib/forms.js';
import { pageLanguage, tr } from './lib/i18n.js';
import { createChallenge } from './lib/turnstile.js';

const LINK = /^https?:\/\/\S+$/i;

export function initStudioForm(form = document.querySelector('.studio-form')) {
  if (!form) return;
  const status = form.querySelector('.form-status');
  const button = form.querySelector('button[type="submit"]');
  const endpoint = form.dataset.endpoint;
  const challenge = createChallenge(endpoint ? form.querySelector('#studio-challenge') : null, 'studio_quote');
  window.initStudioChallenge = challenge.render;
  challenge.render();
  let sending = false;

  // Marks a field as wrong (or right) and shows (or hides) its message, the element named in aria-describedby.
  const mark = (input, bad) => {
    input.setAttribute('aria-invalid', String(bad));
    document.getElementById(input.getAttribute('aria-describedby')).hidden = !bad;
    return bad;
  };
  const selectedService = () => form.elements.servicio.selectedOptions[0].textContent;

  const openMail = () => {
    const lines = [...form.querySelectorAll('label')].map((label) => {
      const field = document.getElementById(label.htmlFor);
      const value = field.tagName === 'SELECT' ? field.selectedOptions[0].textContent : field.value.trim();
      return `${label.textContent}: ${value}`;
    });
    const subject = `${tr('Cotización')} · ${selectedService()} · ${form.elements.artista.value.trim()}`;
    location.href = `mailto:${form.dataset.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n') + '\n\n')}`;
    status.textContent = tr('Se abrió tu correo con el pedido listo. Si no se abrió, escribe a contact@rommuser.com.');
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const { artista: artist, correo: email, enlace: link } = form.elements;
    const badArtist = mark(artist, !artist.value.trim());
    const badEmail = mark(email, !isEmail(email.value.trim()));
    const badLink = mark(link, !!link.value.trim() && !LINK.test(link.value.trim()));
    if (badArtist || badEmail || badLink) {
      (badArtist ? artist : badEmail ? email : link).focus();
      status.textContent = '';
      return;
    }
    if (form.elements.website.value) return; // a bot filled the hidden trap field
    if (!endpoint) return openMail();
    if (!challenge.passed) {
      status.textContent = tr('Completa la verificación. Si no aparece, recarga la página.');
      return;
    }
    sending = true;
    button.disabled = true;
    button.textContent = tr('ENVIANDO');
    try {
      const body = new URLSearchParams(new FormData(form));
      body.set('servicio', selectedService());
      body.set('lang', pageLanguage());
      body.set('origen', 'rommuser.com' + location.pathname);
      body.set('cf-turnstile-response', challenge.token);
      await sendToAppsScript(endpoint, body);
      form.reset();
      status.textContent = tr('Listo. Tu pedido me llegó y te respondo a tu correo.');
    } catch {
      status.textContent = tr('No se pudo enviar. Escríbeme a contact@rommuser.com.');
    } finally {
      challenge.reset();
      sending = false;
      button.disabled = false;
      button.textContent = tr('PEDIR COTIZACIÓN');
    }
  });
  form.addEventListener('input', (event) => {
    if (event.target.getAttribute('aria-invalid') === 'true') mark(event.target, false);
  });
}
