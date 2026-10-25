import { describe, expect, it } from 'vitest';

describe('módulo history de la API', () => {
  it('expone su superficie pública en index.ts', async () => {
    await expect(import('./index.ts')).resolves.toBeTypeOf('object');
  });
});
