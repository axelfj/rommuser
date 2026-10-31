import { beforeAll, it, expect, vi } from 'vitest';

let initFanForm;
beforeAll(async () => {
  ({ initFanForm } = await import('../site/js/fan-form.js'));
});

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
  vi.stubGlobal('window', { turnstile });
  vi.stubGlobal('document', { documentElement: { lang: 'es' }, referrer: '' });
  vi.stubGlobal('location', { search: '' });
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  vi.stubGlobal('FormData', class { *[Symbol.iterator]() { yield ['email', email.value]; } });
  vi.stubGlobal('fetch', fetch);
  initFanForm(form);
  return { callbacks, turnstile, fetch, status, button, submit: () => listeners.submit({ preventDefault() {} }) };
}

it('never posts without a token', async () => {
  const c = client();
  await c.submit();
  expect(c.fetch).not.toHaveBeenCalled();
  expect(c.status.textContent).toContain('verificación');
});
it('submits one token, confirms calmly, and resets before retry', async () => {
  const c = client(); c.callbacks.callback('single-use-token');
  await c.submit();
  expect(c.fetch.mock.calls[0][1].body.get('cf-turnstile-response')).toBe('single-use-token');
  expect(c.status.textContent).toContain('Estás dentro');
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
