import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const resolve = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': resolve('./shared'),
      '@caa/core': resolve('./packages/caa-core/src/index.ts'),
      '@caa/store': resolve('./packages/caa-store/src/index.ts'),
      '@caa/agent': resolve('./packages/caa-agent/src/index.ts'),
      '@caa/midi-ir': resolve('./packages/caa-midi-ir/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'packages/*/tests/**/*.test.ts',
      'src/**/*.test.{ts,tsx}',
      'electron/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/*.d.ts', '**/node_modules/**'],
    },
  },
});
