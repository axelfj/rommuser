import { afterEach, describe, expect, it } from 'vitest';
import { analyzeBlob } from '../src/lib/analyze';
import { buildReport, classify, reportToText, type FileEntry } from '../src/lib/checks';
import { setLang } from '../src/lib/i18n';
import { blobOf, makeWav, signals, type SynthOptions } from './fixtures';

async function entry(name: string, opts: SynthOptions = {}): Promise<FileEntry> {
  return { name, kind: 'audio', analysis: await analyzeBlob(blobOf(makeWav({ signal: signals.wide, ...opts }))) };
}

const codes = (findings: { code: string }[]) => findings.map((f) => f.code);

describe('classify', () => {
  it('separa audio, con pérdida, flac e ignorados', () => {
    expect(classify('01 Kick.wav')).toBe('audio');
    expect(classify('Bass.AIF')).toBe('audio');
    expect(classify('ref.mp3')).toBe('lossy');
    expect(classify('vox.flac')).toBe('flac');
    expect(classify('.DS_Store')).toBe('ignored');
    expect(classify('Kick.wav.asd')).toBe('ignored');
  });
});

describe('buildReport', () => {
  it('stems correctos quedan listos', async () => {
    const r = buildReport([await entry('01 Kick.wav'), await entry('02 Bass.wav'), await entry('03 Pads.wav')]);
    expect(r.verdict).toBe('listo');
    expect(r.counts).toEqual({ corregir: 0, revisar: 0 });
  });

  it('sample rates mezclados se marcan para corregir', async () => {
    const r = buildReport([
      await entry('01 Kick.wav', { sampleRate: 48000 }),
      await entry('02 Bass.wav', { sampleRate: 48000 }),
      await entry('03 Vox.wav', { sampleRate: 44100 }),
    ]);
    expect(r.verdict).toBe('corregir');
    expect(codes(r.global)).toContain('rate-mismatch');
    expect(codes(r.files[2].findings)).toContain('rate-odd-one');
    expect(codes(r.files[0].findings)).not.toContain('rate-odd-one');
  });

  it('largos distintos', async () => {
    const r = buildReport([await entry('01 Kick.wav', { seconds: 1 }), await entry('02 Bass.wav', { seconds: 0.5 })]);
    expect(codes(r.global)).toContain('length-mismatch');
    expect(codes(r.files[1].findings)).toContain('shorter');
  });

  it('clipping, silencio, 16 bit, pico alto y nombre genérico', async () => {
    const r = buildReport([
      await entry('01 Lead.wav', { signal: signals.clipped }),
      await entry('02 FX.wav', { signal: signals.silence }),
      await entry('03 Keys.wav', { bits: 16 }),
      await entry('04 Hat.wav', { signal: signals.sine(0.95) }),
      await entry('Audio 3.wav'),
    ]);
    expect(codes(r.files[0].findings)).toContain('clipping');
    expect(codes(r.files[1].findings)).toContain('silent');
    expect(codes(r.files[2].findings)).toContain('low-bits');
    expect(codes(r.files[3].findings)).toEqual(expect.arrayContaining(['hot', 'fake-stereo']));
    expect(codes(r.files[4].findings)).toContain('generic-name');
  });

  it('MP3 se marca y los archivos del DAW se ignoran', async () => {
    const r = buildReport([
      await entry('01 Kick.wav'),
      { name: 'ref.mp3', kind: 'lossy' },
      { name: 'Kick.wav.asd', kind: 'ignored' },
    ]);
    expect(r.ignored).toEqual(['Kick.wav.asd']);
    expect(codes(r.files[1].findings)).toEqual(['lossy']);
    expect(r.verdict).toBe('corregir');
  });

  it('archivo ilegible', async () => {
    const r = buildReport([{ name: 'roto.wav', kind: 'audio', error: 'No es un WAV válido.' }]);
    expect(r.files[0].findings[0]).toMatchObject({ level: 'corregir', message: 'No es un WAV válido.' });
  });

  it('sin audio no queda listo', () => {
    const r = buildReport([{ name: 'notes.txt', kind: 'ignored' }]);
    expect(r.verdict).toBe('corregir');
    expect(codes(r.global)).toEqual(['no-audio']);
  });

  it('pide numerar si nadie está numerado', async () => {
    const r = buildReport([await entry('Kick.wav'), await entry('Bass.wav'), await entry('Pads.wav')]);
    expect(codes(r.global)).toContain('numbering');
    expect(r.verdict).toBe('listo');
  });

  it('el texto para copiar trae el resultado y los archivos', async () => {
    const r = buildReport([await entry('01 Kick.wav'), await entry('02 Bass.wav', { bits: 16 })]);
    const text = reportToText(r);
    expect(text).toContain('Resultado: Casi listo');
    expect(text).toContain('02 Bass.wav (48 kHz · 16 bit · estéreo');
  });
});

describe('idioma', () => {
  afterEach(() => setLang('es'));

  it('los hallazgos y el reporte salen en inglés', async () => {
    setLang('en');
    const r = buildReport([
      await entry('01 Kick.wav', { sampleRate: 44100 }),
      await entry('02 Bass.wav', { sampleRate: 48000 }),
      { name: 'roto.wav', kind: 'audio', error: 'No es un WAV válido.' },
    ]);
    expect(r.global[0].message).toMatch(/^Your stems have different sample rates/);
    expect(r.files[2].findings[0].message).toBe('Not a valid WAV.');
    expect(reportToText(r)).toMatch(/^Stem check · ROMMUSER Studio\nResult: Some things need fixing/);
  });
});
