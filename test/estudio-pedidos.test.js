// integraciones/estudio-pedidos.gs se pega a mano en Apps Script. Aquí se carga con dobles de los servicios
// de Google para probar que solo un pedido válido y verificado con Turnstile llega a contact@.
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('../integraciones/estudio-pedidos.gs', import.meta.url), 'utf8');

function load({ secret = 'secreto', verdict = { success: true, action: 'studio_quote', hostname: 'rommuser.com' } } = {}) {
  const props = new Map(secret ? [['TURNSTILE_SECRET', secret]] : []);
  const sent = [];
  const ctx = {
    sent,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v), setProperties: (o) => Object.entries(o).forEach(([k, v]) => props.set(k, v)) }) },
    UrlFetchApp: { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify(verdict) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    MailApp: { sendEmail: (m, subject) => sent.push(typeof m === 'string' ? { to: m, subject } : m) },
    Utilities: { formatDate: () => '2026-10-27' },
    ContentService: { createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t).status }), MimeType: { JSON: 'json' } },
  };
  runInNewContext(source, ctx);
  return ctx;
}

const post = (params) => ({ postData: { length: 100 }, parameter: { 'cf-turnstile-response': 'token', ...params } });
const valid = { servicio: 'Mezcla', artista: 'Artista', correo: 'Artista@Correo.com', stems: '12', origen: 'rommuser.com/estudio/' };

describe('estudio-pedidos.gs', () => {
  it('manda el pedido a contact@ con Responder al correo del artista', () => {
    const gs = load();
    expect(gs.doPost(post(valid))).toBe('ok');
    expect(gs.sent).toHaveLength(1);
    expect(gs.sent[0]).toMatchObject({ to: 'contact@rommuser.com', replyTo: 'artista@correo.com', subject: 'Cotización · Mezcla · Artista' });
    expect(gs.sent[0].body).toContain('Stems: 12');
  });

  it('acepta el campo nombre que manda studio.rommuser.com', () => {
    const gs = load({ verdict: { success: true, action: 'studio_quote', hostname: 'studio.rommuser.com' } });
    const { artista, ...rest } = valid;
    expect(gs.doPost(post({ ...rest, nombre: 'Desde Studio' }))).toBe('ok');
    expect(gs.sent[0].subject).toContain('Desde Studio');
  });

  it.each([
    ['sin secreto configurado', { secret: '' }, valid],
    ['token de otra acción', { verdict: { success: true, action: 'fan_signup', hostname: 'rommuser.com' } }, valid],
    ['token de otro dominio', { verdict: { success: true, action: 'studio_quote', hostname: 'evil.example' } }, valid],
    ['correo inválido', {}, { ...valid, correo: 'no-es-correo' }],
    ['sin nombre', {}, { ...valid, artista: '' }],
    ['campo trampa lleno', {}, { ...valid, website: 'bot' }],
  ])('no manda nada: %s', (_, options, params) => {
    const gs = load(options);
    gs.doPost(post(params));
    expect(gs.sent).toHaveLength(0);
  });

  it('respeta el tope diario y avisa una sola vez', () => {
    const gs = load();
    for (let i = 0; i < 45; i++) gs.doPost(post(valid));
    expect(gs.sent.filter((m) => m.subject?.startsWith('Cotización'))).toHaveLength(40);
    expect(gs.sent.filter((m) => m.subject.startsWith('Estudio: tope diario'))).toHaveLength(1);
  });
});
