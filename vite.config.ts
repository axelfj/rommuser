import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Dos páginas: el chequeo de stems (/) y los plugins gratis (/plugins/).
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        plugins: resolve(import.meta.dirname, 'plugins/index.html'),
      },
    },
  },
});
