import { defineConfig, devices } from '@playwright/test';

const API_PORT = 3100;
const WEB_PORT = 4173;

// La interfaz compilada (vite preview) reenvía /api a la API de E2E, como Render en producción (D-2).
// npm run test:e2e compila antes el contrato y la interfaz.
export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node apps/api/test/e2e-server.ts',
      env: { PORT: String(API_PORT) },
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: `npm run preview -w @kofi/web -- --port ${WEB_PORT} --strictPort`,
      env: { API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}` },
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
    },
  ],
});
