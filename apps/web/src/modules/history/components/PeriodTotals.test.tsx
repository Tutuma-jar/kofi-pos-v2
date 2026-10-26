import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEMO_DAYS, DEMO_NO_PAYMENTS } from '../dev/fixtures.ts';
import { PeriodTotals } from './PeriodTotals.tsx';

describe('cifras de un período (RF-4, RNF-1)', () => {
  it('muestra el ejemplo y ambos medios en el orden recibido', () => {
    render(<PeriodTotals totals={DEMO_DAYS['2026-10-24']!} />);
    for (const text of [
      'Bs 45,50',
      '2 ventas',
      'Efectivo: Bs 25,00 · 1 venta',
      'QR: Bs 20,50 · 1 venta',
    ])
      expect(screen.getByText(text, { exact: true })).toBeInTheDocument();
    const payments = screen.getAllByText(/^(Efectivo|QR):/);
    expect(payments.map((element) => element.textContent)).toEqual([
      'Efectivo: Bs 25,00 · 1 venta',
      'QR: Bs 20,50 · 1 venta',
    ]);
  });
  it('muestra ceros y ambos medios aunque no haya ventas', () => {
    render(
      <PeriodTotals totals={{ totalCents: 0, salesCount: 0, byPaymentMethod: DEMO_NO_PAYMENTS }} />,
    );
    for (const text of [
      'Bs 0,00',
      '0 ventas',
      'Efectivo: Bs 0,00 · 0 ventas',
      'QR: Bs 0,00 · 0 ventas',
    ])
      expect(screen.getByText(text, { exact: true })).toBeInTheDocument();
  });
  it('muestra el total y el conteo recibidos sin recalcularlos', () => {
    render(
      <PeriodTotals totals={{ ...DEMO_DAYS['2026-10-24']!, totalCents: 12345, salesCount: 1 }} />,
    );
    expect(screen.getByText('Bs 123,45', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('1 venta', { exact: true })).toBeInTheDocument();
  });
});
