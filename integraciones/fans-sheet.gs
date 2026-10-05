// Recibe los registros de la lista de fans de rommuser.com y los guarda en la hoja "FANS DE ROMMUSER".
// Se pega en la hoja: Extensiones > Apps Script. Se publica como app web (Ejecutar como: yo, Acceso: cualquier usuario).
// La URL /exec que da Google va en data-endpoint del formulario .fan-form en site/index.html.

const SHEET_NAME = 'Fans';
const EMAIL = /^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  const p = (e && e.parameter) || {};
  const email = String(p.email || '').trim().toLowerCase();
  // "website" es un campo oculto: si viene lleno, es un bot.
  if (p.website || email.length > 254 || !EMAIL.test(email)) return reply_('invalid');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    const last = sheet.getLastRow();
    const known = last > 1 ? sheet.getRange(2, 2, last - 1, 1).getValues().flat() : [];
    if (known.indexOf(email) === -1) {
      sheet.appendRow([new Date(), email, p.lang === 'en' ? 'EN' : 'ES', 'rommuser.com', '']);
    }
  } finally {
    lock.releaseLock();
  }
  return reply_('ok');
}

function reply_(status) {
  return ContentService.createTextOutput(JSON.stringify({ status })).setMimeType(ContentService.MimeType.JSON);
}
