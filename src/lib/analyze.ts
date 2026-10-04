// Recorre el audio por bloques y junta lo necesario para el reporte:
// picos, clipping, silencio y si el estéreo es en realidad mono.

import { blobReader, readHeader, type AudioHeader } from './header';

export interface AudioStats {
  /** Pico absoluto en escala lineal (1.0 = 0 dBFS). */
  peak: number;
  /** Tramos de 3+ muestras seguidas pegadas al máximo (formatos enteros). */
  clipEvents: number;
  /** Muestras por encima de 0 dBFS (solo posible en float). */
  overSamples: number;
  /** true si L y R son idénticos en todo el archivo. */
  identicalChannels: boolean;
}

export interface FileAnalysis {
  header: AudioHeader;
  stats: AudioStats;
}

const CHUNK_BYTES = 4 * 1024 * 1024;
const CLIP_LEVEL = 0.9999;
const CLIP_RUN = 3;

type SampleReader = (view: DataView, offset: number) => number;

function sampleReader(h: AudioHeader): SampleReader {
  const le = h.littleEndian;
  if (h.encoding === 'float') {
    return h.bytesPerSample === 8
      ? (v, o) => v.getFloat64(o, le)
      : (v, o) => v.getFloat32(o, le);
  }
  if (h.encoding === 'uint8') return (v, o) => (v.getUint8(o) - 128) / 128;
  switch (h.bytesPerSample) {
    case 1:
      return (v, o) => v.getInt8(o) / 128;
    case 2:
      return (v, o) => v.getInt16(o, le) / 32768;
    case 3:
      return le
        ? (v, o) => ((v.getInt8(o + 2) << 16) | (v.getUint8(o + 1) << 8) | v.getUint8(o)) / 8388608
        : (v, o) => ((v.getInt8(o) << 16) | (v.getUint8(o + 1) << 8) | v.getUint8(o + 2)) / 8388608;
    default:
      return (v, o) => v.getInt32(o, le) / 2147483648;
  }
}

export class StatsAccumulator {
  private peak = 0;
  private clipEvents = 0;
  private overSamples = 0;
  private identical: boolean;
  private runs: number[];
  private readonly read: SampleReader;
  private readonly frameBytes: number;

  constructor(private readonly h: AudioHeader) {
    this.read = sampleReader(h);
    this.frameBytes = h.bytesPerSample * h.channels;
    this.identical = h.channels === 2;
    this.runs = new Array(h.channels).fill(0);
  }

  /** Recibe bloques alineados a frames completos. */
  feed(view: DataView): void {
    const { channels, bytesPerSample } = this.h;
    const isFloat = this.h.encoding === 'float';
    const frames = Math.floor(view.byteLength / this.frameBytes);
    let peak = this.peak;
    for (let f = 0; f < frames; f++) {
      const base = f * this.frameBytes;
      let first = 0;
      for (let c = 0; c < channels; c++) {
        const x = this.read(view, base + c * bytesPerSample);
        const a = x < 0 ? -x : x;
        if (a > peak) peak = a;
        if (isFloat) {
          if (a > 1) this.overSamples++;
        } else if (a >= CLIP_LEVEL) {
          if (++this.runs[c] === CLIP_RUN) this.clipEvents++;
        } else {
          this.runs[c] = 0;
        }
        if (c === 0) first = x;
        else if (this.identical && x !== first) this.identical = false;
      }
    }
    this.peak = peak;
  }

  result(): AudioStats {
    return {
      peak: this.peak,
      clipEvents: this.clipEvents,
      overSamples: this.overSamples,
      identicalChannels: this.identical && this.peak > 0,
    };
  }
}

export async function analyzeBlob(
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<FileAnalysis> {
  const read = blobReader(blob);
  const header = await readHeader(read, blob.size);
  const acc = new StatsAccumulator(header);
  const frameBytes = header.bytesPerSample * header.channels;
  const chunk = Math.max(frameBytes, CHUNK_BYTES - (CHUNK_BYTES % frameBytes));
  const usable = header.frames * frameBytes;
  for (let done = 0; done < usable; done += chunk) {
    const len = Math.min(chunk, usable - done);
    acc.feed(await read(header.dataOffset + done, len));
    onProgress?.(Math.min(1, (done + len) / usable));
  }
  return { header, stats: acc.result() };
}

export function toDb(linear: number): number {
  return linear > 0 ? 20 * Math.log10(linear) : -Infinity;
}
