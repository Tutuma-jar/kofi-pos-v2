import { describe, expect, it } from 'vitest';

describe('módulo menu de la API', () => {
  it('expone su superficie pública en index.ts', async () => {
    await expect(import('./index.ts')).resolves.toBeTypeOf('object');
  });

  it('expone el menú oficial para las ventas de demostración (SPEC-007, D-4)', async () => {
    const { OFFICIAL_MENU } = await import('./index.ts');
    expect(OFFICIAL_MENU).toHaveLength(6);
    expect(OFFICIAL_MENU.flatMap((category) => category.products)).toHaveLength(37);
  });
});
