// Los scripts de Apps Script (integraciones/*.gs) se pegan a mano en la hoja FANS DE ROMMUSER.
// Aquí se cargan juntos, como en Apps Script, para atrapar errores de sintaxis y probar las partes puras.
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = ['fans-sheet.gs', 'newsletter.gs']
  .map((f) => readFileSync(new URL('../integraciones/' + f, import.meta.url), 'utf8'))
  .join('\n');

function load() {
  const props = new Map();
  const toSigned = (buf) => [...buf].map((b) => (b > 127 ? b - 256 : b));
  const ctx = {
    Utilities: {
      computeHmacSha256Signature: (value, key) => toSigned(createHmac('sha256', key).update(value).digest()),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes.map((b) => (b + 256) % 256)).toString('base64url'),
      getUuid: () => 'test-secret',
    },
    PropertiesService: {
      getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => props.set(k, v) }),
    },
  };
  runInNewContext(source, ctx);
  return ctx;
}

describe('newsletter.gs', () => {
  const gs = load();

  it('llena las variables del borrador, con valor por defecto y escapando el html', () => {
    const vars = { nombre: '', correo: 'a@b.com', link_referido: 'https://rommuser.com/?ref=ABC234#lista', baja: 'x' };
    expect(gs.fill_('Hola {{nombre|amigo}}, {{ correo }}', vars, false)).toBe('Hola amigo, a@b.com');
    expect(gs.fill_('{{nombre}}<b>', { nombre: 'Ana & Leo' }, true)).toBe('Ana &amp; Leo<b>');
    expect(gs.fill_('<a href="http://{{link_referido}}">', vars, true)).toBe(
      '<a href="https://rommuser.com/?ref=ABC234#lista">',
    );
    expect(gs.fill_('<a href="%7B%7Blink_referido%7D%7D">', vars, false)).toBe(
      '<a href="https://rommuser.com/?ref=ABC234#lista">',
    );
    expect(gs.fill_('{{desconocida}}', vars, false)).toBe('{{desconocida}}');
  });

  it('da un código de referido estable de 6 caracteres fáciles de dictar', () => {
    const code = gs.refCode_('fan@correo.com');
    expect(code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    expect(gs.refCode_('fan@correo.com')).toBe(code);
    expect(gs.refCode_('otro@correo.com')).not.toBe(code);
  });

  it('firma el enlace de baja por correo', () => {
    const link = gs.leaveLink_('fan@correo.com');
    expect(link).toContain('?baja=fan%40correo.com&t=');
    expect(gs.leaveToken_('fan@correo.com')).not.toBe(gs.leaveToken_('otro@correo.com'));
  });

  it('saca el primer correo de una fila de promotores', () => {
    expect(gs.emailIn_(['Club X', '@clubx / CLUBX@Mail.com', ''])).toBe('clubx@mail.com');
    expect(gs.emailIn_(['Club X', '@clubx', '8888'])).toBe('');
  });

  it('solo cuenta DESCONECTAR si la persona lo escribió, no si viene citado', () => {
    expect(gs.wantsOut_('desconectar\n\nOn Mon, ROMMUSER wrote:\n> ...DESCONECTAR')).toBe(true);
    expect(gs.wantsOut_('¡Gracias, me encantó!\n\nEl lun, ROMMUSER escribió:\n> responde DESCONECTAR')).toBe(false);
    expect(gs.wantsOut_('Thanks!\n> reply with the word DISCONNECT')).toBe(false);
  });

  it('separa rebotes permanentes de buzón lleno', () => {
    expect(gs.isPermanentBounce_('550 5.1.1 The email account does not exist')).toBe(true);
    expect(gs.isPermanentBounce_('452 4.2.2 The recipient\'s inbox is out of storage space')).toBe(false);
  });
});
