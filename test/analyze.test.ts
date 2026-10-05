import { describe, expect, it } from 'vitest';
import { analyzeBlob, toDb } from '../src/lib/analyze';
import { blobReader, HeaderError, readHeader } from '../src/lib/header';
import { blobOf, makeAiff, makeWav, signals } from './fixtures';

const header = (bytes: Uint8Array<ArrayBuffer>) => readHeader(blobReader(blobOf(bytes)), bytes.byteLength);

describe('readHeader', () => {
  it.each([
    [44100, 16],
    [48000, 24],
    [96000, 32],
  ] as const)('WAV PCM %i Hz / %i bit', async (sampleRate, bits) => {
    const h = await header(makeWav({ sampleRate, bits, seconds: 0.25 }));
    expect(h).toMatchObject({ container: 'wav', encoding: 'int', sampleRate, bitsPerSample: bits, channels: 2 });
    expect(h.frames).toBe(Math.round(0.25 * sampleRate));
  });

  it('WAV 32 float', async () => {
    const h = await header(makeWav({ float: true, channels: 1 }));
    expect(h).toMatchObject({ encoding: 'float', bitsPerSample: 32, channels: 1 });
  });

  it('WAV extensible 24 bit', async () => {
    const h = await header(makeWav({ extensible: true, bits: 24 }));
    expect(h).toMatchObject({ encoding: 'int', bitsPerSample: 24, bytesPerSample: 3 });
  });

  it('WAV 8 bit sin signo', async () => {
    const h = await header(makeWav({ bits: 8 }));
    expect(h.encoding).toBe('uint8');
  });

  it.each([44100, 48000, 96000])('AIFF %i Hz', async (sampleRate) => {
    const h = await header(makeAiff({ sampleRate, bits: 24 }));
    expect(h).toMatchObject({ container: 'aiff', sampleRate, bitsPerSample: 24, littleEndian: false });
  });

  it('AIFC sowt y fl32', async () => {
    expect((await header(makeAiff({ aifc: 'sowt', bits: 16 }))).littleEndian).toBe(true);
    expect((await header(makeAiff({ aifc: 'fl32' }))).encoding).toBe('float');
  });

  it('rechaza lo que no es audio', async () => {
    const junk = new TextEncoder().encode('esto no es un wav, es un texto cualquiera');
    await expect(header(junk)).rejects.toBeInstanceOf(HeaderError);
  });
});

describe('analyzeBlob', () => {
  it('mide el pico de un seno a −6 dBFS', async () => {
    for (const bits of [16, 24, 32] as const) {
      const { stats } = await analyzeBlob(blobOf(makeWav({ bits, signal: signals.sine(0.5) })));
      expect(toDb(stats.peak)).toBeCloseTo(-6.02, 1);
      expect(stats.clipEvents).toBe(0);
    }
  });

  it('el mismo audio da lo mismo en WAV, AIFF y AIFC', async () => {
    const opts = { bits: 24 as const, signal: signals.wide };
    const a = await analyzeBlob(blobOf(makeWav(opts)));
    const b = await analyzeBlob(blobOf(makeAiff(opts)));
    const c = await analyzeBlob(blobOf(makeAiff({ ...opts, aifc: 'sowt' })));
    expect(b.stats.peak).toBeCloseTo(a.stats.peak, 6);
    expect(c.stats.peak).toBeCloseTo(a.stats.peak, 6);
  });

  it('detecta clipping en enteros', async () => {
    const { stats } = await analyzeBlob(blobOf(makeWav({ bits: 24, signal: signals.clipped })));
    expect(stats.clipEvents).toBeGreaterThan(0);
  });

  it('en float cuenta muestras sobre 0 dBFS en vez de clipping', async () => {
    const { stats } = await analyzeBlob(blobOf(makeWav({ float: true, signal: signals.sine(1.4) })));
    expect(stats.clipEvents).toBe(0);
    expect(stats.overSamples).toBeGreaterThan(0);
  });

  it('detecta mono guardado en estéreo', async () => {
    const same = await analyzeBlob(blobOf(makeWav({ signal: signals.sine(0.5) })));
    const wide = await analyzeBlob(blobOf(makeWav({ signal: signals.wide })));
    expect(same.stats.identicalChannels).toBe(true);
    expect(wide.stats.identicalChannels).toBe(false);
  });

  it('silencio da pico 0', async () => {
    const { stats } = await analyzeBlob(blobOf(makeWav({ signal: signals.silence })));
    expect(stats.peak).toBe(0);
    expect(stats.identicalChannels).toBe(false);
  });

  it('procesa archivos más grandes que un bloque', async () => {
    // 24 bit estéreo a 48 kHz, 15 s ≈ 4.3 MB: cruza el límite de 4 MB por bloque.
    const bytes = makeWav({ seconds: 15, signal: (i, c, sr) => (i === 14 * sr ? 0.9 : 0.1) });
    const seen: number[] = [];
    const { stats } = await analyzeBlob(blobOf(bytes), (f) => seen.push(f));
    expect(stats.peak).toBeCloseTo(0.9, 4);
    expect(seen.length).toBeGreaterThan(1);
    expect(seen.at(-1)).toBe(1);
  });
});

describe('archivos cortados', () => {
  it('WAV con menos audio del que declara se rechaza', async () => {
    const full = makeWav({ seconds: 0.1 });
    await expect(header(full.slice(0, full.byteLength - 4))).rejects.toThrow(HeaderError);
  });

  it('AIFF con menos audio del que declara se rechaza', async () => {
    const full = makeAiff({ seconds: 0.1 });
    await expect(header(full.slice(0, full.byteLength - 4))).rejects.toThrow(HeaderError);
  });

  it('WAV con tamaño 0 en data (export en streaming) se sigue leyendo', async () => {
    const wav = makeWav({ seconds: 0.1 });
    const view = new DataView(wav.buffer);
    for (let p = 12; p + 8 <= wav.byteLength; ) {
      const id = String.fromCharCode(...wav.slice(p, p + 4));
      const size = view.getUint32(p + 4, true);
      if (id === 'data') {
        view.setUint32(p + 4, 0, true);
        break;
      }
      p += 8 + size + (size % 2);
    }
    const h = await header(wav);
    expect(h.frames).toBe(Math.round(0.1 * 48000));
  });
});
