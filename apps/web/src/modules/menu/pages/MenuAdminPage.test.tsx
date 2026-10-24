import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { userEvent } from '@testing-library/user-event';
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
  it('confirma el guardado y recarga la lista al crear una categoría', async () => {
    mount('empty');
    await userEvent.click(await screen.findByRole('button', { name: 'Crear categoría' }));
    await userEvent.keyboard('Bebidas{Enter}');
    expect(await screen.findByText('Cambios guardados')).toHaveAttribute('role', 'status');
    expect(await screen.findByRole('heading', { name: 'Bebidas' })).toBeVisible();
    expect(screen.queryByLabelText('Nombre de la categoría')).not.toBeInTheDocument();
  });
  it.each(['categoría', 'producto'])(
    'conserva lo escrito y avisa de la falta de conexión al guardar %s',
    async (entity) => {
      const client = mount();
      await userEvent.click(await screen.findByRole('button', { name: `Crear ${entity}` }));
      await userEvent.type(
        screen.getByLabelText(
          entity === 'categoría' ? 'Nombre de la categoría' : 'Nombre del producto',
        ),
        'Chocolate',
      );
      client.setScenario('offline');
      await userEvent.click(screen.getByRole('button', { name: `Guardar ${entity}` }));
      expect(
        await screen.findByText('No hay conexión. Los cambios no se guardaron'),
      ).toHaveAttribute('role', 'alert');
      expect(
        screen.getByLabelText(
          entity === 'categoría' ? 'Nombre de la categoría' : 'Nombre del producto',
        ),
      ).toHaveValue('Chocolate');
      expect(screen.queryByText('Cambios guardados')).not.toBeInTheDocument();
    },
  );
  it('vuelve al inicio también si el permiso se pierde al guardar', async () => {
    const client = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Crear categoría' }));
    client.setScenario('forbidden');
    await userEvent.keyboard('Bebidas{Enter}');
    expect(await screen.findByText('No tienes permiso para administrar el menú')).toHaveAttribute(
      'role',
      'status',
    );
  });
  it('desactiva y reactiva un producto con confirmación de guardado (RF-7, RF-9)', async () => {
    mount();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Desactivar producto Café americano' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Reactivar producto Café americano' }),
    ).toBeVisible();
    expect(screen.getByText('Cambios guardados')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Reactivar producto Café americano' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Desactivar producto Café americano' }),
    ).toBeVisible();
  });
  it('reactiva y desactiva una categoría conservando sus productos (RF-10)', async () => {
    mount();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Reactivar categoría Temporada' }),
    );
    expect(
      await screen.findByRole('button', { name: 'Desactivar categoría Temporada' }),
    ).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Temporada' })).getByText('Inactivo'),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar categoría Temporada' }));
    expect(
      await screen.findByRole('button', { name: 'Reactivar categoría Temporada' }),
    ).toBeVisible();
    expect(screen.getByText('Cambios guardados')).toBeVisible();
  });
  it('muestra el conflicto junto a la categoría y no ofrece eliminar (RF-10, RF-12)', async () => {
    mount('categoryHasActiveProducts');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Desactivar categoría Bebidas calientes' }),
    );
    expect(
      await within(screen.getByRole('region', { name: 'Bebidas calientes' })).findByRole('alert'),
    ).toHaveTextContent('Esta categoría tiene 2 productos activos');
    expect(screen.queryByRole('button', { name: /eliminar|borrar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /eliminar|borrar/i })).not.toBeInTheDocument();
  });
  it('avisa de la conexión al fallar una acción sin cambiar su estado (RF-7)', async () => {
    const client = mount();
    const button = await screen.findByRole('button', {
      name: 'Desactivar producto Café americano',
    });
    client.setScenario('offline');
    await userEvent.click(button);
    expect(await screen.findByText('No hay conexión. Los cambios no se guardaron')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Desactivar producto Café americano' }),
    ).toBeVisible();
  });
});
