// Junta archivos de un drop o de un input, entrando en carpetas.

export interface PickedFile {
  file: File;
  /** Ruta relativa para mostrar (carpeta/archivo.wav). */
  path: string;
}

type Entry = FileSystemEntry;

function readEntries(dir: FileSystemDirectoryEntry): Promise<Entry[]> {
  const reader = dir.createReader();
  const all: Entry[] = [];
  return new Promise((resolve, reject) => {
    const next = () =>
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(all);
        all.push(...batch);
        next();
      }, reject);
    next();
  });
}

async function walk(entry: Entry, out: PickedFile[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
    out.push({ file, path: entry.fullPath.replace(/^\//, '') });
  } else if (entry.isDirectory) {
    for (const child of await readEntries(entry as FileSystemDirectoryEntry)) await walk(child, out);
  }
}

export async function filesFromDrop(dt: DataTransfer): Promise<PickedFile[]> {
  const entries = [...dt.items]
    .map((it) => (it.kind === 'file' ? it.webkitGetAsEntry?.() : null))
    .filter((x): x is Entry => !!x);
  if (!entries.length) return [...dt.files].map((file) => ({ file, path: file.name }));
  const out: PickedFile[] = [];
  for (const e of entries) await walk(e, out);
  return out;
}

export function filesFromInput(list: FileList | null): PickedFile[] {
  return [...(list ?? [])].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
}
