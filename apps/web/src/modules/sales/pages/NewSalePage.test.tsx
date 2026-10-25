import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { SalesClientProvider } from '../api/SalesClientProvider.tsx';
import { createSalesDemoClient } from '../dev/sales-demo-client.ts';
import { DEMO_IDS } from '../dev/fixtures.ts';
import { NewSalePage } from './NewSalePage.tsx';

function mount(client = createSalesDemoClient('loaded')) {
  render(
    <MemoryRouter>
      <SalesClientProvider client={client}>
        <NewSalePage />
      </SalesClientProvider>
    </MemoryRouter>,
  );
  return client;
}

describe('productos para vender (RF-1, RF-2, RF-3, RNF-4)', () => {
  it('muestra categorías y precios del menú', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'Bebidas calientes' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Salados' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Café americano · Bs 12,50' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Empanada · Bs 8,00' })).toBeVisible();
  });
  it('explica el menú vacío y no permite agregar', async () => {
    mount(createSalesDemoClient('empty'));
    expect(await screen.findByText('El menú todavía no tiene productos para vender')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it.each(['{Enter}', ' '])('agrega un producto con %s', async (key) => {
    const client = createSalesDemoClient('loaded');
    const quote = vi.spyOn(client, 'quote');
    mount(client);
    const user = userEvent.setup();
    const product = await screen.findByRole('button', { name: 'Café americano · Bs 12,50' });
    product.focus();
    await user.keyboard(key);
    await waitFor(() =>
      expect(quote).toHaveBeenLastCalledWith({
        lines: [{ productId: DEMO_IDS.americano, productName: 'Café americano', quantity: 1 }],
      }),
    );
  });
});
