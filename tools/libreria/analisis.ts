// Análisis de BPM y tonalidad sobre audio mono ya decodificado (Float32Array).
// Sin dependencias ni APIs de Node: lo usan el CLI y las pruebas.

export const SAMPLE_RATE = 22050;

export interface Rango {
  min: number;
  max: number;
}

export const RANGO_POR_DEFECTO: Rango = { min: 85, max: 175 };

export interface Resultado {
  bpm: number;
  tonalidad: string;
  camelot: string;
  /** 0 a 1: qué tan claro gana la tonalidad elegida sobre la siguiente. */
  confianza: number;
  segundos: number;
  rmsDb: number;
  picoDb: number;
}

// ---------- FFT radix-2 in place ----------

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  return w;
}

/** Recorre el audio en ventanas y entrega la magnitud de cada una (bins 0..n/2). */
function espectrograma(audio: Float32Array, n: number, hop: number, cada: (mag: Float64Array) => void): void {
  const w = hann(n);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const mag = new Float64Array(n / 2 + 1);
  for (let start = 0; start + n <= audio.length; start += hop) {
    for (let i = 0; i < n; i++) {
      re[i] = audio[start + i] * w[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k <= n / 2; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    cada(mag);
  }
}

// ---------- BPM ----------

const BPM_N = 1024;
const BPM_HOP = 128;

/** Curva de ataques (flujo espectral en escala log), una muestra por ventana. */
function envolventeDeAtaques(audio: Float32Array): Float64Array {
  const valores: number[] = [];
  let previo = new Float64Array(BPM_N / 2 + 1);
  let actual = new Float64Array(BPM_N / 2 + 1);
  espectrograma(audio, BPM_N, BPM_HOP, (mag) => {
    let flujo = 0;
    for (let k = 1; k < mag.length; k++) {
      actual[k] = Math.log1p(1000 * mag[k]);
      const d = actual[k] - previo[k];
      if (d > 0) flujo += d;
    }
    [previo, actual] = [actual, previo];
    valores.push(valores.length ? flujo : 0);
  });
  // Restar la media local (~0.5 s) deja solo los golpes.
  const env = Float64Array.from(valores);
  const fps = SAMPLE_RATE / BPM_HOP;
  const radio = Math.round(fps * 0.25);
  const out = new Float64Array(env.length);
  let suma = 0;
  let desde = 0;
  let hasta = -1;
  for (let i = 0; i < env.length; i++) {
    const a = Math.max(0, i - radio);
    const b = Math.min(env.length - 1, i + radio);
    while (hasta < b) suma += env[++hasta];
    while (desde < a) suma -= env[desde++];
    out[i] = Math.max(0, env[i] - suma / (b - a + 1));
  }
  return out;
}

function autocorrelacion(x: Float64Array): Float64Array {
  let n = 1;
  while (n < x.length * 2) n <<= 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  let media = 0;
  for (const v of x) media += v;
  media /= x.length || 1;
  for (let i = 0; i < x.length; i++) re[i] = x[i] - media;
  fft(re, im);
  for (let i = 0; i < n; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }
  fft(re, im); // la potencia es real y par: la FFT directa sirve de inversa salvo la escala
  const acf = new Float64Array(x.length);
  const cero = re[0] || 1;
  for (let i = 0; i < x.length; i++) acf[i] = re[i] / cero;
  return acf;
}

function interpolar(x: Float64Array, pos: number): number {
  const i = Math.floor(pos);
  if (i + 1 >= x.length) return 0;
  const f = pos - i;
  return x[i] * (1 - f) + x[i + 1] * f;
}

/** Para el tempo alcanza con 3 minutos del centro del track (evita intros sin kick). */
const BPM_SEGUNDOS = 180;

export function detectarBpm(audio: Float32Array, rango: Rango = RANGO_POR_DEFECTO): number {
  const largo = BPM_SEGUNDOS * SAMPLE_RATE;
  const desde = Math.max(0, Math.floor((audio.length - largo) / 2));
  const env = envolventeDeAtaques(audio.subarray(desde, desde + largo));
  if (env.length < 64) return 0;
  const acf = autocorrelacion(env);
  const fps = SAMPLE_RATE / BPM_HOP;
  const puntaje = (bpm: number) => {
    const lag = (60 * fps) / bpm;
    let s = 0;
    // El período del beat se repite en cada compás: sumar varios múltiplos afina la medida.
    for (let k = 1; k <= 8; k++) s += interpolar(acf, k * lag);
    return s;
  };
  let mejor = 0;
  let mejorPuntaje = -Infinity;
  for (let bpm = rango.min; bpm <= rango.max + 1e-9; bpm += 0.05) {
    const p = puntaje(bpm);
    if (p > mejorPuntaje) {
      mejorPuntaje = p;
      mejor = bpm;
    }
  }
  // Ajuste fino alrededor del mejor candidato.
  for (let bpm = mejor - 0.05; bpm <= mejor + 0.05; bpm += 0.005) {
    const p = puntaje(bpm);
    if (p > mejorPuntaje) {
      mejorPuntaje = p;
      mejor = bpm;
    }
  }
  return Math.round(mejor * 10) / 10;
}

// ---------- Tonalidad ----------

const NOMBRES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const NOMBRES_MENOR = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

// Perfiles de Krumhansl–Kessler.
const MAYOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MENOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

export function camelot(tonica: number, menor: boolean): string {
  const raiz = menor ? (tonica + 3) % 12 : tonica;
  return `${((7 * raiz + 7) % 12) + 1}${menor ? 'A' : 'B'}`;
}

const KEY_N = 8192;
const KEY_HOP = 4096;

export interface Croma {
  /** Energía por clase de nota (C..B), 55 Hz a 2.1 kHz. */
  todo: Float64Array;
  /** Lo mismo, solo el bajo (55 a 220 Hz): dice cuál es la tónica. */
  bajo: Float64Array;
}

export function cromagrama(audio: Float32Array): Croma {
  const todo = new Float64Array(12);
  const bajo = new Float64Array(12);
  const clase = new Int8Array(KEY_N / 2 + 1).fill(-1);
  const esBajo = new Uint8Array(KEY_N / 2 + 1);
  for (let k = 1; k <= KEY_N / 2; k++) {
    const f = (k * SAMPLE_RATE) / KEY_N;
    if (f < 55 || f > 2100) continue;
    const midi = 69 + 12 * Math.log2(f / 440);
    // Solo bins cerca del centro de una nota: el ruido entre notas no vota.
    if (Math.abs(midi - Math.round(midi)) > 0.35) continue;
    clase[k] = ((Math.round(midi) % 12) + 12) % 12;
    esBajo[k] = f <= 220 ? 1 : 0;
  }
  const marco = new Float64Array(12);
  const marcoBajo = new Float64Array(12);
  espectrograma(audio, KEY_N, KEY_HOP, (mag) => {
    marco.fill(0);
    marcoBajo.fill(0);
    for (let k = 0; k < mag.length; k++) {
      if (clase[k] < 0) continue;
      marco[clase[k]] += mag[k];
      if (esBajo[k]) marcoBajo[clase[k]] += mag[k];
    }
    const max = Math.max(...marco);
    // Normalizar cada ventana para que los drops no tapen al resto del track.
    if (max > 1e-6) {
      for (let c = 0; c < 12; c++) {
        todo[c] += marco[c] / max;
        bajo[c] += marcoBajo[c] / max;
      }
    }
  });
  return { todo, bajo };
}

function correlacion(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let ma = 0;
  let mb = 0;
  for (let i = 0; i < 12; i++) {
    ma += a[i];
    mb += b[i];
  }
  ma /= 12;
  mb /= 12;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < 12; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

export function tonalidadDeCroma({ todo, bajo }: Croma): { tonalidad: string; camelot: string; confianza: number } {
  const candidatos: { tonica: number; menor: boolean; r: number; camelot: string }[] = [];
  for (let t = 0; t < 12; t++) {
    const rotado = Array.from({ length: 12 }, (_, i) => todo[(i + t) % 12]);
    for (const menor of [false, true]) {
      candidatos.push({ tonica: t, menor, r: correlacion(rotado, menor ? MENOR : MAYOR), camelot: camelot(t, menor) });
    }
  }
  candidatos.sort((a, b) => b.r - a.r);
  let g = candidatos[0];
  // Mayor y su relativo menor usan las mismas notas y se confunden; el bajo decide
  // cuál es la tónica (en house y techno casi siempre pisa la tónica).
  const relativo = candidatos.find((c) => c !== g && c.camelot.slice(0, -1) === g.camelot.slice(0, -1))!;
  if (g.r - relativo.r < 0.15 && bajo[relativo.tonica] > bajo[g.tonica]) g = relativo;
  // La confianza mide contra la mejor opción con otro número Camelot: es lo que importa al mezclar.
  const otra = candidatos.find((c) => c.camelot.slice(0, -1) !== g.camelot.slice(0, -1))!;
  return {
    tonalidad: g.menor ? NOMBRES_MENOR[g.tonica] : NOMBRES[g.tonica],
    camelot: g.camelot,
    confianza: Math.max(0, Math.min(1, Math.round((Math.max(g.r, relativo.r) - otra.r) * 500) / 100)),
  };
}

// ---------- Todo junto ----------

const db = (x: number) => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120);

export function analizar(audio: Float32Array, rango: Rango = RANGO_POR_DEFECTO): Resultado {
  let suma = 0;
  let pico = 0;
  for (const v of audio) {
    suma += v * v;
    const a = Math.abs(v);
    if (a > pico) pico = a;
  }
  return {
    bpm: detectarBpm(audio, rango),
    ...tonalidadDeCroma(cromagrama(audio)),
    segundos: Math.round((audio.length / SAMPLE_RATE) * 10) / 10,
    rmsDb: db(Math.sqrt(suma / (audio.length || 1))),
    picoDb: db(pico),
  };
}

// ---------- Mezcla armónica ----------

function partesCamelot(c: string): { n: number; l: string } | null {
  const m = /^(\d{1,2})([AB])$/.exec(c.trim().toUpperCase());
  return m ? { n: Number(m[1]), l: m[2] } : null;
}

/** Misma clave, ±1 en la rueda, o el relativo mayor/menor. */
export function camelotCompatible(a: string, b: string): boolean {
  const x = partesCamelot(a);
  const y = partesCamelot(b);
  if (!x || !y) return false;
  if (x.n === y.n) return true;
  if (x.l !== y.l) return false;
  const d = Math.abs(x.n - y.n);
  return d === 1 || d === 11;
}

/** Diferencia porcentual de tempo, aceptando mezclar a medio o doble tiempo. */
export function diferenciaBpm(a: number, b: number): number {
  if (!a || !b) return Infinity;
  return Math.min(...[b, b * 2, b / 2].map((c) => (Math.abs(c - a) / a) * 100));
}
