// Recibe los registros del Golden Circle (lista de fans de rommuser.com), los guarda en la hoja
// "FANS DE ROMMUSER" y manda un correo de bienvenida desde la cuenta que publica el script (contact@).
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
      const lang = p.lang === 'en' ? 'en' : 'es';
      sheet.appendRow([new Date(), email, lang.toUpperCase(), 'rommuser.com', '']);
      const row = sheet.getLastRow();
      try {
        sendWelcome_(email, lang);
        sheet.getRange(row, 5).setValue('Bienvenida enviada');
      } catch (err) {
        sheet.getRange(row, 5).setValue('Bienvenida falló: ' + err.message);
      }
    }
  } finally {
    lock.releaseLock();
  }
  return reply_('ok');
}

function reply_(status) {
  return ContentService.createTextOutput(JSON.stringify({ status })).setMimeType(ContentService.MimeType.JSON);
}

const WELCOME = {
  es: {
    subject: 'Ya estás dentro del Golden Circle',
    lines: [
      'Gracias por entrar al Golden Circle de ROMMUSER.',
      'Este es un espacio pequeño y cercano. Aquí llega primero lo que no sale en redes: música antes que nadie, fechas secretas, acceso VIP a noches seleccionadas, merch en preventa y lo que pasa en el estudio.',
      'No vas a recibir correos de más. Solo cuando valga la pena.',
      'Mientras tanto, cierra los ojos. Siente.',
    ],
    leave: 'Si en algún momento quieres salir del círculo, responde a este correo con la palabra SILENCIO.',
  },
  en: {
    subject: 'You are in the Golden Circle',
    lines: [
      'Thank you for joining the ROMMUSER Golden Circle.',
      'This is a small, close space. What never makes it to social media lands here first: music before anyone else, secret dates, VIP access to selected nights, merch pre-sales and what happens in the studio.',
      'No extra emails. Only when it matters.',
      'Until then, close your eyes. Feel.',
    ],
    leave: 'If you ever want to leave the circle, reply to this email with the word SILENCE.',
  },
};

function sendWelcome_(email, lang) {
  const t = WELCOME[lang];
  const signature = 'ROMMUSER\nwww.rommuser.com';
  const body = t.lines.join('\n\n') + '\n\n' + signature + '\n\n' + t.leave;
  const html =
    '<div style="background:#12130F;color:#EAE6E5;padding:40px 28px;font:16px/1.65 Poppins,Arial,sans-serif">' +
    '<p style="margin:0 0 28px;font:700 13px Arial,sans-serif;letter-spacing:.12em">GOLDEN CIRCLE</p>' +
    t.lines.map(l => '<p style="margin:0 0 18px">' + l + '</p>').join('') +
    '<p style="margin:32px 0 0;font:700 20px Arial,sans-serif;letter-spacing:-.02em">ROMMUSER</p>' +
    '<p style="margin:4px 0 32px"><a href="https://www.rommuser.com" style="color:#EAE6E5">www.rommuser.com</a></p>' +
    '<p style="margin:0;font-size:12px;opacity:.7">' + t.leave + '</p></div>';
  MailApp.sendEmail({ to: email, subject: t.subject, body: body, htmlBody: html, name: 'ROMMUSER', replyTo: 'contact@rommuser.com' });
}

// Para probar: cambia el correo, elige testWelcome arriba y dale Ejecutar.
function testWelcome() {
  sendWelcome_('contact@rommuser.com', 'es');
}
