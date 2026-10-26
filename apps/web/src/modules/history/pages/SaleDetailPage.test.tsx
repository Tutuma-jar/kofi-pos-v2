import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { HISTORY_MESSAGES } from '@kofi/contracts';
import { HistoryClientProvider } from '../api/HistoryClientProvider.tsx';
import { createHistoryDemoClient, type HistoryScenarioId } from '../dev/history-demo-client.ts';
import { DayHistoryPage } from './DayHistoryPage.tsx';
import { SaleDetailPage } from './SaleDetailPage.tsx';

function Location() {
  return (
    <output aria-label="ruta actual">
      {useLocation().pathname}
      {useLocation().search}
    </output>
  );
}
function mount(scenario: HistoryScenarioId = 'withSales', path = '/ventas/3') {
  const client = createHistoryDemoClient(scenario);
  render(
    <HistoryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/ventas/:numero" element={<SaleDetailPage />} />
          <Route path="/ventas" element={<DayHistoryPage />} />
        </Routes>
        <Location />
      </MemoryRouter>
    </HistoryClientProvider>,
  );
  return client;
}
async function tabTo(user: ReturnType<typeof userEvent.setup>, element: HTMLElement) {
  for (let index = 0; index < 40; index++) {
    await user.tab();
    if (element === element.ownerDocument.activeElement) return;
  }
  throw new Error('No se alcanzó el control con Tab');
}
describe('pantalla del detalle (RF-5, RF-6, RF-8, RF-9, RF-10, RNF-4)', () => {
  it('muestra la instantánea, busca desde el detalle y vuelve al día recibido', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Venta N.º 3' });
    expect(screen.getByText('Bs 20,50', { exact: true })).toBeVisible();
    expect(screen.queryByText(/^Datos al/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute(
      'href',
      '/ventas?fecha=2026-10-24',
    );
    await userEvent.click(screen.getByRole('link', { name: 'Volver' }));
    await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' });
    await userEvent.click(screen.getByRole('link', { name: /^N.º 3/ }));
    expect(await screen.findByRole('heading', { name: 'Venta N.º 3' })).toBeVisible();
  });
  it('un 404 borra la venta anterior y la búsqueda permite recuperarse', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Venta N.º 3' });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Buscar venta por número'), '99{Enter}');
    expect(await screen.findByRole('alert')).toHaveTextContent('No existe la venta N.º 99');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Volver' })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Buscar venta por número'));
    await user.type(screen.getByLabelText('Buscar venta por número'), ' 002 {Enter}');
    expect(await screen.findByRole('heading', { name: 'Venta N.º 2' })).toBeVisible();
    expect(screen.getByText('Registrada por Ana Quispe · Cajero')).toBeVisible();
  });
  it.each([
    ['offline', 'No hay conexión. Inténtalo de nuevo'],
    ['error', 'Ocurrió un error. Inténtalo de nuevo'],
    ['forbidden', HISTORY_MESSAGES.forbidden],
  ] as const)('muestra %s al abrir sin datos ni momento inventado', async (scenario, message) => {
    mount(scenario);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Datos al/)).not.toBeInTheDocument();
  });
  it.each(['offline', 'error'] as const)(
    'conserva el detalle y su Volver si falla %s al buscar otra venta',
    async (scenario) => {
      const client = mount();
      await screen.findByRole('heading', { name: 'Venta N.º 3' });
      client.setScenario(scenario);
      await userEvent.type(screen.getByLabelText('Buscar venta por número'), '4{Enter}');
      await screen.findByRole('alert');
      expect(screen.getByRole('heading', { name: 'Venta N.º 3' })).toBeVisible();
      expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute(
        'href',
        '/ventas?fecha=2026-10-24',
      );
      client.setScenario('withSales');
      await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
      expect(await screen.findByRole('heading', { name: 'Venta N.º 4' })).toBeVisible();
      expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute(
        'href',
        '/ventas?fecha=2026-10-25',
      );
    },
  );
  it('borra los datos anteriores si se pierde el permiso', async () => {
    const client = mount();
    await screen.findByRole('heading', { name: 'Venta N.º 3' });
    client.setScenario('forbidden');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(HISTORY_MESSAGES.forbidden);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
  it('Lento muestra carga y bloquea Actualizar', async () => {
    mount('slow');
    expect(await screen.findByText('Cargando…')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    expect(
      await screen.findByRole('heading', { name: 'Venta N.º 3' }, { timeout: 3000 }),
    ).toBeVisible();
  });
  it('alcanza búsqueda, Volver y una fila con Tab y los elige con Intro', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Venta N.º 3' });
    const user = userEvent.setup();
    await tabTo(user, screen.getByLabelText('Buscar venta por número'));
    await user.keyboard('2{Enter}');
    await screen.findByRole('heading', { name: 'Venta N.º 2' });
    await tabTo(user, screen.getByRole('link', { name: 'Volver' }));
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' });
    await tabTo(user, screen.getByRole('link', { name: /^N.º 3/ }));
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: 'Venta N.º 3' });
    await tabTo(user, screen.getByRole('button', { name: 'Actualizar' }));
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled());
  });
});
