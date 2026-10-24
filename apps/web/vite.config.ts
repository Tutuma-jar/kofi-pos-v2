import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Mismo origen que en Render (D-2): /api se reenvía a la API, en desarrollo y en vite preview.
const apiProxy = {
  '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
};

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
});
