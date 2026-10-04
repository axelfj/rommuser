// Genera WAV y AIFF sintéticos en memoria para las pruebas.

export interface SynthOptions {
  sampleRate?: number;
  bits?: 8 | 16 | 24 | 32;
  float?: boolean;
  channels?: number;
  seconds?: number;
  /** Devuelve la muestra (−1..1) para el frame i y canal c. */
  signal?: (i: number, c: number, sampleRate: number) => number;
  extensible?: boolean;
}

const sine = (amp: number, hz = 440) => (i: number, _c: number, sr: number) =>
  amp * Math.sin((2 * Math.PI * hz * i) / sr);

export const signals = {
  sine,
  silence: () => 0,
  clipped: (i: number, c: number, sr: number) => Math.max(-1, Math.min(1, 1.5 * Math.sin((2 * Math.PI * 100 * i) / sr))),
  /** Diferente por canal, para que no sea mono disfrazado. */
  wide: (i: number, c: number, sr: number) => 0.5 * Math.sin((2 * Math.PI * (c ? 330 : 440) * i) / sr),
};

function writeSample(view: DataView, o: number, x: number, bits: number, float: boolean, le: boolean) {
  if (float) {
    if (bits === 64) view.setFloat64(o, x, le);
    else view.setFloat32(o, x, le);
    return;
  }
  const clamp = Math.max(-1, Math.min(1, x));
  switch (bits) {
    case 8:
      view.setUint8(o, Math.min(255, Math.round(clamp * 128 + 128)));
      break;
    case 16:
      view.setInt16(o, Math.min(32767, Math.round(clamp * 32768)), le);
      break;
    case 24: {
      const v = Math.min(8388607, Math.round(clamp * 8388608));
      const b = [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff];
      if (le) b.forEach((x, k) => view.setUint8(o + k, x));
      else b.reverse().forEach((x, k) => view.setUint8(o + k, x));
      break;
    }
    case 32:
      view.setInt32(o, Math.min(2147483647, Math.round(clamp * 2147483648)), le);
      break;
  }
}

function fill(view: DataView, start: number, o: Required<SynthOptions>, le: boolean, aiff8 = false) {
  const bps = o.bits / 8;
  const frames = Math.round(o.seconds * o.sampleRate);
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < o.channels; c++) {
      const off = start + (i * o.channels + c) * bps;
      const x = o.signal(i, c, o.sampleRate);
      if (aiff8) view.setInt8(off, Math.max(-128, Math.min(127, Math.round(x * 128))));
      else writeSample(view, off, x, o.bits, o.float, le);
    }
  }
  return frames;
}

function defaults(opts: SynthOptions): Required<SynthOptions> {
  return {
    sampleRate: 48000,
    bits: opts.float ? 32 : 24,
    float: false,
    channels: 2,
    seconds: 0.5,
    signal: sine(0.5),
    extensible: false,
    ...opts,
  } as Required<SynthOptions>;
}

export function makeWav(opts: SynthOptions = {}): Uint8Array<ArrayBuffer> {
  const o = defaults(opts);
  const bps = o.bits / 8;
  const frames = Math.round(o.seconds * o.sampleRate);
  const dataBytes = frames * o.channels * bps;
  const fmtSize = o.extensible ? 40 : 16;
  const listSize = 4; // un chunk extra para probar que se saltan
  const total = 12 + (8 + listSize) + (8 + fmtSize) + (8 + dataBytes) + (dataBytes % 2);
  const buf = new ArrayBuffer(total);
  const v = new DataView(buf);
  const str = (o2: number, s: string) => [...s].forEach((ch, k) => v.setUint8(o2 + k, ch.charCodeAt(0)));
  str(0, 'RIFF');
  v.setUint32(4, total - 8, true);
  str(8, 'WAVE');
  let p = 12;
  str(p, 'LIST');
  v.setUint32(p + 4, listSize, true);
  p += 8 + listSize;
  str(p, 'fmt ');
  v.setUint32(p + 4, fmtSize, true);
  const tag = o.extensible ? 0xfffe : o.float ? 3 : 1;
  v.setUint16(p + 8, tag, true);
  v.setUint16(p + 10, o.channels, true);
  v.setUint32(p + 12, o.sampleRate, true);
  v.setUint32(p + 16, o.sampleRate * o.channels * bps, true);
  v.setUint16(p + 20, o.channels * bps, true);
  v.setUint16(p + 22, o.bits, true);
  if (o.extensible) {
    v.setUint16(p + 24, 22, true);
    v.setUint16(p + 26, o.bits, true);
    v.setUint32(p + 28, 0, true);
    v.setUint16(p + 32, o.float ? 3 : 1, true);
  }
  p += 8 + fmtSize;
  str(p, 'data');
  v.setUint32(p + 4, dataBytes, true);
  fill(v, p + 8, o, true);
  return new Uint8Array(buf);
}

function writeExtended(v: DataView, o: number, value: number) {
  const e = Math.floor(Math.log2(value));
  v.setUint16(o, e + 16383, false);
  const mant = value / 2 ** e; // 1.x
  const hi = Math.floor(mant * 2 ** 31);
  v.setUint32(o + 2, hi, false);
  v.setUint32(o + 6, 0, false);
}

export function makeAiff(opts: SynthOptions & { aifc?: 'NONE' | 'sowt' | 'fl32' } = {}): Uint8Array<ArrayBuffer> {
  const o = defaults(opts);
  const comp = opts.aifc;
  const float = comp === 'fl32';
  const bits = float ? 32 : o.bits;
  const bps = bits / 8;
  const frames = Math.round(o.seconds * o.sampleRate);
  const dataBytes = frames * o.channels * bps;
  const commSize = comp ? 24 : 18;
  const total = 12 + (8 + commSize) + (8 + 8 + dataBytes) + (dataBytes % 2);
  const buf = new ArrayBuffer(total);
  const v = new DataView(buf);
  const str = (o2: number, s: string) => [...s].forEach((ch, k) => v.setUint8(o2 + k, ch.charCodeAt(0)));
  str(0, 'FORM');
  v.setUint32(4, total - 8, false);
  str(8, comp ? 'AIFC' : 'AIFF');
  let p = 12;
  str(p, 'COMM');
  v.setUint32(p + 4, commSize, false);
  v.setUint16(p + 8, o.channels, false);
  v.setUint32(p + 10, frames, false);
  v.setUint16(p + 14, bits, false);
  writeExtended(v, p + 16, o.sampleRate);
  if (comp) {
    str(p + 26, comp);
    v.setUint8(p + 30, 0);
    v.setUint8(p + 31, 0);
  }
  p += 8 + commSize;
  str(p, 'SSND');
  v.setUint32(p + 4, 8 + dataBytes, false);
  v.setUint32(p + 8, 0, false);
  v.setUint32(p + 12, 0, false);
  fill(v, p + 16, { ...o, bits: bits as 8 | 16 | 24 | 32, float }, comp === 'sowt', bits === 8);
  return new Uint8Array(buf);
}

export const blobOf = (bytes: Uint8Array<ArrayBuffer>) => new Blob([bytes]);
