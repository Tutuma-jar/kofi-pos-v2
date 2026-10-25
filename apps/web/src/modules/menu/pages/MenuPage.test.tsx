import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MenuClientProvider } from '../api/MenuClientProvider.tsx';
import { createMenuDemoClient } from '../dev/menu-demo-client.ts';
import { DEMO_PRODUCTS } from '../dev/fixtures.ts';
import { MenuPage } from './MenuPage.tsx';

function mount(client = createMenuDemoClient('loaded')) {
  return render(
    <MemoryRouter>
      <MenuClientProvider client={client}>
        <MenuPage />
      </MenuClientProvider>
    </MemoryRouter>,
  );
}
describe('consulta del menú (RF-13, RF-14)', () => {
  it('muestra solo el menú vigente y sus precios sin controles de edición', async () => {
    mount();
    expect(await screen.findByText('Café americano')).toBeVisible();
    expect(screen.getByText('Bs 12,50')).toBeVisible();
    expect(screen.queryByText('Api con pastel')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Temporada' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('explica que no hay productos disponibles con el menú vacío', async () => {
    mount(createMenuDemoClient('empty'));
    expect(await screen.findByText('El menú todavía no tiene productos disponibles')).toBeVisible();
  });
  it('muestra los cambios al volver a abrir y no actualiza sola la consulta', async () => {
    const client = createMenuDemoClient('loaded');
    const view = mount(client);
    expect(await screen.findByText('Bs 12,50')).toBeVisible();
    const product = DEMO_PRODUCTS[0]!;
    await client.updateProduct(product.id, {
      name: product.name,
      categoryId: product.categoryId,
      price: '13',
    });
    expect(screen.getByText('Bs 12,50')).toBeVisible();
    view.unmount();
    mount(client);
    expect(await screen.findByText('Bs 13,00')).toBeVisible();
  });
});
