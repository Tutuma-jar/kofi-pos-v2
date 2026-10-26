import { act, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SessionProvider, useSession } from '../../auth/index.ts';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { DashboardClientProvider } from '../api/DashboardClientProvider.tsx';
import {
  createDashboardDemoClient,
  type DashboardScenarioId,
} from '../dev/dashboard-demo-client.ts';
import { DEMO_TODAY } from '../dev/fixtures.ts';
import { DashboardPage } from './DashboardPage.tsx';

function Ready({ children }: { children: ReactNode }) {
  const { user } = useSession();
  return user ? children : null;
}
function mount(scenario: DashboardScenarioId = 'withSales', role: 'owner' | 'cashier' = 'owner') {
  const client = createDashboardDemoClient(scenario);
  const user = {
    id: '4c1f2b7e-8d3a-4f5b-9c6d-1e2f3a4b9a2e',
    username: 'ana',
    displayName: 'Ana',
    role,
  };
  const auth = { getSession: async () => user, login: async () => user, logout: async () => {} };
  render(
    <MemoryRouter>
      <DashboardClientProvider client={client}>
        <SessionProvider client={auth}>
          <Ready>
            <DashboardPage />
          </Ready>
        </SessionProvider>
      </DashboardClientProvider>
    </MemoryRouter>,
  );
  return client;
}
describe('pantalla de resumen de hoy (RF-1, RF-2, RF-5, RF-6, RF-7, RNF-4)', () => {
  it('muestra fecha, momento de los datos e importes tal como llegan', async () => {
    const client = mount();
    await screen.findByRole('heading', { name: 'Hoy · 24/10/2026' });
    const summary = {
      ...DEMO_TODAY,
      asOf: '2026-10-24T15:00:00.000Z',
      totalCents: 9999,
      averageTicketCents: 1234,
    };
    vi.spyOn(client, 'today').mockResolvedValue(summary);
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(screen.getByText('Bs 99,99')).toBeVisible();
    expect(screen.getByText('Bs 12,34')).toBeVisible();
    expect(screen.getByText('Datos al 24/10/2026 11:00')).toBeVisible();
  });
  it('muestra el período vacío', async () => {
    mount('empty');
    expect(await screen.findByText('Todavía no hay ventas hoy')).toBeVisible();
    expect(
      within(screen.getByRole('region', { name: 'Hoy · 24/10/2026' })).getByText('0 ventas'),
    ).toBeVisible();
  });
  it.each([
    ['offline', 'No hay conexión. Inténtalo de nuevo'],
    ['error', 'Ocurrió un error. Inténtalo de nuevo'],
  ] as const)('muestra %s al abrir y permite reintentar', async (scenario, message) => {
    const client = mount(scenario);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    client.setScenario('withSales');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByRole('region', { name: 'Hoy · 24/10/2026' })).toBeVisible();
    client.setScenario(scenario);
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(
      within(screen.getByRole('region', { name: 'Hoy · 24/10/2026' })).getByText('Bs 45,50'),
    ).toBeVisible();
  });
  it('sin permiso del mes muestra hoy', async () => {
    mount('forbidden');
    expect(await screen.findByRole('region', { name: 'Hoy · 24/10/2026' })).toBeVisible();
  });
  it('muestra carga, deshabilita Actualizar y permite Tab e Intro', async () => {
    const client = mount('slow');
    expect(await screen.findByRole('status')).toHaveTextContent('Cargando…');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    await screen.findByRole('region', { name: 'Hoy · 24/10/2026' }, { timeout: 3000 });
    const today = vi.spyOn(client, 'today');
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(
      within(screen.getByRole('region', { name: 'Hoy · 24/10/2026' })).getByText('Bs 45,50'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1550));
    });
    await waitFor(() => expect(today).toHaveBeenCalledOnce());
  });
  it('muestra el mes después de hoy y sus días recibidos (RF-9, RF-10)', async () => {
    mount();
    const month = await screen.findByRole('region', { name: 'Octubre de 2026' });
    expect(within(month).getByText('Bs 78,50')).toBeVisible();
    const table = within(month).getByRole('table', { name: 'Ventas por día' });
    expect(within(table).getByRole('row', { name: '01/10/2026 Bs 8,00 1 venta' })).toBeVisible();
    expect(within(table).getByRole('row', { name: '02/10/2026 Bs 0,00 0 ventas' })).toBeVisible();
    expect(
      screen.getAllByRole('region').map((region) => region.getAttribute('aria-labelledby')),
    ).toEqual(['today-title', 'month-title']);
  });
  it('muestra el mes vacío', async () => {
    mount('empty');
    expect(await screen.findByText('Todavía no hay ventas este mes')).toBeVisible();
  });
  it('no pide ni muestra el mes al cajero', async () => {
    const client = mount('withSales', 'cashier');
    const month = vi.spyOn(client, 'month');
    await screen.findByRole('region', { name: 'Hoy · 24/10/2026' });
    expect(month).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Octubre de 2026' })).not.toBeInTheDocument();
  });
  it('el 403 del mes retira sus cifras y conserva hoy', async () => {
    const client = mount();
    await screen.findByText('Bs 78,50');
    client.setScenario('forbidden');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para ver el resumen del mes',
    );
    expect(screen.queryByText('Bs 78,50')).not.toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Hoy · 24/10/2026' })).getByText('Bs 45,50'),
    ).toBeVisible();
  });
  it('actualiza los dos en paralelo y conserva ambos ante desconexión', async () => {
    const client = mount();
    await screen.findByText('Bs 78,50');
    const today = vi.spyOn(client, 'today');
    const month = vi.spyOn(client, 'month');
    client.setScenario('slow');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(today).toHaveBeenCalledOnce();
    expect(month).toHaveBeenCalledOnce();
    expect(
      within(screen.getByRole('region', { name: 'Hoy · 24/10/2026' })).getByText('Bs 45,50'),
    ).toBeVisible();
    expect(screen.getByText('Bs 78,50')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled(), {
      timeout: 3000,
    });
    client.setScenario('offline');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión');
    expect(
      within(screen.getByRole('region', { name: 'Hoy · 24/10/2026' })).getByText('Bs 45,50'),
    ).toBeVisible();
    expect(screen.getByText('Bs 78,50')).toBeVisible();
  });
});
