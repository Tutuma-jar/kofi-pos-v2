import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@kofi/api',
    // PGlite y scrypt reales comparten CPU en CI; conservar las aserciones de integración (T040).
    testTimeout: 15_000,
  },
});
