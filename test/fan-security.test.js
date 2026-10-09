import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, vi } from 'vitest';

function backend({ secret = 'server-only', result = { success: true, action: 'fan_signup', hostname: 'rommuser.com' }, status = 200, body, fail = false } = {}) {
  const props = new Map(secret ? [['TURNSTILE_SECRET', secret]] : []);
  const fetch = vi.fn(() => {
    if (fail) throw new Error('network failure');
    return { getResponseCode: () => status, getContentText: () => body ?? JSON.stringify(result) };
  });
  const ctx = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.get(k), setProperties: p => Object.entries(p).forEach(([k,v]) => props.set(k,v)) }) },
    UrlFetchApp: { fetch },
    Utilities: { formatDate: () => '2026-10-08' },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: text => ({ setMimeType: () => JSON.parse(text) }) },
    LockService: { getScriptLock: vi.fn() },
  };
  runInNewContext(readFileSync(new URL('../integraciones/fans-sheet.gs', import.meta.url), 'utf8'), ctx);
  return { ctx, fetch, props };
}

describe('fan signup security boundary', () => {
  it.each(['rommuser.com', 'www.rommuser.com'])('accepts verified action on %s', hostname => {
    const { ctx, fetch } = backend({ result: { success: true, action: 'fan_signup', hostname } });
    expect(ctx.verifyFanToken_('fresh-token')).toBe(true);
    expect(fetch.mock.calls[0][1].payload).toEqual({ secret: 'server-only', response: 'fresh-token' });
  });
  it.each([
    { success: false, 'error-codes': ['timeout-or-duplicate'] },
    { success: 'true', action: 'fan_signup', hostname: 'rommuser.com' },
    { success: true, action: 'login', hostname: 'rommuser.com' },
    { success: true, action: 'fan_signup', hostname: 'rommuser.com.evil.test' },
    { success: true, action: 'fan_signup', hostname: 'localhost' },
    { success: true, action: 'fan_signup', hostname: 'rommuser-web.pages.dev' },
  ])('rejects invalid verification %j', result => {
    expect(backend({ result }).ctx.verifyFanToken_('token')).toBe(false);
  });
  it.each([{ secret: '' }, { fail: true }, { status: 500 }, { body: 'not json' }])('fails closed on %j', options => {
    expect(backend(options).ctx.verifyFanToken_('token')).toBe(false);
  });
  it.each([undefined, '', 'x'.repeat(2049), {}])('rejects missing or malformed tokens without fetching', token => {
    const { ctx, fetch } = backend();
    expect(ctx.verifyFanToken_(token)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects direct unverified POST before accessing the sheet or lock', () => {
    const { ctx } = backend();
    expect(ctx.doPost({ postData: { length: 40 }, parameter: { email: 'fan@example.com' } })).toEqual({ status: 'forbidden' });
    expect(ctx.LockService.getScriptLock).not.toHaveBeenCalled();
  });
  it('rejects oversized bodies before external calls', () => {
    const { ctx, fetch } = backend();
    expect(ctx.doPost({ postData: { length: 8193 }, parameter: {} })).toEqual({ status: 'invalid' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('caps new rows independently of the welcome email cap, and resets next day', () => {
    const { ctx, props } = backend();
    for (let i = 0; i < 300; i++) expect(ctx.reserveFanSignup_()).toBe(true);
    expect(ctx.reserveFanSignup_()).toBe(false);
    props.set('signupDay', '2026-10-07');
    expect(ctx.reserveFanSignup_()).toBe(true);
    expect(props.get('signupCount')).toBe('1');
  });
});
