export const CONTACT_EMAIL = 'contact@rommuser.com';

/** Enlace para donar en /plugins/. Vacío: el botón muestra "muy pronto". */
export const DONATION_URL = '';

/** Dominio en Plausible. Sin él no se carga ninguna analítica. */
export const PLAUSIBLE_DOMAIN: string = import.meta.env.VITE_PLAUSIBLE_DOMAIN ?? '';
