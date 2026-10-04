// Analiza los archivos fuera del hilo principal para que la página no se congele.

import { analyzeBlob, type FileAnalysis } from './lib/analyze';
import { HeaderError } from './lib/header';

export type WorkerRequest = { id: number; file: File };
export type WorkerResponse =
  | { id: number; type: 'progress'; fraction: number }
  | { id: number; type: 'done'; analysis: FileAnalysis }
  | { id: number; type: 'error'; message: string };

const post = (msg: WorkerResponse) => self.postMessage(msg);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, file } = e.data;
  try {
    let last = 0;
    const analysis = await analyzeBlob(file, (fraction) => {
      if (fraction - last >= 0.05 || fraction === 1) {
        last = fraction;
        post({ id, type: 'progress', fraction });
      }
    });
    post({ id, type: 'done', analysis });
  } catch (err) {
    const message = err instanceof HeaderError ? err.message : 'No pude leer este archivo.';
    post({ id, type: 'error', message });
  }
};
