import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SaleQuote } from '@kofi/contracts';
import { SaleDraftLines } from './SaleDraftLines.tsx';

const quote: SaleQuote = {
  menu: [],
  notices: [],
  totalCents: 3300,
  lines: [
    {
      productId: 'coffee',
      productName: 'Café americano',
      categoryName: 'Bebidas',
      quantity: 2,
      unitPriceCents: 1250,
      subtotalCents: 2500,
    },
    {
      productId: 'empanada',
      productName: 'Empanada',
      categoryName: 'Salados',
      quantity: 1,
      unitPriceCents: 800,
      subtotalCents: 800,
    },
  ],
};
const callbacks = () => ({
  onIncrement: vi.fn(async () => {}),
  onDecrement: vi.fn(async () => {}),
  onRemove: vi.fn(async () => {}),
});

describe('líneas de la venta (RF-3, RF-4, RF-5, RNF-4)', () => {
  it('muestra los importes recibidos, incluso si difieren de un cálculo local', () => {
    render(<SaleDraftLines quote={{ ...quote, totalCents: 3401 }} busy={false} {...callbacks()} />);
    expect(screen.getByText('Café americano × 2 · Bs 25,00')).toBeVisible();
    expect(screen.getByText('Precio unitario: Bs 12,50')).toBeVisible();
    expect(screen.getByText('Empanada × 1 · Bs 8,00')).toBeVisible();
    expect(screen.getByLabelText('Total de la venta')).toHaveTextContent('Bs 34,01');
    expect(screen.getByRole('button', { name: 'Restar Empanada' })).toBeDisabled();
  });
  it('explica la venta vacía y muestra cero', () => {
    render(
      <SaleDraftLines
        quote={{ ...quote, lines: [], totalCents: 0 }}
        busy={false}
        {...callbacks()}
      />,
    );
    expect(screen.getByText('Elige los productos de la venta')).toBeVisible();
    expect(screen.getByLabelText('Total de la venta')).toHaveTextContent('Bs 0,00');
  });
  it('usa sumar, restar y quitar con teclado y bloquea los controles al calcular', async () => {
    const actions = callbacks();
    const view = render(<SaleDraftLines quote={quote} busy={false} {...actions} />);
    const user = userEvent.setup();
    for (const [label, action] of [
      ['Sumar', actions.onIncrement],
      ['Restar', actions.onDecrement],
      ['Quitar', actions.onRemove],
    ] as const) {
      screen.getByRole('button', { name: `${label} Café americano` }).focus();
      await user.keyboard('{Enter}');
      expect(action).toHaveBeenCalledExactlyOnceWith('coffee');
    }
    view.rerender(<SaleDraftLines quote={quote} busy={true} {...actions} />);
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
  it.each([
    'Cambió el precio de “Café americano”: ahora cuesta Bs 13,00',
    'Se quitó “Café americano”: ya no está en el menú',
  ])('mantiene el aviso hasta recibir el siguiente cálculo: %s', (notice) => {
    const actions = callbacks();
    const view = render(
      <SaleDraftLines quote={{ ...quote, notices: [notice] }} busy={false} {...actions} />,
    );
    expect(screen.getByText(notice)).toBeVisible();
    view.rerender(
      <SaleDraftLines quote={{ ...quote, notices: [notice] }} busy={true} {...actions} />,
    );
    expect(screen.getByText(notice)).toBeVisible();
    view.rerender(<SaleDraftLines quote={quote} busy={false} {...actions} />);
    expect(screen.queryByText(notice)).not.toBeInTheDocument();
  });
});
