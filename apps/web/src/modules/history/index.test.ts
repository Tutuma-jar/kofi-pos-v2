import { describe, expect, it } from 'vitest';

describe('módulo history de la interfaz', () => {
  it('expone su superficie pública en index.ts', async () => {
    await expect(import('./index.ts')).resolves.toBeTypeOf('object');
  });
});

describe('superficie pública del historial (plan D-9)', () => {
  it('exporta el cliente real y su proveedor', async () => {
    const history = await import('./index.ts');
    const { httpHistoryClient } = await import('./api/history-client.ts');
    const { HistoryClientProvider } = await import('./api/HistoryClientProvider.tsx');

    expect(history.httpHistoryClient).toBe(httpHistoryClient);
    expect(history.HistoryClientProvider).toBe(HistoryClientProvider);
  });
});
