import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { describe, it, expect, vi } from 'vitest';
import { HISTORY_MESSAGES } from '@kofi/contracts';
import { HistoryClientProvider } from '../api/HistoryClientProvider.tsx';
import { createHistoryDemoClient, type HistoryScenarioId } from '../dev/history-demo-client.ts';
import { DEMO_MONTHS } from '../dev/fixtures.ts';
import { MonthHistoryPage } from './MonthHistoryPage.tsx';

function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="consulta actual">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => void navigate(-1)}>Atrás del navegador</button>
    </>
  );
}
function mount(scenario: HistoryScenarioId = 'withSales', path = '/ventas/mes?mes=2026-10') {
  const client = createHistoryDemoClient(scenario);
  render(
    <MemoryRouter initialEntries={[path]}>
      <HistoryClientProvider client={client}>
        <MonthHistoryPage />
        <Location />
      </HistoryClientProvider>
    </MemoryRouter>,
  );
  return client;
}

describe('pantalla mensual (T025, RF-5, RF-6, RF-9, RF-11 a RF-13, RNF-4)', () => {
  it('muestra cifras y días del contrato sin hacer cuentas', async () => {
    const client = mount();
    await screen.findByRole('heading', { name: 'Octubre de 2026' });
    for (const text of [
      'Bs 70,50',
      '4 ventas',
      'Efectivo: Bs 37,50 · 2 ventas',
      'QR: Bs 33,00 · 2 ventas',
    ])
      expect(screen.getByText(text, { exact: true })).toBeVisible();
    expect(screen.getAllByRole('row')).toHaveLength(26);
    expect(screen.getByRole('link', { name: '24/10/2026 · Bs 45,50 · 2 ventas' })).toHaveAttribute(
      'href',
      '/ventas?fecha=2026-10-24',
    );
    expect(screen.getByRole('link', { name: '01/10/2026 · Bs 0,00 · 0 ventas' })).toBeVisible();
    expect(screen.getByLabelText('Mes')).toHaveAttribute('min', '0001-01');
    expect(screen.getByLabelText('Mes')).toHaveAttribute('max', '2026-10');
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
    vi.spyOn(client, 'month').mockResolvedValue({
      ...DEMO_MONTHS['2026-10']!,
      totalCents: 9999,
      asOf: '2026-10-25T15:00:00Z',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByText('Bs 99,99', { exact: true })).toBeVisible();
    expect(screen.getByText('Datos al 25/10/2026 11:00')).toBeVisible();
  });
  it('muestra el mes vacío con sus días y ambos medios en cero', async () => {
    mount('empty', '/ventas/mes?mes=2026-09');
    await screen.findByRole('heading', { name: 'Septiembre de 2026' });
    expect(screen.getByText(HISTORY_MESSAGES.emptyMonth)).toBeVisible();
    for (const text of [
      'Bs 0,00',
      '0 ventas',
      'Efectivo: Bs 0,00 · 0 ventas',
      'QR: Bs 0,00 · 0 ventas',
    ])
      expect(screen.getByText(text, { exact: true })).toBeVisible();
    expect(screen.getAllByRole('row')).toHaveLength(31);
    expect(screen.getByRole('link', { name: '30/09/2026 · Bs 0,00 · 0 ventas' })).toBeVisible();
  });
  it('navega por meses y campo, conserva parámetros y permite volver atrás', async () => {
    mount('withSales', '/ventas/mes?escenarios=historial&mes=2026-10');
    await screen.findByRole('heading', { name: 'Octubre de 2026' });
    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    await screen.findByRole('heading', { name: 'Septiembre de 2026' });
    expect(screen.getByLabelText('consulta actual')).toHaveTextContent(
      'escenarios=historial&mes=2026-09',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    await screen.findByRole('heading', { name: 'Octubre de 2026' });
    fireEvent.change(screen.getByLabelText('Mes'), { target: { value: '2026-08' } });
    await screen.findByRole('heading', { name: 'Agosto de 2026' });
    await userEvent.click(screen.getByRole('button', { name: 'Atrás del navegador' }));
    expect(await screen.findByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  });
  it('el primer mes no retrocede y mantiene las cuatro cifras al avanzar', async () => {
    mount('withSales', '/ventas/mes?mes=0001-01');
    await screen.findByRole('heading', { name: 'Enero de 0001' });
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    expect(screen.getByLabelText('Mes')).toHaveValue('0001-01');
    expect(screen.getAllByRole('row')).toHaveLength(32);
    await userEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(await screen.findByRole('heading', { name: 'Febrero de 0001' })).toBeVisible();
  });
  it.each([
    ['2026-11', HISTORY_MESSAGES.futureMonth],
    ['2026-13', HISTORY_MESSAGES.invalidMonth],
    ['0000-01', HISTORY_MESSAGES.invalidMonth],
  ])('rechaza la URL con %s sin cifras', async (month, message) => {
    mount('withSales', '/ventas/mes?mes=' + month);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Total vendido')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Datos al/)).not.toBeInTheDocument();
  });
  it.each([
    ['offline', 'No hay conexión. Inténtalo de nuevo'],
    ['error', 'Ocurrió un error. Inténtalo de nuevo'],
    ['forbidden', HISTORY_MESSAGES.forbidden],
  ] as const)('muestra %s y permite reintentar', async (scenario, message) => {
    const client = mount(scenario);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    client.setScenario('withSales');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  });
  it.each(['offline', 'error'] as const)(
    'conserva título, cifras y momento al fallar %s en otro mes',
    async (scenario) => {
      const client = mount();
      await screen.findByRole('heading', { name: 'Octubre de 2026' });
      const asOf = screen.getByText(/^Datos al/).textContent;
      client.setScenario(scenario);
      await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
      await screen.findByRole('alert');
      expect(screen.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
      expect(screen.getByText('Bs 70,50', { exact: true })).toBeVisible();
      expect(screen.getByText(/^Datos al/)).toHaveTextContent(asOf!);
      client.setScenario('withSales');
      await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
      expect(await screen.findByRole('heading', { name: 'Septiembre de 2026' })).toBeVisible();
    },
  );
  it('borra cifras previas si llega un rechazo de permisos al actualizar', async () => {
    const client = mount();
    await screen.findByRole('heading', { name: 'Octubre de 2026' });
    client.setScenario('forbidden');
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await screen.findByRole('alert');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Bs 70,50', { exact: true })).not.toBeInTheDocument();
  });
  it('mantiene los datos mientras carga y bloquea Actualizar', async () => {
    const client = mount();
    await screen.findByRole('heading', { name: 'Octubre de 2026' });
    client.setScenario('slow');
    await userEvent.click(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(await screen.findByText('Cargando…')).toHaveAttribute('role', 'status');
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: 'Septiembre de 2026' }, { timeout: 3000 }),
    ).toBeVisible();
  });
  it('fija el mes inicial y lo conserva al actualizar después del cambio de mes', async () => {
    const client = mount('withSales', '/ventas/mes');
    await screen.findByRole('heading', { name: 'Octubre de 2026' });
    await waitFor(() =>
      expect(screen.getByLabelText('consulta actual')).toHaveTextContent('mes=2026-10'),
    );
    await waitFor(() => expect(screen.getByRole('button', { name: 'Actualizar' })).toBeEnabled());
    const month = vi.spyOn(client, 'month').mockResolvedValue({
      ...DEMO_MONTHS['2026-10']!,
      currentMonth: '2026-11',
      nextMonth: '2026-11',
    });
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeEnabled(),
    );
    expect(month).toHaveBeenCalledWith('2026-10');
    expect(screen.getByRole('heading', { name: 'Octubre de 2026' })).toBeVisible();
  });
  it('ofrece Ver por día, búsqueda y filas alcanzables con Tab y elegibles con Intro', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Octubre de 2026' });
    expect(screen.getByRole('link', { name: 'Ver por día' })).toHaveAttribute('href', '/ventas');
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Buscar venta por número')).toHaveFocus();
    await user.type(screen.getByLabelText('Buscar venta por número'), '007{Enter}');
    expect(screen.getByLabelText('consulta actual')).toHaveTextContent('/ventas/7');
  });
  it('alcanza Mes anterior, Mes siguiente, campo y fila con Tab y abre la fila con Intro', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Octubre de 2026' });
    const user = userEvent.setup();
    for (let i = 0; i < 5; i++) await user.tab();
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await screen.findByRole('heading', { name: 'Septiembre de 2026' });
    await user.tab();
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Mes')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: '01/09/2026 · Bs 0,00 · 0 ventas' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('consulta actual')).toHaveTextContent('/ventas?fecha=2026-09-01');
  });
});
