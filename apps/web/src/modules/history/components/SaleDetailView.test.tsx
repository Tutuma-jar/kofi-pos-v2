import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEMO_SALES } from '../dev/fixtures.ts';
import { SaleDetailView } from './SaleDetailView.tsx';

describe('instantánea de la venta (RF-7, RF-8)', () => {
  it.each([
    ['0001-01-01T04:32:36.000Z', '01/01/0001 00:00'],
    ['0099-12-31T12:00:00.000Z', '31/12/0099 07:27'],
  ])('conserva las cuatro cifras del año de %s (T033)', (registeredAt, text) => {
    render(<SaleDetailView sale={{ ...DEMO_SALES['3']!.sale, registeredAt }} />);
    expect(screen.getByText(text, { exact: true })).toBeVisible();
  });

  it('muestra fecha, persona, pago, líneas en orden y total recibido sin recalcular', () => {
    render(<SaleDetailView sale={{ ...DEMO_SALES['3']!.sale, totalCents: 9999 }} />);
    for (const text of [
      '24/10/2026 10:30',
      'Registrada por Luis Mamani · Dueño',
      'Medio de pago: QR',
      'Bs 99,99',
    ])
      expect(screen.getByText(text, { exact: true })).toBeVisible();
    expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      'Empanada · Salados · Bs 8,00 × 1 · Bs 8,00',
      'Café americano · Bebidas calientes · Bs 12,50 × 1 · Bs 12,50',
    ]);
  });
  it('muestra las 30 líneas sin truncarlas ni cambiar el orden', () => {
    const line = DEMO_SALES['3']!.sale.lines[0]!;
    const lines = Array.from({ length: 30 }, (_, index) => ({
      ...line,
      productId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      productName: `Producto ${index + 1}`,
    }));
    render(<SaleDetailView sale={{ ...DEMO_SALES['3']!.sale, lines, totalCents: 24000 }} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(30);
    expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Producto 1 · Salados');
    expect(screen.getAllByRole('listitem')[29]).toHaveTextContent('Producto 30 · Salados');
    expect(screen.getByText('Bs 240,00', { exact: true })).toBeVisible();
  });
});
