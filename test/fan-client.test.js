import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { it, expect, vi } from 'vitest';

function client() {
  const listeners = {};
  const status = { textContent: '' }, button = {};
  const email = { value: 'fan@example.com', dataset: { placeholderEs: 'correo' }, focus: vi.fn() };
  const elements = { lang: {}, ref: {}, origen: {}, website: { value: '' } };
  const form = { elements, dataset: { endpoint: 'https://script.google.com/exec' }, reset: vi.fn(),
    querySelector: s => ({ '#fan-email': email, '.fan-status': status, 'button[type="submit"]': button, '#fan-challenge': { dataset: { sitekey: 'public-key' } } })[s],
    addEventListener: (name, fn) => { listeners[name] = fn; } };
  let callbacks;
  const turnstile = { render: vi.fn((_, options) => { callbacks = options; return 'widget-1'; }), reset: vi.fn() };
  const fetch = vi.fn(async () => ({ type: 'opaque' }));
  const ctx = { window: { turnstile }, document: { querySelector: () => form, documentElement: { lang: 'es' }, referrer: '', addEventListener: vi.fn() },
    location: { search: '' }, localStorage: { getItem: () => null }, URLSearchParams, URL,
    FormData: class { *[Symbol.iterator]() { yield ['email', email.value]; } },
    AbortSignal, fetch, tr: s => s };
  const src = readFileSync(new URL('../site/app.js', import.meta.url), 'utf8');
  runInNewContext(src.slice(src.indexOf('// Keep the existing Apps Script')), ctx);
  ctx.window.initFanChallenge();
  return { callbacks, turnstile, fetch, status, button, submit: () => listeners.submit({ preventDefault() {} }) };
}

it('never posts without a token', async () => {
  const c = client();
  await c.submit();
  expect(c.fetch).not.toHaveBeenCalled();
  expect(c.status.textContent).toContain('verificación');
});
it('submits one token, reports opaque receipt honestly, and resets before retry', async () => {
  const c = client(); c.callbacks.callback('single-use-token');
  await c.submit();
  expect(c.fetch.mock.calls[0][1].body.get('cf-turnstile-response')).toBe('single-use-token');
  expect(c.status.textContent).toContain('No podemos confirmar');
  expect(c.turnstile.reset).toHaveBeenCalledWith('widget-1');
  await c.submit();
  expect(c.fetch).toHaveBeenCalledTimes(1);
});
it('resets verification and unlocks the button after network failure', async () => {
  const c = client(); c.callbacks.callback('token');
  c.fetch.mockRejectedValueOnce(new Error('offline'));
  await c.submit();
  expect(c.button.disabled).toBe(false);
  expect(c.turnstile.reset).toHaveBeenCalledWith('widget-1');
  expect(c.status.textContent).toContain('No pudimos confirmar');
});
it('expiry prevents posting a stale token', async () => {
  const c = client(); c.callbacks.callback('token'); c.callbacks['expired-callback']();
  await c.submit();
  expect(c.fetch).not.toHaveBeenCalled();
});
