// Recibe los registros del Golden Circle (lista de fans de rommuser.com), los guarda en la hoja
// "FANS DE ROMMUSER" y manda un correo de bienvenida desde la cuenta que publica el script (contact@).
// Se pega en la hoja: Extensiones > Apps Script. Se publica como app web (Ejecutar como: yo, Acceso: cualquier usuario).
// La URL /exec que da Google va en data-endpoint del formulario .fan-form en site/index.html.
// Usa funciones de newsletter.gs (segmentos, códigos de referido, bajas): los dos archivos van en el mismo proyecto.

const SHEET_NAME = 'Fans';
const EMAIL = /^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/;
// Tope de bienvenidas: todo correo válido se guarda siempre (nadie se queda fuera si nos volvemos
// virales), pero solo DAILY_CAP bienvenidas salen por día. Las demás quedan "Bienvenida pendiente"
// y salen los días siguientes con sendPending. Así un ataque no quema el cupo ni la reputación de contact@.
// Al llegar al tope, contact@ recibe un aviso una vez ese día.
const DAILY_CAP = 100;
const ALERT_TO = 'contact@rommuser.com';

function doPost(e) {
  const p = (e && e.parameter) || {};
  const email = String(p.email || '').trim().toLowerCase();
  // "website" es un campo oculto: si viene lleno, es un bot.
  if (p.website || email.length > 254 || !EMAIL.test(email)) return reply_('invalid');

  // ref: código de quien compartió su enlace. origen: de dónde llegó (utm_source o el sitio anterior).
  const ref = /^[A-Z0-9]{4,10}$/.test(String(p.ref || '').toUpperCase()) ? String(p.ref).toUpperCase() : '';
  const origin = /^[\w.\-]{1,40}$/.test(String(p.origen || '')) ? String(p.origen).toLowerCase() : '';

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
    const last = sheet.getLastRow();
    const known = last > 1 ? sheet.getRange(2, 2, last - 1, 1).getValues().flat() : [];
    const at = known.indexOf(email);
    if (at === -1) {
      const lang = p.lang === 'en' ? 'en' : 'es';
      const by = creditReferral_(sheet, ref, email);
      removeBaja_(email); // si alguna vez se dio de baja, entrar de nuevo es pedir volver
      sheet.appendRow([new Date(), email, lang.toUpperCase(), origin ? 'rommuser.com · ' + origin : 'rommuser.com', '',
        'Fans', refCode_(email), by, 0, 'Activo']);
      const row = sheet.getLastRow();
      welcomeRow_(sheet, row, email, lang);
    } else if (sheet.getRange(at + 2, COL.estado).getValue() === 'Baja') {
      // Se había ido y volvió a entrar: vuelve a estar activo.
      sheet.getRange(at + 2, COL.estado).setValue('Activo');
      removeBaja_(email);
    }
  } finally {
    lock.releaseLock();
  }
  return reply_('ok');
}

const PENDING = 'Bienvenida pendiente';

function welcomeRow_(sheet, row, email, lang) {
  if (!countToday_()) {
    sheet.getRange(row, 5).setValue(PENDING);
    return false;
  }
  try {
    sendWelcome_(email, lang);
    sheet.getRange(row, 5).setValue('Bienvenida enviada');
  } catch (err) {
    sheet.getRange(row, 5).setValue('Bienvenida falló: ' + err.message);
  }
  return true;
}

// Manda las bienvenidas pendientes hasta llenar el cupo de hoy. Programarla una vez:
// Activadores (reloj) > Agregar activador > sendPending, según tiempo, cada día.
function sendPending() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  const last = sheet.getLastRow();
  if (last < 2) return;
  const rows = sheet.getRange(2, 2, last - 1, 4).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][3] !== PENDING) continue;
    const lang = rows[i][1] === 'EN' ? 'en' : 'es';
    if (!welcomeRow_(sheet, i + 2, rows[i][0], lang)) return;
  }
}

// Suma una bienvenida al contador de hoy (hora de Costa Rica). Devuelve false si ya se llegó al tope.
function countToday_() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), 'America/Costa_Rica', 'yyyy-MM-dd');
  const count = props.getProperty('day') === today ? Number(props.getProperty('count') || 0) : 0;
  if (count >= DAILY_CAP) {
    if (props.getProperty('alerted') !== today) {
      props.setProperty('alerted', today);
      MailApp.sendEmail(ALERT_TO, 'Golden Circle: tope diario alcanzado',
        'Hoy entraron más de ' + DAILY_CAP + ' personas a la lista de rommuser.com. Todas quedaron guardadas; las bienvenidas que faltan salen los próximos días (Bienvenida pendiente). Si no hay una razón (un post viral, una campaña), puede ser un ataque: revisa la hoja FANS DE ROMMUSER.');
    }
    return false;
  }
  props.setProperties({ day: today, count: String(count + 1) });
  return true;
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
    share: 'Este es tu enlace al círculo. Quien entre con él queda contado a tu nombre, y a quienes traigan a más gente les llega algo que no está en ningún otro lado:',
    leave: 'Si en algún momento quieres salir del círculo, responde a este correo con la palabra DESCONECTAR o usa este enlace:',
  },
  en: {
    subject: 'You are in the Golden Circle',
    lines: [
      'Thank you for joining the ROMMUSER Golden Circle.',
      'This is a small, close space. What never makes it to social media lands here first: music before anyone else, secret dates, VIP access to selected nights, merch pre-sales and what happens in the studio.',
      'No extra emails. Only when it matters.',
      'Until then, close your eyes. Feel.',
    ],
    share: 'This is your link to the circle. Everyone who joins through it counts under your name, and those who bring more people get something that is nowhere else:',
    leave: 'If you ever want to leave the circle, reply to this email with the word DISCONNECT or use this link:',
  },
};

function sendWelcome_(email, lang) {
  const t = WELCOME[lang];
  const share = referralLink_(refCode_(email));
  const leave = leaveLink_(email);
  const signature = 'ROMMUSER\nwww.rommuser.com';
  const body = t.lines.join('\n\n') + '\n\n' + t.share + '\n' + share + '\n\n' + signature + '\n\n' + t.leave + '\n' + leave;
  const html =
    '<div style="background:#12130F;color:#EAE6E5;padding:40px 28px;font:16px/1.65 Poppins,Arial,sans-serif">' +
    '<p style="margin:0 0 28px;font:700 13px Arial,sans-serif;letter-spacing:.12em">GOLDEN CIRCLE</p>' +
    t.lines.map(l => '<p style="margin:0 0 18px">' + l + '</p>').join('') +
    '<p style="margin:28px 0 6px">' + t.share + '</p>' +
    '<p style="margin:0 0 18px"><a href="' + escape_(share) + '" style="color:#EAE6E5">' + escape_(share) + '</a></p>' +
    '<p style="margin:32px 0 0;font:700 20px Arial,sans-serif;letter-spacing:-.02em">ROMMUSER</p>' +
    '<p style="margin:4px 0 32px"><a href="https://www.rommuser.com" style="color:#EAE6E5">www.rommuser.com</a></p>' +
    '<p style="margin:0;font-size:12px;opacity:.7">' + t.leave + ' <a href="' + escape_(leave) + '" style="color:#EAE6E5">' +
    (lang === 'en' ? 'leave' : 'salir') + '</a></p></div>';
  MailApp.sendEmail({ to: email, subject: t.subject, body: body, htmlBody: html, name: 'ROMMUSER', replyTo: 'contact@rommuser.com' });
}

// Para probar: cambia el correo, elige testWelcome arriba y dale Ejecutar.
function testWelcome() {
  sendWelcome_('contact@rommuser.com', 'es');
}
