import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/contracts',
      'apps/api',
      'apps/web',
      // Pruebas de la configuración de la raíz (reglas de ESLint).
      { test: { name: 'root', include: ['*.test.ts'] } },
    ],
  },
});
