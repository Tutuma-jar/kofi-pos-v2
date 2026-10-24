import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { MenuClientProvider } from '../api/MenuClientProvider.tsx';
import { createMenuDemoClient, type MenuScenarioId } from '../dev/menu-demo-client.ts';
import { MenuAdminPage } from './MenuAdminPage.tsx';

function HomeNotice() {
  return <p role="status">{(useLocation().state as { notice: string }).notice}</p>;
}
function mount(scenario: MenuScenarioId = 'loaded') {
  const client = createMenuDemoClient(scenario);
  const getMenu = client.getAdminMenu.bind(client);
  if (scenario === 'loaded')
    vi.spyOn(client, 'getAdminMenu').mockImplementation(async () => [
      ...(await getMenu()),
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Sin estrenar',
        active: true,
        products: [],
      },
    ]);
  render(
    <MemoryRouter initialEntries={['/menu/administrar']}>
      <MenuClientProvider client={client}>
        <Routes>
          <Route path="/menu/administrar" element={<MenuAdminPage />} />
          <Route path="/" element={<HomeNotice />} />
        </Routes>
      </MenuClientProvider>
    </MemoryRouter>,
  );
  return client;
}

describe('administración del menú (RF-1, RF-2)', () => {
  it('muestra categorías, productos, precios exactos y etiquetas de inactivos', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: 'Bebidas calientes' })).toBeVisible();
    expect(screen.getByText('Café americano')).toBeVisible();
    expect(screen.getByText('Bs 12,50')).toBeVisible();
    expect(screen.getByText('Inactiva')).toBeVisible();
    expect(screen.getByText('Inactivo')).toBeVisible();
    expect(screen.getByText('Sin productos')).toBeVisible();
  });
  it('invita a cargar el menú vacío', async () => {
    mount('empty');
    expect(await screen.findByText('Todavía no hay categorías. Crea la primera')).toBeVisible();
  });
  it('vuelve al inicio con el mensaje de la API al recibir 403', async () => {
    mount('forbidden');
    expect(await screen.findByText('No tienes permiso para administrar el menú')).toHaveAttribute(
      'role',
      'status',
    );
    expect(screen.queryByRole('heading', { name: 'Administrar menú' })).not.toBeInTheDocument();
  });
});
