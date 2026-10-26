import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { HISTORY_MESSAGES } from '@kofi/contracts';
import { HistoryClientProvider } from '../api/HistoryClientProvider.tsx';
import { createHistoryDemoClient, type HistoryScenarioId } from '../dev/history-demo-client.ts';
import { DEMO_DAYS } from '../dev/fixtures.ts';
import { DayHistoryPage } from './DayHistoryPage.tsx';

function Location() {
  const location = useLocation();
  return (
    <output aria-label="consulta actual">
      {location.pathname}
      {location.search}
    </output>
  );
}

function mount(scenario: HistoryScenarioId = 'withSales', path = '/ventas?fecha=2026-10-24') {
  const client = createHistoryDemoClient(scenario);
  render(
    <MemoryRouter initialEntries={[path]}>
      <HistoryClientProvider client={client}>
        <DayHistoryPage />
        <Location />
      </HistoryClientProvider>
    </MemoryRouter>,
  );
  return client;
}

describe('pantalla de ventas del día (RF-1 a RF-6, RNF-4)', () => {
  it('muestra el día, sus ventas y cifras recibidas sin hacer cuentas', async () => {
    const client = mount();
    await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' });
    expect(screen.getByLabelText('Fecha')).toHaveAttribute('max', '2026-10-25');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    vi.spyOn(client, 'day').mockResolvedValue({
      ...DEMO_DAYS['2026-10-24']!,
      totalCents: 9999,
      asOf: '2026-10-25T15:00:00Z',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByText('Bs 99,99', { exact: true })).toBeVisible();
    expect(screen.getByText('Datos al 25/10/2026 11:00')).toBeVisible();
  });
  it('muestra el día vacío con ambos medios en cero', async () => {
    mount('empty');
    expect(await screen.findByText(HISTORY_MESSAGES.emptyDay)).toBeVisible();
    for (const text of [
      'Bs 0,00',
      '0 ventas',
      'Efectivo: Bs 0,00 · 0 ventas',
      'QR: Bs 0,00 · 0 ventas',
    ])
      expect(screen.getByText(text, { exact: true })).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
  it.each([
    ['offline', 'No hay conexión. Inténtalo de nuevo'],
    ['error', 'Ocurrió un error. Inténtalo de nuevo'],
    ['forbidden', HISTORY_MESSAGES.forbidden],
  ] as const)(
    'muestra el escenario %s sin ventas y permite reintentar',
    async (scenario, message) => {
      const client = mount(scenario);
      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
      client.setScenario('withSales');
      await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
      expect(await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' })).toBeVisible();
    },
  );
  it('muestra Cargando y bloquea Actualizar en Lento', async () => {
    mount('slow');
    expect(await screen.findByText('Cargando…')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    expect(
      await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' }, { timeout: 3000 }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled();
  });
  it('navega con fechas recibidas y conserva el selector de escenarios en la URL', async () => {
    mount('withSales', '/ventas?escenarios=historial&fecha=2026-10-24');
    await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' });
    await userEvent.click(screen.getByRole('button', { name: 'Día anterior' }));
    await screen.findByRole('heading', { name: 'Ventas del 23/10/2026' });
    expect(screen.getByLabelText('consulta actual')).toHaveTextContent(
      'escenarios=historial&fecha=2026-10-23',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Día siguiente' }));
    await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' });
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-10-25' } });
    await screen.findByRole('heading', { name: 'Ventas del 25/10/2026' });
    expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeDisabled();
    expect(screen.getByLabelText('consulta actual')).toHaveTextContent('fecha=2026-10-25');
  });
  it.each([
    ['2026-10-26', HISTORY_MESSAGES.futureDate],
    ['2026-02-30', HISTORY_MESSAGES.invalidDate],
  ])('rechaza la URL con %s sin mostrar ventas', async (date, message) => {
    mount('withSales', `/ventas?fecha=${date}`);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Datos al/)).not.toBeInTheDocument();
  });
  it.each(['offline', 'error'] as const)(
    'conserva título y momento propios si falla %s al cambiar de día',
    async (scenario) => {
      const client = mount();
      await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' });
      const asOf = screen.getByText(/^Datos al/).textContent;
      client.setScenario(scenario);
      await userEvent.click(screen.getByRole('button', { name: 'Día anterior' }));
      await screen.findByRole('alert');
      expect(screen.getByRole('heading', { name: 'Ventas del 24/10/2026' })).toBeVisible();
      expect(screen.getByText('Bs 45,50', { exact: true })).toBeVisible();
      expect(screen.getByText(/^Datos al/)).toHaveTextContent(asOf!);
      client.setScenario('withSales');
      await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
      expect(await screen.findByRole('heading', { name: 'Ventas del 23/10/2026' })).toBeVisible();
    },
  );
  it('fija el día inicial en la URL y lo conserva al actualizar tras medianoche', async () => {
    const client = mount('withSales', '/ventas');
    await screen.findByRole('heading', { name: 'Ventas del 25/10/2026' });
    await waitFor(() =>
      expect(screen.getByLabelText('consulta actual')).toHaveTextContent('fecha=2026-10-25'),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled());
    const day = vi.spyOn(client, 'day').mockResolvedValue({
      ...DEMO_DAYS['2026-10-25']!,
      today: '2026-10-26',
      nextDate: '2026-10-26',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeEnabled(),
    );
    expect(day).toHaveBeenCalledWith('2026-10-25');
    expect(screen.getByRole('heading', { name: 'Ventas del 25/10/2026' })).toBeVisible();
  });
  it('alcanza los controles con Tab y navega y actualiza con Intro', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Ventas del 24/10/2026' });
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Día anterior' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: 'Ventas del 23/10/2026' });
    await user.tab();
    expect(screen.getByRole('button', { name: 'Día siguiente' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Fecha')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled());
  });
});
