import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, it, expect } from 'vitest';
import { MonthDaysTable } from './MonthDaysTable.tsx';

describe('días del mes (T025, RF-13)', () => {
  it('presenta todas las filas recibidas en orden, sin sumar ni omitir ceros', () => {
    render(
      <MemoryRouter>
        <MonthDaysTable
          days={[
            { date: '2026-10-01', totalCents: 9999, salesCount: 2 },
            { date: '2026-10-02', totalCents: 0, salesCount: 0 },
            { date: '2026-10-03', totalCents: 800, salesCount: 1 },
          ]}
        />
      </MemoryRouter>,
    );
    const rows = screen.getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Ventas por día',
      '01/10/2026 · Bs 99,99 · 2 ventas',
      '02/10/2026 · Bs 0,00 · 0 ventas',
      '03/10/2026 · Bs 8,00 · 1 venta',
    ]);
    expect(screen.getByRole('link', { name: '01/10/2026 · Bs 99,99 · 2 ventas' })).toHaveAttribute(
      'href',
      '/ventas?fecha=2026-10-01',
    );
    expect(screen.getByRole('link', { name: '02/10/2026 · Bs 0,00 · 0 ventas' })).toHaveAttribute(
      'href',
      '/ventas?fecha=2026-10-02',
    );
  });
});
