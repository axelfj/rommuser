import { describe, expect, it } from 'vitest';
import { REPORT_LIMIT, quoteBody } from '../src/lib/quote';

describe('quoteBody', () => {
  const base = { servicio: 'Mixdown', nombre: ' Ana ', correo: ' ana@example.com ', reporte: '', lang: 'es', token: 'tok' };

  it('sends the fields the Apps Script reads', () => {
    const b = quoteBody({ ...base, link: 'https://drive.google.com/x', mensaje: 'Ref: Fisher' });
    expect(Object.fromEntries(b)).toEqual({
      servicio: 'Mixdown',
      nombre: 'Ana',
      correo: 'ana@example.com',
      enlace: 'https://drive.google.com/x',
      mensaje: 'Ref: Fisher',
      reporte: '',
      lang: 'es',
      origen: 'studio.rommuser.com',
      website: '',
      'cf-turnstile-response': 'tok',
    });
  });

  it('caps the stems report and only allows es or en', () => {
    const b = quoteBody({ ...base, reporte: 'x'.repeat(REPORT_LIMIT + 50), lang: 'fr' });
    expect(b.get('reporte')).toHaveLength(REPORT_LIMIT);
    expect(b.get('lang')).toBe('es');
  });
});
