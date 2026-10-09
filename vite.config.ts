import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve('./shared'),
      '@caa/core': resolve('./packages/caa-core/src/index.ts'),
      '@caa/store': resolve('./packages/caa-store/src/index.ts'),
      '@caa/agent': resolve('./packages/caa-agent/src/index.ts'),
      '@caa/midi-ir': resolve('./packages/caa-midi-ir/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2022',
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // ignore node_modules to avoid infinite rebuild loops in monorepo dev
      ignored: ['**/node_modules/**'],
    },
  },
});
