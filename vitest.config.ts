import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./server/tests/setup.ts'],
    alias: {
      '@db': resolve(__dirname, './db'),
      '@db/schema': resolve(__dirname, './db/schema'),
    },
  },
});
