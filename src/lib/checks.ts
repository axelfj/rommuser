// Convierte el análisis de cada archivo en hallazgos en español, con tres
// niveles: corregir (no se puede mezclar así), revisar (conviene) y bien.

import { toDb, type FileAnalysis } from './analyze';

export type Level = 'corregir' | 'revisar' | 'info';

export interface Finding {
  level: Level;
  code: string;
  message: string;
}

export type FileKind = 'audio' | 'lossy' | 'flac' | 'ignored';

export interface FileEntry {
  name: string;
  kind: FileKind;
  analysis?: FileAnalysis;
  error?: string;
}

export interface FileReport {
  name: string;
  analysis?: FileAnalysis;
  findings: Finding[];
}

export type Verdict = 'listo' | 'casi' | 'corregir';

export interface Report {
  verdict: Verdict;
  files: FileReport[];
  global: Finding[];
  ignored: string[];
  counts: { corregir: number; revisar: number };
}

const AUDIO_EXT = ['wav', 'wave', 'aif', 'aiff', 'aifc', 'bwf'];
const LOSSY_EXT = ['mp3', 'm4a', 'aac', 'ogg', 'opus', 'wma'];

export function classify(name: string): FileKind {
  if (name.startsWith('.')) return 'ignored';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (AUDIO_EXT.includes(ext)) return 'audio';
  if (LOSSY_EXT.includes(ext)) return 'lossy';
  if (ext === 'flac') return 'flac';
  return 'ignored';
}

const STANDARD_RATES = [44100, 48000, 88200, 96000, 176400, 192000];
const SILENCE_DB = -70;
const HOT_PEAK_DB = -1;
const LENGTH_TOLERANCE_S = 0.005;
const GENERIC_NAME = /^(audio|track|pista|untitled|sin t[ií]tulo|nuevo|new|bounce|export|stem)[\s_-]*\d*$/i;

export function formatRate(rate: number): string {
  const k = rate / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)} kHz`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

export function formatFormat(a: FileAnalysis): string {
  const h = a.header;
  const depth = h.encoding === 'float' ? `${h.bitsPerSample} float` : `${h.bitsPerSample} bit`;
  const ch = h.channels === 1 ? 'mono' : h.channels === 2 ? 'estéreo' : `${h.channels} canales`;
  return `${formatRate(h.sampleRate)} · ${depth} · ${ch}`;
}

export function formatPeak(peak: number): string {
  const db = toDb(peak);
  return Number.isFinite(db) ? `${db.toFixed(1)} dBFS` : 'silencio';
}

export function duration(a: FileAnalysis): number {
  return a.header.frames / a.header.sampleRate;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

function mostCommon(values: number[]): number {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
}

export function buildReport(entries: FileEntry[]): Report {
  const files: FileReport[] = [];
  const global: Finding[] = [];
  const ignored: string[] = [];

  for (const e of entries) {
    if (e.kind === 'ignored') {
      ignored.push(e.name);
      continue;
    }
    const findings: Finding[] = [];
    if (e.kind === 'lossy') {
      findings.push({
        level: 'corregir',
        code: 'lossy',
        message: 'Formato con pérdida (MP3/AAC). Para mezcla mandá WAV o AIFF.',
      });
    } else if (e.kind === 'flac') {
      findings.push({
        level: 'revisar',
        code: 'flac',
        message: 'FLAC todavía no lo reviso. Exportalo en WAV para chequearlo.',
      });
    } else if (e.error || !e.analysis) {
      findings.push({ level: 'corregir', code: 'unreadable', message: e.error ?? 'No pude leer este archivo.' });
    } else {
      findings.push(...fileFindings(e.name, e.analysis));
    }
    files.push({ name: e.name, analysis: e.analysis, findings });
  }

  const analyzed = files.filter((f) => f.analysis) as Required<FileReport>[];

  // Sample rate: todos tienen que coincidir.
  const rates = [...new Set(analyzed.map((f) => f.analysis.header.sampleRate))];
  if (rates.length > 1) {
    const main = mostCommon(analyzed.map((f) => f.analysis.header.sampleRate));
    global.push({
      level: 'corregir',
      code: 'rate-mismatch',
      message: `Hay stems con sample rates distintos (${rates.map(formatRate).join(', ')}). Exportá todo al mismo, idealmente ${formatRate(main)}.`,
    });
    for (const f of analyzed) {
      if (f.analysis.header.sampleRate !== main) {
        f.findings.unshift({
          level: 'corregir',
          code: 'rate-odd-one',
          message: `Está a ${formatRate(f.analysis.header.sampleRate)} y la mayoría a ${formatRate(main)}.`,
        });
      }
    }
  }

  // Largo: todos desde el compás 1 hasta el mismo final.
  if (analyzed.length > 1) {
    const durs = analyzed.map((f) => duration(f.analysis));
    const longest = Math.max(...durs);
    if (longest - Math.min(...durs) > LENGTH_TOLERANCE_S) {
      global.push({
        level: 'corregir',
        code: 'length-mismatch',
        message: 'Los stems no duran lo mismo. Exportá todos desde el inicio de la canción hasta el mismo final, para que caigan alineados.',
      });
      analyzed.forEach((f, i) => {
        if (longest - durs[i] > LENGTH_TOLERANCE_S) {
          f.findings.push({
            level: 'corregir',
            code: 'shorter',
            message: `Dura ${formatDuration(durs[i])} y el más largo ${formatDuration(longest)}.`,
          });
        }
      });
    }
  }

  // Nombres: tip para ordenar la sesión.
  if (analyzed.length > 2 && !analyzed.some((f) => /^\d/.test(f.name))) {
    global.push({
      level: 'info',
      code: 'numbering',
      message: 'Tip: numerá los stems (01 Kick, 02 Bass, 03 Pads…) para que la sesión abra en orden.',
    });
  }
  if (files.length === 1 && analyzed.length === 1) {
    global.push({
      level: 'info',
      code: 'single',
      message: 'Un solo archivo: si es para mastering, perfecto. Si es para mezcla, mandá cada pista por separado.',
    });
  }

  let corregir = global.filter((g) => g.level === 'corregir').length;
  let revisar = global.filter((g) => g.level === 'revisar').length;
  for (const f of files) {
    corregir += f.findings.filter((x) => x.level === 'corregir').length;
    revisar += f.findings.filter((x) => x.level === 'revisar').length;
  }
  const verdict: Verdict = corregir > 0 ? 'corregir' : revisar > 0 ? 'casi' : 'listo';
  return { verdict, files, global, ignored, counts: { corregir, revisar } };
}

function fileFindings(name: string, a: FileAnalysis): Finding[] {
  const out: Finding[] = [];
  const { header: h, stats: s } = a;
  const peakDb = toDb(s.peak);

  if (peakDb < SILENCE_DB) {
    out.push({
      level: 'corregir',
      code: 'silent',
      message: 'Está en silencio (o casi). ¿Se exportó la pista equivocada o con el canal en mute?',
    });
  }
  if (s.clipEvents > 0) {
    out.push({
      level: 'corregir',
      code: 'clipping',
      message: `Clipping: ${s.clipEvents} ${s.clipEvents === 1 ? 'punto' : 'puntos'} donde la señal se pega a 0 dBFS. Bajá el fader o quitá el limitador del master y re-exportá.`,
    });
  } else if (s.overSamples > 0) {
    out.push({
      level: 'revisar',
      code: 'over',
      message: `Pasa de 0 dBFS (pico ${peakDb.toFixed(1)} dBFS). En 32 float no se rompe, pero bajalo para dejar margen.`,
    });
  } else if (peakDb > HOT_PEAK_DB && peakDb >= SILENCE_DB) {
    out.push({
      level: 'revisar',
      code: 'hot',
      message: `Pico a ${peakDb.toFixed(1)} dBFS. Dejá algo de margen: entre −6 y −3 dBFS está bien.`,
    });
  }
  if (!STANDARD_RATES.includes(h.sampleRate)) {
    out.push({
      level: 'revisar',
      code: 'rate-unusual',
      message: `Sample rate poco común (${formatRate(h.sampleRate)}). Lo normal es 44.1 o 48 kHz.`,
    });
  }
  if (h.encoding !== 'float' && h.bitsPerSample < 24) {
    out.push({
      level: 'revisar',
      code: 'low-bits',
      message: `${h.bitsPerSample} bits: mejor exportar a 24 bits o 32 float para tener más detalle y margen.`,
    });
  }
  if (h.channels === 2 && s.identicalChannels) {
    out.push({
      level: 'info',
      code: 'fake-stereo',
      message: 'Es mono guardado en estéreo (L y R idénticos). Podés exportarlo mono.',
    });
  }
  if (h.channels > 2) {
    out.push({
      level: 'revisar',
      code: 'multichannel',
      message: `Tiene ${h.channels} canales. Para mezcla en estéreo mandá mono o estéreo.`,
    });
  }
  if (GENERIC_NAME.test(baseName(name).trim())) {
    out.push({
      level: 'revisar',
      code: 'generic-name',
      message: 'Nombre genérico. Ponele qué es (Kick, Bass, Vox…) para no perderse en la sesión.',
    });
  }
  return out;
}

/** Texto plano para copiar y pegar en un correo o WhatsApp. */
export function reportToText(r: Report): string {
  const lines: string[] = [];
  const title = { listo: 'Listo para mezcla', casi: 'Casi listo', corregir: 'Hay cosas que corregir' }[r.verdict];
  lines.push(`Chequeo de stems · ROMMUSER Studio`, `Resultado: ${title}`, '');
  for (const g of r.global) lines.push(`• ${g.message}`);
  if (r.global.length) lines.push('');
  for (const f of r.files) {
    const a = f.analysis;
    const meta = a
      ? ` (${formatFormat(a)} · ${formatDuration(duration(a))} · pico ${formatPeak(a.stats.peak)})`
      : '';
    lines.push(`${f.name}${meta}`);
    for (const x of f.findings) lines.push(`   - ${x.message}`);
  }
  return lines.join('\n');
}
