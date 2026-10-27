// Arma el pedido que recibe el Apps Script de contact@ (integraciones/estudio-pedidos.gs).
// Va como formulario con mode 'no-cors': Apps Script no responde el preflight de un JSON.

export const REPORT_LIMIT = 6000;

export interface QuoteInput {
  servicio: string;
  nombre: string;
  correo: string;
  link?: string;
  mensaje?: string;
  website?: string;
  reporte: string;
  lang: string;
  token: string;
}

export function quoteBody(q: QuoteInput): URLSearchParams {
  return new URLSearchParams({
    servicio: q.servicio,
    nombre: q.nombre.trim(),
    correo: q.correo.trim(),
    enlace: (q.link ?? '').trim(),
    mensaje: q.mensaje ?? '',
    reporte: q.reporte.slice(0, REPORT_LIMIT),
    lang: q.lang === 'en' ? 'en' : 'es',
    origen: 'studio.rommuser.com',
    website: q.website ?? '',
    'cf-turnstile-response': q.token,
  });
}
