// Cloudflare Turnstile, the bot check in front of every form. It stays invisible unless Cloudflare needs the
// visitor to click. Each token works once: after a send (or a failure) the check is reset for the next one.
// The page loads Turnstile with ?onload=<name>; that global calls render() once the API is ready, and render() is
// also called right away in case Turnstile was already there.
import { pageLanguage } from './i18n.js';

export function createChallenge(target, action) {
  let widget;
  let token = '';
  return {
    render() {
      // Without a site key (deployment not configured) there is no check, so the form never sends: fail closed.
      if (widget !== undefined || !target?.dataset.sitekey || !window.turnstile) return;
      widget = window.turnstile.render(target, {
        sitekey: target.dataset.sitekey,
        action,
        appearance: 'interaction-only',
        language: pageLanguage(),
        callback: (value) => { token = value; },
        'expired-callback': () => { token = ''; },
        'error-callback': () => { token = ''; },
      });
    },
    get passed() {
      return widget !== undefined && token !== '';
    },
    get token() {
      return token;
    },
    reset() {
      token = '';
      if (widget !== undefined) window.turnstile.reset(widget);
    },
  };
}
