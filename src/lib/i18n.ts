// Idioma de la página: español por defecto, inglés si el navegador lo pide o
// si la persona lo elige. Mismo criterio y misma clave que rommuser.com.

export type Lang = 'es' | 'en';

const STORAGE_KEY = 'rommuser-language';
let current: Lang = 'es';

export function lang(): Lang {
  return current;
}

export function setLang(next: Lang) {
  current = next;
}

/** Devuelve el texto en el idioma actual. */
export function tx(es: string, en: string): string {
  return current === 'en' ? en : es;
}

export function preferredLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* sin almacenamiento: seguimos con el navegador */
  }
  const langs = navigator.languages?.length ? navigator.languages : [navigator.language || 'es'];
  const match = langs.find((l) => /^(es|en)(-|$)/i.test(l));
  return match?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

export function saveLang(l: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* no pasa nada si no se guarda */
  }
}

// Los errores de lectura vienen del worker en español; acá se traducen.
const ERRORS_EN: Record<string, string> = {
  'El archivo está vacío o incompleto.': 'The file is empty or incomplete.',
  'No es un WAV válido.': 'Not a valid WAV.',
  'No es un AIFF válido.': 'Not a valid AIFF.',
  'Formato no reconocido: mandá WAV o AIFF.': 'Unrecognized format: send WAV or AIFF.',
  'Al WAV le falta el bloque de formato.': 'The WAV is missing its format chunk.',
  'El WAV no tiene audio (falta el bloque data).': 'The WAV has no audio (missing data chunk).',
  'El encabezado del WAV está dañado.': 'The WAV header is damaged.',
  'WAV float con tamaño raro.': 'Float WAV with an unusual sample size.',
  'WAV con tamaño de muestra no soportado.': 'WAV sample size not supported.',
  'WAV comprimido: exportalo como PCM o 32 float.': 'Compressed WAV: export it as PCM or 32-bit float.',
  'Al AIFF le falta el bloque COMM.': 'The AIFF is missing its COMM chunk.',
  'El AIFF no tiene audio (falta SSND).': 'The AIFF has no audio (missing SSND).',
  'El encabezado del AIFF está dañado.': 'The AIFF header is damaged.',
  'AIFF con tamaño de muestra no soportado.': 'AIFF sample size not supported.',
  'No pude leer este archivo.': "Couldn't read this file.",
};

export function errorText(message: string): string {
  if (current === 'es') return message;
  const compressed = /^AIFF comprimido \((.*)\): exportalo sin compresión\.$/.exec(message);
  if (compressed) return `Compressed AIFF (${compressed[1]}): export it uncompressed.`;
  return ERRORS_EN[message] ?? message;
}
