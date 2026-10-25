import { describe, expect, it } from 'vitest';
import type { SaleDraftLine, SaleQuote } from '@kofi/contracts';
import { priceDraft } from './sales.pricing.ts';

const menu: SaleQuote['menu'] = [
  {
    id: 'category',
    name: 'Bebidas',
    products: [
      { id: 'coffee', name: 'Café americano', priceCents: 1250 },
      { id: 'tea', name: 'Té', priceCents: 800 },
    ],
  },
];
const coffee: SaleDraftLine = {
  productId: 'coffee',
  productName: 'Café americano',
  quantity: 2,
  unitPriceCents: 1250,
};

describe('priceDraft (RF-4, RF-5, RF-7, RNF-2)', () => {
  it('calcula subtotales, total y orden; admite una venta vacía', () => {
    const result = priceDraft([coffee, { productId: 'tea', productName: 'Té', quantity: 1 }], menu);
    expect(result.lines.map((l) => [l.productName, l.subtotalCents])).toEqual([
      ['Café americano', 2500],
      ['Té', 800],
    ]);
    expect(result).toMatchObject({ totalCents: 3300, notices: [], menuChanged: false });
    expect(priceDraft([], menu)).toEqual({
      lines: [],
      totalCents: 0,
      notices: [],
      menuChanged: false,
    });
  });
  it('avisa del precio nuevo usando el nombre mostrado', () => {
    const changed = [
      { ...menu[0]!, products: [{ id: 'coffee', name: 'Americano', priceCents: 1300 }] },
    ];
    expect(priceDraft([coffee], changed)).toMatchObject({
      totalCents: 2600,
      menuChanged: true,
      notices: ['Cambió el precio de “Café americano”: ahora cuesta Bs 13,00'],
    });
  });
  it('distingue una línea retirada de un producto recién agregado', () => {
    expect(priceDraft([coffee, { productId: 'tea', productName: 'Té', quantity: 1 }], [])).toEqual({
      lines: [],
      totalCents: 0,
      menuChanged: true,
      notices: ['Se quitó “Café americano”: ya no está en el menú', '“Té” ya no está en el menú'],
    });
  });
  it('actualiza nombre y categoría sin avisar', () => {
    const changed = [
      {
        id: 'other',
        name: 'Otra categoría',
        products: [{ id: 'coffee', name: 'Americano', priceCents: 1250 }],
      },
    ];
    expect(priceDraft([coffee], changed)).toMatchObject({
      menuChanged: false,
      notices: [],
      lines: [{ productName: 'Americano', categoryName: 'Otra categoría' }],
    });
  });
  it('calcula exactamente el máximo de 30 líneas de 99 unidades', () => {
    const products = Array.from({ length: 30 }, (_, i) => ({
      id: String(i),
      name: `Producto ${i}`,
      priceCents: 100000,
    }));
    const lines = products.map((p) => ({ productId: p.id, productName: p.name, quantity: 99 }));
    expect(priceDraft(lines, [{ id: 'category', name: 'Categoría', products }]).totalCents).toBe(
      297000000,
    );
  });
});
