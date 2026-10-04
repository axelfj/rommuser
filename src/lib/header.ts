// Lee el encabezado de WAV (RIFF/RF64) y AIFF/AIFC sin decodificar el audio.
// Se lee directo del archivo porque decodeAudioData re-muestrea y esconde
// el sample rate y el bit depth originales.

export type Encoding = 'int' | 'uint8' | 'float';

export interface AudioHeader {
  container: 'wav' | 'aiff';
  encoding: Encoding;
  /** Bits útiles por muestra (24 aunque vaya en un contenedor de 32). */
  bitsPerSample: number;
  /** Bytes que ocupa cada muestra en el archivo. */
  bytesPerSample: number;
  channels: number;
  sampleRate: number;
  littleEndian: boolean;
  dataOffset: number;
  dataBytes: number;
  frames: number;
}

export class HeaderError extends Error {}

export type ReadFn = (offset: number, length: number) => Promise<DataView>;

export function blobReader(blob: Blob): ReadFn {
  return async (offset, length) => {
    const buf = await blob.slice(offset, offset + length).arrayBuffer();
    return new DataView(buf);
  };
}

function fourcc(view: DataView, offset: number): string {
  let s = '';
  for (let i = 0; i < 4; i++) s += String.fromCharCode(view.getUint8(offset + i));
  return s;
}

const WAVE_FORMAT_PCM = 0x0001;
const WAVE_FORMAT_IEEE_FLOAT = 0x0003;
const WAVE_FORMAT_EXTENSIBLE = 0xfffe;

export async function readHeader(read: ReadFn, fileSize: number): Promise<AudioHeader> {
  if (fileSize < 12) throw new HeaderError('El archivo está vacío o incompleto.');
  const head = await read(0, 12);
  const magic = fourcc(head, 0);
  if (magic === 'RIFF' || magic === 'RF64' || magic === 'BW64') {
    if (fourcc(head, 8) !== 'WAVE') throw new HeaderError('No es un WAV válido.');
    return readWav(read, fileSize, magic !== 'RIFF');
  }
  if (magic === 'FORM') {
    const kind = fourcc(head, 8);
    if (kind !== 'AIFF' && kind !== 'AIFC') throw new HeaderError('No es un AIFF válido.');
    return readAiff(read, fileSize, kind === 'AIFC');
  }
  throw new HeaderError('Formato no reconocido: mandá WAV o AIFF.');
}

async function readWav(read: ReadFn, fileSize: number, is64: boolean): Promise<AudioHeader> {
  let pos = 12;
  let fmt: DataView | null = null;
  let ds64DataSize: number | null = null;
  let dataOffset = -1;
  let dataBytes = 0;

  while (pos + 8 <= fileSize) {
    const ch = await read(pos, 8);
    const id = fourcc(ch, 0);
    const size = ch.getUint32(4, true);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = await read(body, Math.min(size, 40));
    } else if (id === 'ds64' && is64) {
      const ds = await read(body, 16);
      ds64DataSize = Number(ds.getBigUint64(8, true));
    } else if (id === 'data') {
      dataOffset = body;
      dataBytes = is64 && size === 0xffffffff && ds64DataSize !== null ? ds64DataSize : size;
      // Algunos DAWs dejan el tamaño en 0 o mal si el export se cortó.
      dataBytes = Math.min(dataBytes || fileSize - body, fileSize - body);
      if (fmt) break;
    }
    const step = id === 'data' ? dataBytes : size;
    pos = body + step + (step % 2);
  }

  if (!fmt) throw new HeaderError('Al WAV le falta el bloque de formato.');
  if (dataOffset < 0) throw new HeaderError('El WAV no tiene audio (falta el bloque data).');

  let format = fmt.getUint16(0, true);
  const channels = fmt.getUint16(2, true);
  const sampleRate = fmt.getUint32(4, true);
  const blockAlign = fmt.getUint16(12, true);
  let bits = fmt.getUint16(14, true);
  if (format === WAVE_FORMAT_EXTENSIBLE && fmt.byteLength >= 26) {
    const valid = fmt.getUint16(18, true);
    if (valid > 0) bits = valid;
    format = fmt.getUint16(24, true);
  }
  if (!channels || !sampleRate || !blockAlign) throw new HeaderError('El encabezado del WAV está dañado.');

  const bytesPerSample = blockAlign / channels;
  let encoding: Encoding;
  if (format === WAVE_FORMAT_IEEE_FLOAT) {
    if (bytesPerSample !== 4 && bytesPerSample !== 8) throw new HeaderError('WAV float con tamaño raro.');
    encoding = 'float';
  } else if (format === WAVE_FORMAT_PCM) {
    if (![1, 2, 3, 4].includes(bytesPerSample)) throw new HeaderError('WAV con tamaño de muestra no soportado.');
    encoding = bytesPerSample === 1 ? 'uint8' : 'int';
  } else {
    throw new HeaderError('WAV comprimido: exportalo como PCM o 32 float.');
  }

  return {
    container: 'wav',
    encoding,
    bitsPerSample: bits,
    bytesPerSample,
    channels,
    sampleRate,
    littleEndian: true,
    dataOffset,
    dataBytes,
    frames: Math.floor(dataBytes / blockAlign),
  };
}

/** Float extendido de 80 bits (IEEE 754) que usa AIFF para el sample rate. */
function readExtended(view: DataView, offset: number): number {
  const expon = view.getUint16(offset, false);
  const hi = view.getUint32(offset + 2, false);
  const lo = view.getUint32(offset + 6, false);
  if (expon === 0 && hi === 0 && lo === 0) return 0;
  const sign = expon & 0x8000 ? -1 : 1;
  const e = (expon & 0x7fff) - 16383;
  const mant = hi * 2 ** -31 + lo * 2 ** -63;
  return sign * mant * 2 ** e;
}

async function readAiff(read: ReadFn, fileSize: number, isAifc: boolean): Promise<AudioHeader> {
  let pos = 12;
  let comm: DataView | null = null;
  let dataOffset = -1;
  let dataBytes = 0;

  while (pos + 8 <= fileSize) {
    const ch = await read(pos, 8);
    const id = fourcc(ch, 0);
    const size = ch.getUint32(4, false);
    const body = pos + 8;
    if (id === 'COMM') {
      comm = await read(body, Math.min(size, 22));
    } else if (id === 'SSND') {
      const ss = await read(body, 8);
      const off = ss.getUint32(0, false);
      dataOffset = body + 8 + off;
      dataBytes = Math.min(Math.max(size - 8 - off, 0), fileSize - dataOffset);
    }
    pos = body + size + (size % 2);
  }

  if (!comm) throw new HeaderError('Al AIFF le falta el bloque COMM.');
  if (dataOffset < 0) throw new HeaderError('El AIFF no tiene audio (falta SSND).');

  const channels = comm.getUint16(0, false);
  const bits = comm.getUint16(6, false);
  const sampleRate = Math.round(readExtended(comm, 8));
  let encoding: Encoding = 'int';
  let littleEndian = false;
  let bytesPerSample = Math.ceil(bits / 8);

  if (isAifc && comm.byteLength >= 22) {
    const comp = fourcc(comm, 18);
    if (comp === 'sowt') littleEndian = true;
    else if (comp === 'fl32' || comp === 'FL32') {
      encoding = 'float';
      bytesPerSample = 4;
    } else if (comp === 'fl64' || comp === 'FL64') {
      encoding = 'float';
      bytesPerSample = 8;
    } else if (comp !== 'NONE' && comp !== 'twos') {
      throw new HeaderError(`AIFF comprimido (${comp.trim()}): exportalo sin compresión.`);
    }
  }
  if (!channels || !sampleRate || !bytesPerSample) throw new HeaderError('El encabezado del AIFF está dañado.');
  if (encoding === 'int' && ![1, 2, 3, 4].includes(bytesPerSample)) {
    throw new HeaderError('AIFF con tamaño de muestra no soportado.');
  }

  const blockAlign = bytesPerSample * channels;
  return {
    container: 'aiff',
    encoding,
    bitsPerSample: encoding === 'float' ? bytesPerSample * 8 : bits,
    bytesPerSample,
    channels,
    sampleRate,
    littleEndian,
    dataOffset,
    dataBytes,
    frames: Math.floor(dataBytes / blockAlign),
  };
}
