import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEMO_DAYS } from '../dev/fixtures.ts';
import { SalesList } from './SalesList.tsx';

describe('lista de ventas (RF-3, RF-7, RNF-1)', () => {
  it('muestra hora de Bolivia, nombre y rol histórico, medio e importe en el orden recibido', () => {
    render(<SalesList sales={DEMO_DAYS['2026-10-24']!.sales} />);
    expect(screen.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      'N.º 3 · 10:30 · Luis Mamani · Dueño · QR · Bs 20,50',
      'N.º 2 · 09:15 · Ana Quispe · Cajero · Efectivo · Bs 25,00',
    ]);
  });
  it('no inventa filas si no hay ventas', () => {
    render(<SalesList sales={[]} />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
