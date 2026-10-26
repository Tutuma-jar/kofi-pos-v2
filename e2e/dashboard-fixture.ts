import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';

// Cada historia necesita empezar el 24/10 y avanzar sin retroceder el reloj compartido.
// Son la misma API real y el mismo build de vite preview, con una base efímera por recorrido.
export const test = base.extend<{ dashboardServer: string }>({
  dashboardServer: async ({ browserName }, use) => {
    void browserName;
    const root = fileURLToPath(new URL('../', import.meta.url));
    const api = spawn(process.execPath, ['apps/api/test/e2e-server.ts'], {
      cwd: root,
      env: { ...process.env, PORT: '3101' },
      stdio: 'ignore',
      windowsHide: true,
    });
    const web = spawn(
      process.execPath,
      ['../../node_modules/vite/bin/vite.js', 'preview', '--port', '4174', '--strictPort'],
      {
        cwd: fileURLToPath(new URL('../apps/web/', import.meta.url)),
        env: { ...process.env, API_PROXY_TARGET: 'http://127.0.0.1:3101' },
        stdio: 'ignore',
        windowsHide: true,
      },
    );
    const ready = async (url: string) => {
      for (let attempt = 0; attempt < 100; attempt++) {
        if (
          await fetch(url)
            .then((response) => response.ok)
            .catch(() => false)
        )
          return;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error(`No arrancó el servidor de pruebas: ${url}`);
    };
    try {
      await Promise.all([
        ready('http://127.0.0.1:3101/api/health'),
        ready('http://localhost:4174'),
      ]);
      await use('http://localhost:4174');
    } finally {
      await Promise.all(
        [api, web].map(async (child) => {
          if (child.exitCode !== null) return;
          const exited = once(child, 'exit');
          child.kill();
          await exited;
        }),
      );
    }
  },
  baseURL: async ({ dashboardServer }, use) => {
    await use(dashboardServer);
  },
});
export { expect };
