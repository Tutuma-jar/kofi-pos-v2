import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SalesClientProvider } from '../api/SalesClientProvider.tsx';
import { createSalesDemoClient } from '../dev/sales-demo-client.ts';
import { DEMO_IDS, DEMO_MENU } from '../dev/fixtures.ts';
import { NewSalePage } from './NewSalePage.tsx';
import { SessionProvider } from '../../auth/index.ts';

beforeEach(() => localStorage.clear());
const sessionClient = {
  async getSession() {
    return { id: DEMO_IDS.cashier, username: 'ana', displayName: 'Ana', role: 'cashier' as const };
  },
  async login() {
    return this.getSession();
  },
  async logout() {},
};

function mount(client = createSalesDemoClient('loaded')) {
  render(
    <MemoryRouter>
      <SalesClientProvider client={client}>
        <SessionProvider client={sessionClient}>
          <NewSalePage />
        </SessionProvider>
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
    expect(
      within(screen.getByRole('region', { name: 'Productos para vender' })).queryByRole('button'),
    ).not.toBeInTheDocument();
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

describe('registrar la venta (RF-6 a RF-9, RNF-4)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-24T18:05:12Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('conserva la confirmación si el producto que se intentó agregar fue retirado (RF-6)', async () => {
    const client = createSalesDemoClient('loaded');
    const quote = vi.spyOn(client, 'quote');
    mount(client);
    const user = userEvent.setup();
    const coffee = await screen.findByRole('button', { name: 'Café americano · Bs 12,50' });
    await user.click(coffee);
    await user.click(screen.getByLabelText('Efectivo'));
    await user.click(screen.getByRole('button', { name: 'Registrar venta' }));
    const confirmation = 'Venta N.º 1 registrada · Bs 12,50 · Efectivo · 24/10/2026 14:05';
    expect(await screen.findByText(confirmation)).toBeVisible();
    quote.mockResolvedValueOnce({
      lines: [],
      totalCents: 0,
      notices: ['“Café americano” ya no está en el menú'],
      menu: DEMO_MENU.map((category) => ({
        ...category,
        products: category.products.filter((product) => product.id !== DEMO_IDS.americano),
      })),
    });
    await user.click(coffee);
    expect(await screen.findByText('“Café americano” ya no está en el menú')).toBeVisible();
    expect(screen.getByText('Elige los productos de la venta')).toBeVisible();
    expect(screen.getByText(confirmation)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Empanada · Bs 8,00' }));
    expect(screen.getByText('Empanada × 1 · Bs 8,00')).toBeVisible();
    expect(screen.queryByText(confirmation)).not.toBeInTheDocument();
  });
  it.each(['Efectivo', 'QR'])(
    'registra con %s y muestra la confirmación hasta agregar otro producto',
    async (method) => {
      const client = createSalesDemoClient('loaded');
      const register = vi.spyOn(client, 'register');
      mount(client);
      const user = userEvent.setup();
      const product = await screen.findByRole('button', { name: 'Café americano · Bs 12,50' });
      expect(screen.getByRole('button', { name: 'Registrar venta' })).toBeDisabled();
      expect(screen.getByLabelText('Efectivo')).not.toBeChecked();
      expect(screen.getByLabelText('QR')).not.toBeChecked();
      product.focus();
      await user.keyboard('{Enter}');
      expect(screen.getByRole('button', { name: 'Registrar venta' })).toBeDisabled();
      screen.getByLabelText(method).focus();
      await user.keyboard(' ');
      const button = screen.getByRole('button', { name: 'Registrar venta' });
      button.focus();
      await user.keyboard('{Enter}');
      expect(
        await screen.findByText(`Venta N.º 1 registrada · Bs 12,50 · ${method} · 24/10/2026 14:05`),
      ).toBeVisible();
      expect(register).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Elige los productos de la venta')).toBeVisible();
      expect(screen.getByLabelText(method)).not.toBeChecked();
      const firstId = register.mock.calls[0]![0].draftId;
      await user.click(product);
      expect(screen.queryByText(/Venta N.º 1 registrada/)).not.toBeInTheDocument();
      await user.click(screen.getByLabelText(method));
      await user.click(button);
      expect(await screen.findByText(/Venta N.º 2 registrada/)).toBeVisible();
      expect(register.mock.calls[1]![0].draftId).not.toBe(firstId);
    },
  );
  it('un doble clic registra una sola vez y bloquea productos y pagos mientras espera', async () => {
    const client = createSalesDemoClient('loaded');
    const real = client.register;
    let release!: () => void;
    const register = vi.spyOn(client, 'register').mockImplementation(async (request) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return real(request);
    });
    mount(client);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Café americano · Bs 12,50' }));
    await user.click(screen.getByLabelText('Efectivo'));
    await user.dblClick(screen.getByRole('button', { name: 'Registrar venta' }));
    expect(register).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('QR')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Café americano · Bs 12,50' })).toBeDisabled();
    release();
    expect(await screen.findByText(/Venta N.º 1 registrada/)).toBeVisible();
  });
  it.each(['priceChanged', 'productRemoved'] as const)(
    'recalcula tras 409 y muestra los avisos: %s',
    async (scenario) => {
      mount(createSalesDemoClient(scenario));
      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: 'Café americano · Bs 12,50' }));
      await user.click(screen.getByLabelText('QR'));
      await user.click(screen.getByRole('button', { name: 'Registrar venta' }));
      expect(
        await screen.findByText('El menú cambió. Revisa la venta antes de registrarla'),
      ).toBeVisible();
      if (scenario === 'priceChanged') {
        expect(
          screen.getByText('Cambió el precio de “Café americano”: ahora cuesta Bs 13,00'),
        ).toBeVisible();
        await user.click(screen.getByRole('button', { name: 'Registrar venta' }));
        expect(await screen.findByText(/Venta N.º 1 registrada · Bs 13,00 · QR/)).toBeVisible();
      } else {
        expect(screen.getByText('Se quitó “Café americano”: ya no está en el menú')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Registrar venta' })).toBeDisabled();
      }
    },
  );
  it('reintenta la respuesta perdida con el mismo draftId y confirma el pago original', async () => {
    const client = createSalesDemoClient('lostResponse');
    const register = vi.spyOn(client, 'register');
    mount(client);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Café americano · Bs 12,50' }));
    await user.click(screen.getByLabelText('Efectivo'));
    await user.click(screen.getByRole('button', { name: 'Registrar venta' }));
    expect(
      await screen.findByText(
        'No hay conexión. Inténtalo de nuevo: la venta no se registrará dos veces',
      ),
    ).toBeVisible();
    expect(screen.getByText('Café americano × 1 · Bs 12,50')).toBeVisible();
    await user.click(screen.getByLabelText('QR'));
    await user.click(screen.getByRole('button', { name: 'Registrar venta' }));
    expect(await screen.findByText(/Venta N.º 1 registrada · Bs 12,50 · Efectivo/)).toBeVisible();
    expect(register.mock.calls[0]![0].draftId).toBe(register.mock.calls[1]![0].draftId);
  });
});
