import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SalesClientProvider } from '../api/SalesClientProvider.tsx';
import { createSalesDemoClient } from '../dev/sales-demo-client.ts';
import { DEMO_IDS, DEMO_MENU } from '../dev/fixtures.ts';
import { useSaleDraft } from './useSaleDraft.ts';

const coffee = DEMO_MENU[0]!.products[0]!;
const tea = DEMO_MENU[0]!.products[1]!;
function mount(client = createSalesDemoClient('loaded')) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SalesClientProvider client={client}>{children}</SalesClientProvider>
  );
  return renderHook(() => useSaleDraft(), { wrapper });
}

describe('venta en preparación (RF-3 a RF-5, RF-9)', () => {
  it('abre vacía y envía las líneas deseadas para agregar, sumar, restar y quitar', async () => {
    const client = createSalesDemoClient('loaded');
    const quote = vi.spyOn(client, 'quote');
    const { result } = mount(client);
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(quote).toHaveBeenCalledWith({ lines: [] });
    expect(result.current.quote?.totalCents).toBe(0);
    await act(() => result.current.addProduct(coffee));
    expect(quote).toHaveBeenLastCalledWith({
      lines: [{ productId: coffee.id, productName: coffee.name, quantity: 1 }],
    });
    await act(() => result.current.addProduct(coffee));
    expect(result.current.quote?.lines).toHaveLength(1);
    expect(result.current.quote?.lines[0]?.quantity).toBe(2);
    await act(() => result.current.increment(coffee.id));
    await act(() => result.current.decrement(coffee.id));
    expect(quote).toHaveBeenLastCalledWith({
      lines: [
        { productId: coffee.id, productName: coffee.name, quantity: 2, unitPriceCents: 1250 },
      ],
    });
    await act(() => result.current.addProduct(tea));
    expect(result.current.quote?.lines.map((l) => l.productId)).toEqual([coffee.id, tea.id]);
    await act(() => result.current.remove(coffee.id));
    const calls = quote.mock.calls.length;
    await act(() => result.current.decrement(tea.id));
    expect(quote).toHaveBeenCalledTimes(calls);
    await act(() => result.current.remove(tea.id));
    expect(result.current.quote?.totalCents).toBe(0);
  });
  it('bloquea otro cambio hasta recibir el cálculo', async () => {
    const client = createSalesDemoClient('loaded');
    const { result } = mount(client);
    await waitFor(() => expect(result.current.busy).toBe(false));
    const real = client.quote;
    let release!: () => void;
    vi.spyOn(client, 'quote').mockImplementation(async (request) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return real(request);
    });
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.addProduct(coffee);
      void result.current.addProduct(tea);
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.quote?.lines.map((l) => l.productId)).toEqual([coffee.id]);
  });
  it('muestra el límite de 99 y conserva la venta si falla la conexión', async () => {
    const client = createSalesDemoClient('loaded');
    const { result } = mount(client);
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(() => result.current.addProduct(coffee));
    for (let i = 1; i < 99; i++) await act(() => result.current.increment(coffee.id));
    await act(() => result.current.increment(coffee.id));
    expect(result.current.error).toBe(
      'Una venta puede tener como máximo 99 unidades de cada producto',
    );
    expect(result.current.quote?.lines[0]?.quantity).toBe(99);
    const before = result.current.quote;
    client.setScenario('offline');
    await act(() => result.current.addProduct(tea));
    expect(result.current.error).toBe('No hay conexión. Inténtalo de nuevo');
    expect(result.current.quote).toBe(before);
  });
  it('muestra los avisos recibidos y refresca el menú al cambiar', async () => {
    const client = createSalesDemoClient('loaded');
    const { result } = mount(client);
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(() => result.current.addProduct(coffee));
    const original = client.quote;
    vi.spyOn(client, 'quote').mockImplementation(async (request) => {
      const quote = await original(request);
      return {
        ...quote,
        notices: ['Se quitó “Café americano”: ya no está en el menú'],
        lines: quote.lines.filter((l) => l.productId !== DEMO_IDS.americano),
      };
    });
    await act(() => result.current.addProduct(tea));
    expect(result.current.quote?.notices).toEqual([
      'Se quitó “Café americano”: ya no está en el menú',
    ]);
  });
});
