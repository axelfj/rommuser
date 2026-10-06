// ROMMUSER · Librería: BPM, tonalidad y Camelot de una carpeta de música.
// Solo lee los archivos de audio; nunca los mueve ni los modifica.
//
//   npm run libreria -- analizar "/ruta/a/la/música"
//   npm run libreria -- compatibles "/ruta/a/la/música/rommuser-libreria.csv" "nombre del track"

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import {
  analizar,
  camelotCompatible,
  diferenciaBpm,
  RANGO_POR_DEFECTO,
  type Rango,
  type Resultado,
  SAMPLE_RATE,
} from './analisis.ts';

const EXTENSIONES = new Set(['.wav', '.aif', '.aiff', '.mp3', '.flac', '.m4a', '.aac', '.ogg', '.opus', '.alac']);
const CSV = 'rommuser-libreria.csv';
const CACHE = '.rommuser-libreria-cache.json';
const VERSION_CACHE = 1;

const AYUDA = `
ROMMUSER · Librería

  npm run libreria -- analizar <carpeta> [--rango 85-175] [--csv archivo.csv] [--forzar]
      Recorre la carpeta (y subcarpetas), saca BPM, tonalidad, Camelot, duración y nivel,
      y escribe <carpeta>/${CSV}. Lo ya analizado se guarda en <carpeta>/${CACHE},
      así que volver a correrlo solo analiza lo nuevo o lo que cambió.
      --rango   BPM mínimo y máximo a considerar (para una carpeta de DnB: --rango 160-185)
      --forzar  vuelve a analizar todo aunque esté en caché

  npm run libreria -- compatibles <csv> "<parte del nombre>" [--tolerancia 6]
      Lista los tracks que mezclan armónicamente con ese (Camelot vecino) y con tempo
      a menos de --tolerancia % (también a medio o doble tiempo).

Necesita ffmpeg instalado (macOS: brew install ffmpeg · Windows: winget install ffmpeg).
`;

interface Fila extends Resultado {
  ruta: string;
}

interface Cache {
  version: number;
  rango: Rango;
  archivos: Record<string, { tamano: number; modificado: number; resultado: Resultado }>;
}

function opcion(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre);
  if (i < 0) return undefined;
  const valor = args[i + 1];
  args.splice(i, 2);
  return valor;
}

function bandera(args: string[], nombre: string): boolean {
  const i = args.indexOf(nombre);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
}

async function buscarAudio(carpeta: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(carpeta, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue; // ocultos y los ._ de macOS
    const ruta = join(carpeta, e.name);
    if (e.isDirectory()) out.push(...(await buscarAudio(ruta)));
    else if (EXTENSIONES.has(extname(e.name).toLowerCase())) out.push(ruta);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function tieneFfmpeg(): Promise<boolean> {
  return new Promise((ok) => {
    const p = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    p.on('error', () => ok(false));
    p.on('close', (code) => ok(code === 0));
  });
}

/** Decodifica a mono 22.05 kHz float con ffmpeg. */
function decodificar(ruta: string): Promise<Float32Array> {
  return new Promise((ok, falla) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-nostdin', '-i', ruta, '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 'f32le', 'pipe:1']);
    const partes: Buffer[] = [];
    let error = '';
    p.stdout.on('data', (b: Buffer) => partes.push(b));
    p.stderr.on('data', (b: Buffer) => (error += b.toString()));
    p.on('error', falla);
    p.on('close', (code) => {
      if (code !== 0) return falla(new Error(error.trim().split('\n').pop() || `ffmpeg salió con ${code}`));
      const todo = Buffer.concat(partes);
      const audio = new Float32Array(Math.floor(todo.length / 4));
      new Uint8Array(audio.buffer).set(todo.subarray(0, audio.length * 4));
      ok(audio);
    });
  });
}

function leerCache(ruta: string, rango: Rango): Cache {
  const vacia: Cache = { version: VERSION_CACHE, rango, archivos: {} };
  if (!existsSync(ruta)) return vacia;
  try {
    const c = JSON.parse(readFileSync(ruta, 'utf8')) as Cache;
    // Si cambió el rango de BPM, los resultados viejos ya no sirven.
    if (c.version !== VERSION_CACHE || c.rango?.min !== rango.min || c.rango?.max !== rango.max) return vacia;
    return c;
  } catch {
    return vacia;
  }
}

const celda = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const minutos = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function escribirCsv(ruta: string, raiz: string, filas: Fila[]): void {
  const encabezado = ['archivo', 'carpeta', 'bpm', 'tonalidad', 'camelot', 'confianza_tonalidad', 'duracion', 'rms_dbfs', 'pico_dbfs', 'ruta'];
  const lineas = filas.map((f) =>
    [
      basename(f.ruta, extname(f.ruta)),
      relative(raiz, dirname(f.ruta)) || '.',
      f.bpm.toFixed(1),
      f.tonalidad,
      f.camelot,
      f.confianza.toFixed(2),
      minutos(f.segundos),
      f.rmsDb.toFixed(1),
      f.picoDb.toFixed(1),
      f.ruta,
    ]
      .map(celda)
      .join(','),
  );
  writeFileSync(ruta, [encabezado.join(','), ...lineas].join('\n') + '\n');
}

function leerCsv(ruta: string): Record<string, string>[] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let comillas = false;
  const texto = readFileSync(ruta, 'utf8');
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') (campo += '"'), i++;
      else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') fila.push(campo), (campo = '');
    else if (c === '\n') fila.push(campo), filas.push(fila), (fila = []), (campo = '');
    else if (c !== '\r') campo += c;
  }
  if (campo || fila.length) fila.push(campo), filas.push(fila);
  const [encabezado, ...resto] = filas;
  return resto.map((f) => Object.fromEntries(encabezado.map((h, i) => [h, f[i] ?? ''])));
}

async function comandoAnalizar(args: string[]): Promise<void> {
  const textoRango = opcion(args, '--rango');
  const csvSalida = opcion(args, '--csv');
  const forzar = bandera(args, '--forzar');
  const carpeta = args[0] && resolve(args[0]);
  if (!carpeta || !existsSync(carpeta)) throw new Error(`No encuentro la carpeta: ${args[0] ?? '(falta)'}`);

  let rango = RANGO_POR_DEFECTO;
  if (textoRango) {
    const [min, max] = textoRango.split('-').map(Number);
    if (!(min > 0 && max > min)) throw new Error('--rango va así: 85-175');
    rango = { min, max };
  }
  if (!(await tieneFfmpeg())) throw new Error('Falta ffmpeg. macOS: brew install ffmpeg · Windows: winget install ffmpeg');

  const rutaCache = join(carpeta, CACHE);
  const cache = forzar ? { version: VERSION_CACHE, rango, archivos: {} } : leerCache(rutaCache, rango);
  const archivos = await buscarAudio(carpeta);
  console.log(`${archivos.length} archivos de audio en ${carpeta}`);

  const filas: Fila[] = [];
  const errores: string[] = [];
  let nuevos = 0;
  for (const [i, ruta] of archivos.entries()) {
    const clave = relative(carpeta, ruta);
    const info = await stat(ruta);
    const previo = cache.archivos[clave];
    let resultado = previo && previo.tamano === info.size && previo.modificado === info.mtimeMs ? previo.resultado : null;
    if (!resultado) {
      try {
        resultado = analizar(await decodificar(ruta), rango);
      } catch (e) {
        errores.push(`${clave}: ${(e as Error).message}`);
        continue;
      }
      cache.archivos[clave] = { tamano: info.size, modificado: info.mtimeMs, resultado };
      nuevos++;
      // Guardar seguido: si se corta a la mitad, lo hecho no se pierde.
      if (nuevos % 10 === 0) writeFileSync(rutaCache, JSON.stringify(cache));
      console.log(`[${i + 1}/${archivos.length}] ${resultado.bpm.toFixed(1)} BPM · ${resultado.camelot.padEnd(3)} ${resultado.tonalidad.padEnd(4)} · ${clave}`);
    }
    filas.push({ ruta, ...resultado });
  }
  writeFileSync(rutaCache, JSON.stringify(cache));

  const salida = csvSalida ? resolve(csvSalida) : join(carpeta, CSV);
  escribirCsv(salida, carpeta, filas);
  console.log(`\nListo: ${filas.length} tracks (${nuevos} nuevos, ${filas.length - nuevos} de caché).`);
  console.log(`CSV: ${salida}`);
  const dudosas = filas.filter((f) => f.confianza < 0.1).length;
  if (dudosas) console.log(`${dudosas} con tonalidad dudosa (confianza < 0.10): conviene revisarlas a oído.`);
  if (errores.length) console.log(`\nNo se pudieron leer ${errores.length}:\n  ${errores.join('\n  ')}`);
}

function comandoCompatibles(args: string[]): void {
  const tolerancia = Number(opcion(args, '--tolerancia') ?? 6);
  const [rutaCsv, busqueda] = args;
  if (!rutaCsv || !busqueda) throw new Error('Uso: compatibles <csv> "<parte del nombre>"');
  const filas = leerCsv(resolve(rutaCsv));
  const q = busqueda.toLowerCase();
  const base = filas.find((f) => f.archivo.toLowerCase().includes(q));
  if (!base) throw new Error(`Ningún track contiene "${busqueda}"`);
  const bpm = Number(base.bpm);
  console.log(`${base.archivo} · ${base.bpm} BPM · ${base.camelot} (${base.tonalidad})\n`);
  const lista = filas
    .filter((f) => f !== base && camelotCompatible(base.camelot, f.camelot))
    .map((f) => ({ f, d: diferenciaBpm(bpm, Number(f.bpm)) }))
    .filter(({ d }) => d <= tolerancia)
    .sort((a, b) => a.d - b.d);
  if (!lista.length) console.log('Nada compatible con esa tolerancia.');
  for (const { f, d } of lista) {
    console.log(`  ${f.camelot.padEnd(3)} ${f.bpm.padStart(5)} BPM  (${d.toFixed(1)}%)  ${f.archivo}`);
  }
}

async function main(): Promise<void> {
  const [comando, ...args] = process.argv.slice(2);
  if (comando === 'analizar') return comandoAnalizar(args);
  if (comando === 'compatibles') return comandoCompatibles(args);
  console.log(AYUDA);
  if (comando && comando !== 'ayuda' && comando !== '--help') process.exitCode = 1;
}

main().catch((e: Error) => {
  console.error(`Error: ${e.message}`);
  process.exitCode = 1;
});
