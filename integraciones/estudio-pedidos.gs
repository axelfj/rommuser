// Recibe los pedidos de cotización del estudio (formulario de rommuser.com/estudio y, cuando se conecte,
// studio.rommuser.com) y los manda a contact@ con "Responder" apuntando al correo del artista.
// Proyecto propio de Apps Script en la cuenta contact@ (script.google.com > Nuevo proyecto), publicado como
// app web: Ejecutar como: yo, Acceso: cualquier usuario. La URL /exec va en data-endpoint del formulario
// .studio-form de site/estudio/index.html; después, npm run site:en.
// Requiere TURNSTILE_SECRET en Propiedades del script (el mismo secreto del widget del Golden Circle).
// Opcional: SHEET_ID en Propiedades del script para guardar cada pedido como fila (pestaña "Pedidos web").

const TO = 'contact@rommuser.com';
const EMAIL = /^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/;
const HOSTS = ['rommuser.com', 'www.rommuser.com', 'studio.rommuser.com'];
// Tope global por día: un ataque no puede llenar el buzón ni gastar la cuota de correo de la cuenta.
const DAILY_CAP = 40;
// Campos que se aceptan, en el orden en que salen en el correo, con su largo máximo.
const FIELDS = [
  ['servicio', 'Servicio', 60],
  ['artista', 'Nombre artístico', 120],
  ['correo', 'Correo', 254],
  ['enlace', 'Enlace', 500],
  ['genero', 'Género', 80],
  ['stems', 'Stems', 20],
  ['referencias', 'Referencias', 1500],
  ['fecha', 'Fecha ideal', 20],
  ['mensaje', 'Mensaje', 3000],
  ['reporte', 'Reporte del chequeo de stems', 6000],
];

function doPost(e) {
  if (!e || !e.postData || e.postData.length > 16384) return reply_('invalid');
  const p = e.parameter || {};
  if (p.website) return reply_('ok'); // campo trampa: a un bot no se le avisa que lo descubrimos
  const data = {};
  for (const [key, , max] of FIELDS) data[key] = String(p[key] || '').trim().slice(0, max);
  // studio.rommuser.com manda "nombre" en vez de "artista".
  if (!data.artista) data.artista = String(p.nombre || '').trim().slice(0, 120);
  data.correo = data.correo.toLowerCase();
  if (!data.artista || !EMAIL.test(data.correo)) return reply_('invalid');
  if (!verifyToken_(p['cf-turnstile-response'])) return reply_('forbidden');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return reply_('busy');
  try {
    if (!reserve_()) return reply_('limited');
    const origin = String(p.origen || '').slice(0, 80);
    const lang = p.lang === 'en' ? 'EN' : 'ES';
    const lines = FIELDS.filter(([key]) => data[key]).map(([key, label]) => label + ': ' + data[key]);
    lines.push('', 'Idioma: ' + lang, 'Desde: ' + (origin || 'sin dato'));
    MailApp.sendEmail({
      to: TO,
      replyTo: data.correo,
      name: 'ROMMUSER Studio · web',
      subject: 'Cotización · ' + (data.servicio || 'Estudio') + ' · ' + data.artista,
      body: lines.join('\n'),
    });
    logRow_(data, lang, origin);
  } finally {
    lock.releaseLock();
  }
  return reply_('ok');
}

function reply_(status) {
  return ContentService.createTextOutput(JSON.stringify({ status })).setMimeType(ContentService.MimeType.JSON);
}

// Nunca se confía en lo que diga el navegador: el token se valida con Cloudflare y debe venir de
// la acción del estudio y de uno de nuestros dominios. Sin secreto o sin red, no pasa nada (no fail-open).
function verifyToken_(token) {
  const secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret || typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const response = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: secret, response: token },
      muteHttpExceptions: true,
    });
    if (response.getResponseCode() !== 200) return false;
    const result = JSON.parse(response.getContentText());
    return result.success === true && result.action === 'studio_quote' && HOSTS.indexOf(result.hostname) !== -1;
  } catch (err) {
    return false;
  }
}

// Se llama con el lock tomado. Al llegar al tope, contact@ recibe un aviso una sola vez ese día.
function reserve_() {
  const props = PropertiesService.getScriptProperties();
  const day = Utilities.formatDate(new Date(), 'America/Costa_Rica', 'yyyy-MM-dd');
  const count = props.getProperty('quoteDay') === day ? Number(props.getProperty('quoteCount') || 0) : 0;
  if (!Number.isFinite(count) || count < 0) return false;
  if (count >= DAILY_CAP) {
    if (props.getProperty('quoteAlert') !== day) {
      props.setProperty('quoteAlert', day);
      MailApp.sendEmail(TO, 'Estudio: tope diario de pedidos web alcanzado',
        'Llegaron ' + DAILY_CAP + ' pedidos hoy desde la web. Los siguientes no se enviaron. Si son reales, sube DAILY_CAP en estudio-pedidos.gs.');
    }
    return false;
  }
  props.setProperties({ quoteDay: day, quoteCount: String(count + 1) });
  return true;
}

function logRow_(data, lang, origin) {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) return;
  try {
    const book = SpreadsheetApp.openById(id);
    const sheet = book.getSheetByName('Pedidos web') || book.insertSheet('Pedidos web');
    if (sheet.getLastRow() === 0) sheet.appendRow(['Fecha', 'Servicio', 'Artista', 'Correo', 'Enlace', 'Género', 'Stems', 'Referencias', 'Fecha ideal', 'Idioma', 'Desde']);
    // Un apóstrofo delante evita que un texto que empieza con = se lea como fórmula.
    const safe = v => (/^[=+\-@]/.test(v) ? "'" + v : v);
    sheet.appendRow([new Date(), data.servicio, data.artista, data.correo, data.enlace, data.genero, data.stems,
      data.referencias, data.fecha, lang, origin].map(v => (typeof v === 'string' ? safe(v) : v)));
  } catch (err) {
    // El correo ya salió; una hoja mal configurada no debe perder el pedido.
  }
}

// Para probar sin la web: elige testPedido arriba y dale Ejecutar. Llega un correo de prueba a contact@.
function testPedido() {
  MailApp.sendEmail({ to: TO, replyTo: TO, name: 'ROMMUSER Studio · web', subject: 'Cotización · PRUEBA', body: 'Si ves esto, el script puede enviar correo.' });
}
