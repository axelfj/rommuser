// Golden Circle sign-up. Sends the e-mail to the Apps Script in data-endpoint (integraciones/fans-sheet.gs) behind a
// Turnstile check, with the page language and where the fan came from: ?ref=CODE (a promoter or DJ code) and
// ?utm_source or the referring site. Both are kept in the browser, so a fan who arrives via a link and signs up
// later still counts for that link.
import { isEmail, sendToAppsScript } from './lib/forms.js';
import { pageLanguage, tr } from './lib/i18n.js';
import { createChallenge } from './lib/turnstile.js';

// The first valid value seen in this browser wins; storage may be blocked, then only this visit's value counts.
function remember(key, value, valid) {
  try {
    if (value && valid.test(value) && !localStorage.getItem(key)) localStorage.setItem(key, value);
    const saved = localStorage.getItem(key) || '';
    return valid.test(saved) ? saved : '';
  } catch {
    return value && valid.test(value) ? value : '';
  }
}

function referral() {
  const query = new URLSearchParams(location.search);
  let from = '';
  try {
    const host = document.referrer && new URL(document.referrer).hostname.replace(/^www\./, '');
    if (host && !/(^|\.)rommuser\.com$/.test(host)) from = host;
  } catch {}
  return {
    ref: remember('rommuser-ref', (query.get('ref') || '').toUpperCase(), /^[A-Z0-9]{4,10}$/),
    origen: remember('rommuser-origen', (query.get('utm_source') || from).toLowerCase(), /^[\w.\-]{1,40}$/),
  };
}

export function initFanForm(form = document.querySelector('.fan-form')) {
  if (!form) return;
  const email = form.querySelector('#fan-email');
  const status = form.querySelector('.fan-status');
  const button = form.querySelector('button[type="submit"]');
  const challenge = createChallenge(form.querySelector('#fan-challenge'), 'fan_signup');
  window.initFanChallenge = challenge.render;
  challenge.render();
  const source = referral();
  // Hidden fields the reset() below empties: fill them again.
  const fillHidden = () => {
    email.placeholder = email.dataset[pageLanguage() === 'en' ? 'placeholderEn' : 'placeholderEs'];
    form.elements.lang.value = document.documentElement.lang;
    form.elements.ref.value = source.ref;
    form.elements.origen.value = source.origen;
  };
  fillHidden();
  let sending = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const address = email.value.trim();
    if (!isEmail(address)) {
      status.textContent = tr('Escribe un correo válido.');
      email.focus();
      return;
    }
    if (form.elements.website.value) return; // a bot filled the hidden trap field
    if (!challenge.passed) {
      status.textContent = tr('Completa la verificación. Si no aparece, recarga la página.');
      return;
    }
    if (!form.dataset.endpoint) {
      status.textContent = tr('No se pudo enviar. Inténtalo otra vez.');
      return;
    }
    sending = true;
    button.disabled = true;
    button.textContent = tr('ENVIANDO');
    try {
      const body = new URLSearchParams(new FormData(form));
      body.set('email', address);
      body.set('cf-turnstile-response', challenge.token);
      await sendToAppsScript(form.dataset.endpoint, body);
      form.reset();
      fillHidden();
      status.textContent = tr('Estás dentro. La próxima señal llega a tu correo.');
    } catch {
      status.textContent = tr('No pudimos confirmar el envío. Inténtalo otra vez.');
    } finally {
      challenge.reset();
      sending = false;
      button.disabled = false;
      button.textContent = tr('ENTRAR');
    }
  });
}
