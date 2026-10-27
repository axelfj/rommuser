// Datos del servicio. Los precios salen de la lista vigente de ROMMUSER.

export const CONTACT_EMAIL = 'contact@rommuser.com';

export const SERVICES = {
  mixdown: {
    label: 'Mixdown',
    price: 'desde $250',
    priceEn: 'from $250',
    detail: '6 a 8 stems · 2 revisiones incluidas',
    detailEn: '6 to 8 stems · 2 revisions included',
  },
  mastering: {
    label: 'Mastering',
    price: '$50',
    priceEn: '$50',
    detail: 'Un track · 2 revisiones incluidas',
    detailEn: 'One track · 2 revisions included',
  },
} as const;

export type ServiceKey = keyof typeof SERVICES;

export const PAYMENT_TERMS = '50% para empezar, 50% al entregar.';
export const PAYMENT_TERMS_EN = '50% to start, 50% on delivery.';

/** URL /exec del Apps Script de pedidos. Sin ella, el formulario abre un correo a contact@. */
export const FORM_ENDPOINT: string = import.meta.env.VITE_FORM_ENDPOINT ?? '';

/** Turnstile de Cloudflare: el mismo widget que rommuser.com (studio.rommuser.com tiene que estar en su lista de dominios). */
export const TURNSTILE_SITEKEY: string = import.meta.env.VITE_TURNSTILE_SITEKEY ?? '0x4AAAAAAFR3wMqwdxNIoieU';

/** Dominio en Plausible. Sin él no se carga ninguna analítica. */
export const PLAUSIBLE_DOMAIN: string = import.meta.env.VITE_PLAUSIBLE_DOMAIN ?? '';
