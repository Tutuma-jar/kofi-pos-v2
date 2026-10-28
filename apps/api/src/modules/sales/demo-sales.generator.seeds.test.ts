import { describe, expect, it } from 'vitest';
import { priceSchema } from '@kofi/contracts';
import { OFFICIAL_MENU } from '../menu/index.ts';
import { planDemoCalendar } from './demo-sales.calendar.ts';
import { generateDemoSales } from './demo-sales.generator.ts';

// Archivo aparte para que Vitest lo ejecute en paralelo con las demás pruebas: es la más lenta.
describe('generador de ventas de demostración con 1000 semillas (D-11)', () => {
  it('no agota los 50 intentos con ninguna', () => {
    const products = OFFICIAL_MENU.flatMap((category, c) =>
      category.products.map((product, p) => ({
        id: `p-${c}-${p}`,
        name: product.name,
        categoryName: category.name,
        priceCents: priceSchema.parse(product.price),
      })),
    );
    const accounts = [
      { id: 'o1', displayName: 'Luis Mamani', role: 'owner' as const },
      { id: 'c1', displayName: 'Ana Quispe', role: 'cashier' as const },
    ];
    for (let seed = 1001; seed <= 2000; seed++) {
      const calendar = planDemoCalendar({ from: '2026-07-28', to: '2026-10-27' }, seed);
      expect(() =>
        generateDemoSales({ calendar, seed, products, accounts, firstNumber: 1 }),
      ).not.toThrow();
    }
  }, 300_000);
});
