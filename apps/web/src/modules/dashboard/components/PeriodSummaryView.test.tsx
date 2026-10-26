import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEMO_TODAY, DEMO_EMPTY_TODAY, DEMO_IDS } from '../dev/fixtures.ts';
import { PeriodSummaryView } from './PeriodSummaryView.tsx';
import { salesCount, unitsCount } from './counts.ts';

describe('cifras del período (RF-3, RF-4, RF-5, RNF-1)', () => {
  it('muestra las cifras recibidas sin calcularlas', () => {
    render(<PeriodSummaryView summary={DEMO_TODAY} emptyMessage="Todavía no hay ventas hoy" />);
    for (const text of [
      'Bs 45,50',
      '2 ventas',
      'Bs 22,75',
      'Efectivo: Bs 25,00 · 1 venta',
      'QR: Bs 20,50 · 1 venta',
      'Café americano · 3 unidades · Bs 37,50',
      'Empanada · 1 unidad · Bs 8,00',
    ])
      expect(screen.getByText(text)).toBeVisible();
    expect(screen.queryByText('Todavía no hay ventas hoy')).not.toBeInTheDocument();
  });
  it('muestra ceros, promedio ausente y aviso sin ventas', () => {
    render(
      <PeriodSummaryView summary={DEMO_EMPTY_TODAY} emptyMessage="Todavía no hay ventas hoy" />,
    );
    expect(screen.getByText('Bs 0,00')).toBeVisible();
    expect(screen.getByText('0 ventas')).toBeVisible();
    expect(screen.getByText('—')).toBeVisible();
    expect(screen.getByText('Todavía no hay ventas hoy')).toBeVisible();
  });
  it('mantiene dos filas para dos productos con el mismo nombre', () => {
    render(
      <PeriodSummaryView
        summary={{
          ...DEMO_TODAY,
          topProducts: [
            { productId: DEMO_IDS.americano, productName: 'Café', quantity: 3, totalCents: 3750 },
            { productId: DEMO_IDS.empanada, productName: 'Café', quantity: 1, totalCents: 800 },
          ],
        }}
        emptyMessage="Vacío"
      />,
    );
    expect(
      within(screen.getByRole('list', { name: 'Productos más vendidos' })).getAllByRole('listitem'),
    ).toHaveLength(2);
  });
  it('elige singular y plural', () => {
    expect([salesCount(0), salesCount(1), salesCount(2), unitsCount(1), unitsCount(3)]).toEqual([
      '0 ventas',
      '1 venta',
      '2 ventas',
      '1 unidad',
      '3 unidades',
    ]);
  });
});
