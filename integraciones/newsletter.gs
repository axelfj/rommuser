// Newsletter del Golden Circle: segmentos, mail merge desde un borrador de Gmail, bajas y referidos.
// Va en el MISMO proyecto de Apps Script que fans-sheet.gs (la hoja FANS DE ROMMUSER):
// Extensiones > Apps Script > + > Script > "newsletter", pegar este archivo y guardar.
// La guía paso a paso está en docs/newsletter.md.
//
// Nada sale solo: una campaña se envía únicamente cuando Axel escribe APROBADA en su fila.

// La misma URL /exec que está en data-endpoint del formulario de rommuser.com (ya es pública).
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyQusv9LnmcI-xBRlvbR9fwJRaRFYtdi616fVUITa_67TviJdgXQXLKTVL85YaJXq8/exec';
const SITE_URL = 'https://rommuser.com/';

// Columnas de la pestaña Fans (1 = A). Las 5 primeras ya existían.
const COL = { fecha: 1, correo: 2, idioma: 3, origen: 4, notas: 5, segmento: 6, codigo: 7, referidoPor: 8, referidos: 9, estado: 10 };
const FANS_HEADERS = ['Fecha', 'Correo', 'Idioma', 'Origen', 'Notas', 'Segmento', 'Código', 'Referido por', 'Referidos', 'Estado'];

// Promotores y clientes de estudio NO se copian: se leen en su hoja al momento de enviar.
// En cada fila se toma el primer correo que aparezca en cualquier columna; filas sin correo se saltan.
// soloSi: columna que tiene que estar llena para que la fila cuente (vacío = todas).
const SOURCES = [
  {
    segmento: 'Estudio', // clientes de estudio = leads de mixdown que ya pagaron
    id: '179I8NN8vkAPW4HWEw-6sagXsWnWuEINKYzEN7as_s2U', // ROMMUSER | Ventas mixdown · Seguimiento diario
    tabs: ['Leads'],
    nombre: 'Saludo (nombre)',
    soloSi: 'Fecha 1er pago',
    idioma: 'ES',
  },
  {
    segmento: 'Promotores',
    id: '1l_mZ-NXgTw6byKU3XmZrhLAAhF0U83503kagrCqcG3M', // ROMMUSER | Bookings — Lead Tracker (todas las pestañas de país)
    tabs: null,
    nombre: 'NOMBRE/ BOLICHE/ FIESTA/DJ',
    soloSi: '',
    idioma: 'ES',
  },
];

// Ritmo de envío: pocos por hora para cuidar la reputación de contact@ (rebotes del 28/09).
const NL_PER_RUN = 40;
const NL_DAILY_CAP = 250;
// Cuando alguien llega a estos referidos, contact@ recibe un aviso. El premio lo decide Axel.
const REFERRAL_MILESTONES = [3, 10, 25];

const CAMPAIGNS = 'Campañas';
const CAMPAIGN_HEADERS = ['ID', 'Asunto del borrador', 'Segmentos', 'Idioma', 'Programada para', 'Estado', 'Enviados', 'Notas'];
const CAMPAIGN_STATES = ['BORRADOR', 'APROBADA', 'ENVIANDO', 'ENVIADA', 'PAUSADA', 'ERROR'];
const SENDS = 'Envíos';
const BAJAS = 'Bajas';

// ---------- Menú en la hoja ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Golden Circle')
    .addItem('Configurar (una sola vez)', 'setupNewsletter')
    .addSeparator()
    .addItem('Contar destinatarios (fila seleccionada)', 'countSelected')
    .addItem('Enviarme una prueba (fila seleccionada)', 'testSelected')
    .addItem('Enviar un lote ahora', 'sendQueue')
    .addSeparator()
    .addItem('Revisar bajas y rebotes ahora', 'processInbox')
    .addToUi();
}

// Crea las columnas y pestañas nuevas, da código de referido a quien ya estaba y programa los activadores.
// Se puede correr de nuevo sin romper nada.
function setupNewsletter() {
  const ss = SpreadsheetApp.getActive();
  const fans = ss.getSheetByName(SHEET_NAME);
  fans.getRange(1, 1, 1, FANS_HEADERS.length).setValues([FANS_HEADERS]).setFontWeight('bold');
  const last = fans.getLastRow();
  if (last > 1) {
    const range = fans.getRange(2, 1, last - 1, FANS_HEADERS.length);
    const rows = range.getValues().map(r => {
      const email = String(r[COL.correo - 1]).trim().toLowerCase();
      if (!email) return r;
      if (!r[COL.segmento - 1]) r[COL.segmento - 1] = 'Fans';
      if (!r[COL.codigo - 1]) r[COL.codigo - 1] = refCode_(email);
      if (r[COL.referidos - 1] === '') r[COL.referidos - 1] = 0;
      if (!r[COL.estado - 1]) r[COL.estado - 1] = 'Activo';
      return r;
    });
    range.setValues(rows);
  }

  const campaigns = sheet_(CAMPAIGNS, CAMPAIGN_HEADERS);
  campaigns.getRange('F2:F').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(CAMPAIGN_STATES, true).build());
  sheet_(SENDS, ['Fecha', 'Campaña', 'Correo', 'Segmento', 'Resultado']);
  sheet_(BAJAS, ['Fecha', 'Correo', 'Motivo']);

  const have = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  if (have.indexOf('sendPending') === -1) ScriptApp.newTrigger('sendPending').timeBased().everyDays(1).atHour(9).create();
  if (have.indexOf('sendQueue') === -1) ScriptApp.newTrigger('sendQueue').timeBased().everyHours(1).create();
  if (have.indexOf('processInbox') === -1) ScriptApp.newTrigger('processInbox').timeBased().everyHours(1).create();
  secret_();
}

function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
  return sh;
}

// ---------- Campañas ----------

function selectedCampaign_() {
  const sh = SpreadsheetApp.getActiveSheet();
  const row = sh.getActiveRange().getRow();
  if (sh.getName() !== CAMPAIGNS || row < 2) throw new Error('Selecciona una fila de la pestaña ' + CAMPAIGNS + '.');
  return campaignAt_(sh, row);
}

function campaignAt_(sh, row) {
  const v = sh.getRange(row, 1, 1, CAMPAIGN_HEADERS.length).getValues()[0];
  return { sheet: sh, row: row, id: String(v[0]).trim(), subject: String(v[1]).trim(), segments: String(v[2]),
    lang: String(v[3]).trim().toUpperCase() || 'TODOS', when: v[4], state: String(v[5]).trim().toUpperCase() };
}

function countSelected() {
  const c = selectedCampaign_();
  const list = pendingFor_(c);
  const bySeg = {};
  list.forEach(r => { bySeg[r.segmento] = (bySeg[r.segmento] || 0) + 1; });
  const detail = Object.keys(bySeg).map(k => k + ': ' + bySeg[k]).join(', ') || 'nadie';
  c.sheet.getRange(c.row, 8).setValue('Faltan ' + list.length + ' (' + detail + ') · ' + stamp_());
}

function testSelected() {
  const c = selectedCampaign_();
  const tpl = template_(c.subject);
  const me = { email: ALERT_TO, nombre: 'Axel', idioma: c.lang === 'EN' ? 'EN' : 'ES', segmento: 'Prueba', codigo: refCode_(ALERT_TO) };
  sendOne_(tpl, me, c, '[PRUEBA] ');
  c.sheet.getRange(c.row, 8).setValue('Prueba enviada a ' + ALERT_TO + ' · ' + stamp_());
}

// Corre cada hora. Toma la primera campaña APROBADA (o ENVIANDO) cuya fecha ya llegó y manda un lote.
function sendQueue() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  try {
    const sh = SpreadsheetApp.getActive().getSheetByName(CAMPAIGNS);
    if (!sh || sh.getLastRow() < 2) return;
    for (let row = 2; row <= sh.getLastRow(); row++) {
      const c = campaignAt_(sh, row);
      if (c.state !== 'APROBADA' && c.state !== 'ENVIANDO') continue;
      if (c.when instanceof Date && c.when > new Date()) continue;
      if (!c.id || !c.subject) { mark_(c, 'ERROR', 'Falta ID o asunto del borrador'); return; }
      let tpl;
      try { tpl = template_(c.subject); } catch (err) { mark_(c, 'ERROR', err.message); return; }
      const todo = pendingFor_(c);
      const room = Math.min(NL_PER_RUN, nlRoomToday_());
      const batch = todo.slice(0, room);
      batch.forEach(r => {
        let result = 'Enviado';
        try { sendOne_(tpl, r, c, ''); } catch (err) { result = 'Error: ' + err.message; }
        SpreadsheetApp.getActive().getSheetByName(SENDS).appendRow([new Date(), c.id, r.email, r.segmento, result]);
      });
      nlUse_(batch.length);
      const sent = sentFor_(c.id).size;
      sh.getRange(row, 7).setValue(sent);
      if (todo.length === batch.length) {
        mark_(c, 'ENVIADA', 'Terminada · ' + stamp_());
        MailApp.sendEmail(ALERT_TO, 'Golden Circle: campaña ' + c.id + ' enviada', 'Salieron ' + sent + ' correos. El detalle está en la pestaña ' + SENDS + '.');
      } else {
        mark_(c, 'ENVIANDO', 'Faltan ' + (todo.length - batch.length) + ' · ' + stamp_());
      }
      return; // una campaña por corrida
    }
  } finally {
    lock.releaseLock();
  }
}

function mark_(c, state, note) {
  c.sheet.getRange(c.row, 6).setValue(state);
  c.sheet.getRange(c.row, 8).setValue(note);
}

function stamp_() {
  return Utilities.formatDate(new Date(), 'America/Costa_Rica', 'dd/MM HH:mm');
}

function nlRoomToday_() {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), 'America/Costa_Rica', 'yyyy-MM-dd');
  const used = props.getProperty('nlDay') === today ? Number(props.getProperty('nlCount') || 0) : 0;
  return Math.max(0, NL_DAILY_CAP - used);
}

function nlUse_(n) {
  const props = PropertiesService.getScriptProperties();
  const today = Utilities.formatDate(new Date(), 'America/Costa_Rica', 'yyyy-MM-dd');
  const used = props.getProperty('nlDay') === today ? Number(props.getProperty('nlCount') || 0) : 0;
  props.setProperties({ nlDay: today, nlCount: String(used + n) });
}

// ---------- Destinatarios ----------

function pendingFor_(c) {
  const wanted = c.segments.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const out = bajas_();
  const done = sentFor_(c.id);
  return recipients_().filter(r =>
    wanted.indexOf(r.segmento.toLowerCase()) !== -1 &&
    (c.lang === 'TODOS' || r.idioma === c.lang) &&
    !out.has(r.email) && !done.has(r.email));
}

function recipients_() {
  const seen = new Set();
  const list = [];
  const add = r => { if (r.email && !seen.has(r.email)) { seen.add(r.email); list.push(r); } };

  const fans = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (fans.getLastRow() > 1) {
    fans.getRange(2, 1, fans.getLastRow() - 1, FANS_HEADERS.length).getValues().forEach(r => {
      if (String(r[COL.estado - 1]) === 'Baja') return;
      const email = String(r[COL.correo - 1]).trim().toLowerCase();
      add({ email: email, nombre: '', idioma: r[COL.idioma - 1] === 'EN' ? 'EN' : 'ES',
        segmento: String(r[COL.segmento - 1] || 'Fans'), codigo: String(r[COL.codigo - 1] || '') });
    });
  }

  SOURCES.forEach(src => {
    const book = SpreadsheetApp.openById(src.id);
    const tabs = src.tabs ? src.tabs.map(t => book.getSheetByName(t)).filter(Boolean) : book.getSheets();
    tabs.forEach(tab => {
      const values = tab.getDataRange().getDisplayValues();
      if (values.length < 2) return;
      const head = values[0].map(h => String(h).trim());
      const nameAt = head.indexOf(src.nombre);
      const onlyAt = src.soloSi ? head.indexOf(src.soloSi) : -1;
      if (src.soloSi && onlyAt === -1) return;
      values.slice(1).forEach(row => {
        if (onlyAt !== -1 && !String(row[onlyAt]).trim()) return;
        const email = emailIn_(row);
        if (!email) return;
        add({ email: email, nombre: nameAt === -1 ? '' : String(row[nameAt]).trim(), idioma: src.idioma,
          segmento: src.segmento, codigo: '' });
      });
    });
  });
  return list;
}

// Primer correo que aparezca en cualquier celda de la fila.
function emailIn_(row) {
  for (let i = 0; i < row.length; i++) {
    const m = String(row[i]).match(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/);
    if (m) return m[0].toLowerCase();
  }
  return '';
}

function bajas_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(BAJAS);
  if (!sh || sh.getLastRow() < 2) return new Set();
  return new Set(sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().flat().map(e => String(e).trim().toLowerCase()));
}

function sentFor_(id) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SENDS);
  const done = new Set();
  if (!sh || sh.getLastRow() < 2) return done;
  sh.getRange(2, 2, sh.getLastRow() - 1, 2).getValues().forEach(r => { if (String(r[0]) === id) done.add(String(r[1]).toLowerCase()); });
  return done;
}

// ---------- Plantilla (borrador de Gmail) y envío ----------

// El cuerpo sale de un borrador de Gmail de contact@ con ese asunto exacto.
// Variables: {{nombre}}, {{nombre|valor si no hay}}, {{correo}}, {{link_referido}}, {{codigo}}, {{baja}}.
function template_(subject) {
  const draft = GmailApp.getDrafts().filter(d => d.getMessage().getSubject().trim() === subject)[0];
  if (!draft) throw new Error('No hay un borrador en Gmail con el asunto "' + subject + '"');
  const msg = draft.getMessage();
  return { subject: subject, html: msg.getBody(), text: msg.getPlainBody(),
    attachments: msg.getAttachments({ includeInlineImages: false }) };
}

function sendOne_(tpl, r, c, prefix) {
  const vars = varsFor_(r);
  const en = c.lang === 'EN' || (c.lang === 'TODOS' && r.idioma === 'EN');
  let html = fill_(tpl.html, vars, true);
  let text = fill_(tpl.text, vars, false);
  if (!/\{\{\s*baja/.test(tpl.html)) {
    const leave = en ? 'Leave the Golden Circle' : 'Salir del Golden Circle';
    html += '<p style="font-size:12px;color:#888;margin-top:32px"><a href="' + escape_(vars.baja) + '" style="color:#888">' + leave + '</a></p>';
    text += '\n\n' + leave + ': ' + vars.baja;
  }
  GmailApp.sendEmail(r.email, prefix + fill_(tpl.subject, vars, false), text,
    { htmlBody: html, name: 'ROMMUSER', replyTo: ALERT_TO, attachments: tpl.attachments });
}

function varsFor_(r) {
  return {
    nombre: r.nombre,
    correo: r.email,
    codigo: r.codigo,
    link_referido: r.codigo ? referralLink_(r.codigo) : SITE_URL + '#lista',
    baja: leaveLink_(r.email),
  };
}

function fill_(tpl, vars, html) {
  return String(tpl)
    // Gmail a veces guarda {{x}} dentro de un enlace como http://{{x}} o %7B%7Bx%7D%7D.
    .replace(/%7B%7B([\w|]+)%7D%7D/gi, '{{$1}}')
    .replace(/https?:\/\/(\{\{)/g, '$1')
    .replace(/\{\{\s*(\w+)\s*(?:\|([^}]*))?\}\}/g, (all, key, fallback) => {
      const v = vars[key] ? String(vars[key]) : (fallback !== undefined ? fallback.trim() : (key in vars ? '' : all));
      return html ? escape_(v) : v;
    });
}

function escape_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------- Referidos ----------

function referralLink_(code) {
  return SITE_URL + '?ref=' + code + '#lista';
}

// Código corto y estable por correo (sin 0/O/1/I/L para que se pueda dictar).
function refCode_(email) {
  const bytes = Utilities.computeHmacSha256Signature('ref:' + email, secret_());
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += abc[((bytes[i] % abc.length) + abc.length) % abc.length];
  return code;
}

// Suma un referido a quien tenga ese código. La llama doPost cuando entra alguien nuevo.
function creditReferral_(sheet, code, newEmail) {
  const last = sheet.getLastRow();
  if (!code || last < 2) return '';
  const rows = sheet.getRange(2, 1, last - 1, FANS_HEADERS.length).getValues();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][COL.codigo - 1]) !== code) continue;
    const owner = String(rows[i][COL.correo - 1]).toLowerCase();
    if (owner === newEmail) return '';
    const total = Number(rows[i][COL.referidos - 1] || 0) + 1;
    sheet.getRange(i + 2, COL.referidos).setValue(total);
    if (REFERRAL_MILESTONES.indexOf(total) !== -1) {
      MailApp.sendEmail(ALERT_TO, 'Golden Circle: ' + owner + ' llegó a ' + total + ' referidos',
        owner + ' ya trajo ' + total + ' personas al Golden Circle con su enlace (código ' + code + '). ' +
        'Revisa en la hoja que sean correos reales (columna "Referido por") y decide el premio.');
    }
    return code;
  }
  return '';
}

// ---------- Bajas ----------

function secret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('secret');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('secret', s); }
  return s;
}

function leaveToken_(email) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature('baja:' + email, secret_())).slice(0, 22);
}

function leaveLink_(email) {
  return WEB_APP_URL + '?baja=' + encodeURIComponent(email) + '&t=' + leaveToken_(email);
}

// Enlace de baja. Primero muestra un botón (algunos antivirus de correo abren los enlaces solos)
// y solo al tocarlo se registra la baja.
function doGet(e) {
  const p = (e && e.parameter) || {};
  const email = String(p.baja || '').trim().toLowerCase();
  const valid = email && p.t === leaveToken_(email);
  let body;
  if (!valid) {
    body = '<p>Este enlace no es válido. Escríbenos a contact@rommuser.com.</p><p>This link is not valid. Write to contact@rommuser.com.</p>';
  } else if (p.ok === '1') {
    addBaja_(email, 'Enlace de baja');
    body = '<p>Listo. Saliste del Golden Circle. Gracias por haber estado.</p><p>Done. You left the Golden Circle. Thank you for being here.</p>';
  } else {
    const url = leaveLink_(email) + '&ok=1';
    body = '<p>' + escape_(email) + '</p><p><a target="_top" href="' + escape_(url) + '" style="color:#EAE6E5">SALIR DEL GOLDEN CIRCLE / LEAVE</a></p>';
  }
  return HtmlService.createHtmlOutput(
    '<div style="background:#12130F;color:#EAE6E5;padding:48px 28px;font:16px/1.65 Arial,sans-serif;min-height:100vh">' +
    '<p style="font-weight:700;letter-spacing:.12em">ROMMUSER</p>' + body + '</div>')
    .setTitle('ROMMUSER · Golden Circle');
}

function addBaja_(email, why) {
  email = String(email).trim().toLowerCase();
  if (!email) return;
  const ss = SpreadsheetApp.getActive();
  const bajas = ss.getSheetByName(BAJAS) || sheet_(BAJAS, ['Fecha', 'Correo', 'Motivo']);
  if (!bajas_().has(email)) bajas.appendRow([new Date(), email, why]);
  const fans = ss.getSheetByName(SHEET_NAME);
  const last = fans.getLastRow();
  if (last < 2) return;
  const emails = fans.getRange(2, COL.correo, last - 1, 1).getValues().flat().map(x => String(x).toLowerCase());
  const i = emails.indexOf(email);
  if (i !== -1) fans.getRange(i + 2, COL.estado).setValue('Baja');
}

// Quien vuelve a entrar por la web sale de Bajas (pidió entrar de nuevo).
function removeBaja_(email) {
  const sh = SpreadsheetApp.getActive().getSheetByName(BAJAS);
  if (!sh || sh.getLastRow() < 2) return;
  const emails = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues().flat().map(x => String(x).toLowerCase());
  for (let i = emails.length - 1; i >= 0; i--) if (emails[i] === email) sh.deleteRow(i + 2);
}

// Corre cada hora: respuestas con DESCONECTAR / DISCONNECT y rebotes permanentes pasan a Bajas.
// Mira los últimos 2 días; repetir un correo no pasa nada porque addBaja_ no duplica.
function processInbox() {
  GmailApp.search('newer_than:2d {DESCONECTAR DISCONNECT}', 0, 100).forEach(thread => {
    thread.getMessages().forEach(m => {
      const from = emailIn_([m.getFrom()]);
      if (!from || /@rommuser\.com$/.test(from)) return;
      if (wantsOut_(m.getPlainBody())) addBaja_(from, 'Respondió DESCONECTAR');
    });
  });

  GmailApp.search('newer_than:2d from:(mailer-daemon OR postmaster)', 0, 100).forEach(thread => {
    thread.getMessages().forEach(m => {
      const failed = m.getHeader('X-Failed-Recipients');
      if (failed && isPermanentBounce_(m.getPlainBody())) {
        failed.split(',').forEach(addr => addBaja_(addr, 'Rebote permanente'));
      }
    });
  });
}

// Solo cuenta lo que la persona escribió, no el correo citado (que también trae la palabra).
function wantsOut_(body) {
  const own = [];
  const lines = String(body).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\s*>/.test(l) || /^\s*(On .+wrote:|El .+escribió:|-----Original Message-----)/i.test(l)) break;
    own.push(l);
  }
  return /\b(DESCONECTAR|DISCONNECT)\b/i.test(own.join('\n'));
}

// 5.x.x / 55x = la dirección no existe o rechaza para siempre. "Buzón lleno" (4.x.x / 452) no cuenta.
function isPermanentBounce_(body) {
  return /\b5\.\d\.\d{1,3}\b|\b55\d\b/.test(String(body));
}
