import { describe, expect, it } from 'vitest';
import {
  analizar,
  camelot,
  camelotCompatible,
  detectarBpm,
  diferenciaBpm,
  SAMPLE_RATE,
  tonalidadDeCroma,
  cromagrama,
} from '../tools/libreria/analisis';

const sr = SAMPLE_RATE;

// Ruido determinista para que la prueba no dependa de la suerte.
let semilla = 1;
const ruido = () => (semilla = (Math.imul(semilla, 1103515245) + 12345) >>> 0) / 2147483648 - 1;

/** Kick de cuatro en el piso con hats al contratiempo, como un loop de house. */
function loop(bpm: number, segundos: number): Float32Array {
  const out = new Float32Array(Math.round(segundos * sr));
  const beat = (60 / bpm) * sr;
  for (let b = 0; b * beat < out.length; b++) {
    const t0 = Math.round(b * beat);
    for (let i = 0; i < 0.15 * sr && t0 + i < out.length; i++) {
      const t = i / sr;
      out[t0 + i] += 0.8 * Math.sin(2 * Math.PI * (50 + 120 * Math.exp(-t * 30)) * t) * Math.exp(-t * 18);
    }
    const h0 = Math.round((b + 0.5) * beat);
    for (let i = 0; i < 0.03 * sr && h0 + i < out.length; i++) {
      out[h0 + i] += 0.2 * ruido() * Math.exp(-(i / sr) * 150);
    }
  }
  return out;
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Acordes sostenidos con armónicos, uno tras otro. */
function progresion(acordes: number[][], segundosPorAcorde = 2): Float32Array {
  const len = Math.round(segundosPorAcorde * sr);
  const out = new Float32Array(len * acordes.length);
  acordes.forEach((notas, a) => {
    for (const n of notas) {
      const f = hz(n);
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        out[a * len + i] += 0.1 * (Math.sin(2 * Math.PI * f * t) + 0.4 * Math.sin(4 * Math.PI * f * t));
      }
    }
  });
  return out;
}

describe('detectarBpm', () => {
  it.each([122, 124, 126, 128, 132, 138])('loop a %i BPM', (bpm) => {
    expect(Math.abs(detectarBpm(loop(bpm, 30)) - bpm)).toBeLessThanOrEqual(0.3);
  });

  it('decimales (121.5)', () => {
    expect(Math.abs(detectarBpm(loop(121.5, 40)) - 121.5)).toBeLessThanOrEqual(0.3);
  });

  it('DnB con rango propio', () => {
    expect(Math.abs(detectarBpm(loop(174, 30), { min: 160, max: 185 }) - 174)).toBeLessThanOrEqual(0.3);
  });

  it('silencio da 0 sin romperse', () => {
    expect(detectarBpm(new Float32Array(10))).toBe(0);
  });
});

describe('tonalidad', () => {
  // i - VI - III - VII en La menor: Am F C G
  const aMenor = [
    [57, 60, 64, 45],
    [53, 57, 60, 41],
    [48, 52, 55, 36],
    [55, 59, 62, 43],
    [57, 60, 64, 45],
    [57, 60, 64, 45],
  ];

  it('La menor = Am / 8A', () => {
    expect(tonalidadDeCroma(cromagrama(progresion(aMenor)))).toMatchObject({ tonalidad: 'Am', camelot: '8A' });
  });

  it('Fa menor transpuesto = Fm / 4A', () => {
    const fMenor = aMenor.map((c) => c.map((n) => n - 4));
    expect(tonalidadDeCroma(cromagrama(progresion(fMenor)))).toMatchObject({ tonalidad: 'Fm', camelot: '4A' });
  });

  it('el bajo desempata entre relativo mayor y menor', () => {
    // Mismas notas (C E G A) en los dos casos; solo cambia la nota del bajo.
    const conBajo = (bajo: number) => progresion([[60, 64, 67, 69, bajo]], 6);
    expect(tonalidadDeCroma(cromagrama(conBajo(45)))).toMatchObject({ camelot: '8A', tonalidad: 'Am' });
    expect(tonalidadDeCroma(cromagrama(conBajo(48)))).toMatchObject({ camelot: '8B', tonalidad: 'C' });
  });

  it('Sol mayor = G / 9B', () => {
    // I - IV - V - I
    const sol = [
      [55, 59, 62, 43],
      [60, 64, 67, 48],
      [62, 66, 69, 50],
      [55, 59, 62, 43],
    ];
    expect(tonalidadDeCroma(cromagrama(progresion(sol)))).toMatchObject({ tonalidad: 'G', camelot: '9B' });
  });
});

describe('camelot', () => {
  it.each([
    [0, false, '8B'],
    [7, false, '9B'],
    [11, false, '1B'],
    [6, false, '2B'],
    [9, true, '8A'],
    [8, true, '1A'],
    [1, true, '12A'],
    [0, true, '5A'],
  ] as const)('tónica %i menor=%s -> %s', (t, m, c) => {
    expect(camelot(t, m)).toBe(c);
  });

  it('compatibles', () => {
    expect(camelotCompatible('8A', '8A')).toBe(true);
    expect(camelotCompatible('8A', '9A')).toBe(true);
    expect(camelotCompatible('12A', '1A')).toBe(true);
    expect(camelotCompatible('8A', '8B')).toBe(true);
    expect(camelotCompatible('8A', '9B')).toBe(false);
    expect(camelotCompatible('8A', '10A')).toBe(false);
    expect(camelotCompatible('', '8A')).toBe(false);
  });

  it('tempo a medio o doble tiempo', () => {
    expect(diferenciaBpm(128, 128)).toBe(0);
    expect(diferenciaBpm(174, 87)).toBe(0);
    expect(diferenciaBpm(124, 128)).toBeCloseTo(3.23, 1);
  });
});

describe('analizar', () => {
  it('devuelve todo junto', () => {
    const r = analizar(loop(126, 20));
    expect(r.bpm).toBeCloseTo(126, 0);
    expect(r.segundos).toBe(20);
    expect(r.picoDb).toBeLessThanOrEqual(0);
    expect(r.rmsDb).toBeLessThan(r.picoDb);
  });
});
