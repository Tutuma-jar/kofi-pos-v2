import { act, render, screen, waitFor } from '@testing-library/react';
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

function mount(scenario: DashboardScenarioId = 'withSales') {
  const client = createDashboardDemoClient(scenario);
  render(
    <MemoryRouter>
      <DashboardClientProvider client={client}>
        <DashboardPage />
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
    expect(screen.getByText('0 ventas')).toBeVisible();
  });
  it.each([
    ['offline', 'No hay conexión. Inténtalo de nuevo'],
    ['error', 'Ocurrió un error. Inténtalo de nuevo'],
  ] as const)('muestra %s al abrir y permite reintentar', async (scenario, message) => {
    const client = mount(scenario);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    client.setScenario('withSales');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByText('Bs 45,50')).toBeVisible();
    client.setScenario(scenario);
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByText('Bs 45,50')).toBeVisible();
  });
  it('sin permiso del mes muestra hoy', async () => {
    mount('forbidden');
    expect(await screen.findByText('Bs 45,50')).toBeVisible();
  });
  it('muestra carga, deshabilita Actualizar y permite Tab e Intro', async () => {
    const client = mount('slow');
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    await screen.findByText('Bs 45,50', {}, { timeout: 3000 });
    const today = vi.spyOn(client, 'today');
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Bs 45,50')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1550));
    });
    await waitFor(() => expect(today).toHaveBeenCalledOnce());
  });
});
