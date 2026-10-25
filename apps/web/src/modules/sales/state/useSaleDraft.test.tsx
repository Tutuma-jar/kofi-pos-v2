import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { SalesClientProvider } from '../api/SalesClientProvider.tsx';
import { createSalesDemoClient } from '../dev/sales-demo-client.ts';
import { DEMO_IDS, DEMO_MENU } from '../dev/fixtures.ts';
import { useSaleDraft } from './useSaleDraft.ts';
import { draftStore, SALE_DRAFT_KEY } from './draft-store.ts';

const coffee = DEMO_MENU[0]!.products[0]!;
const tea = DEMO_MENU[0]!.products[1]!;
beforeEach(() => localStorage.clear());
function mount(client = createSalesDemoClient('loaded'), userId = DEMO_IDS.cashier as string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SalesClientProvider client={client}>{children}</SalesClientProvider>
  );
  return renderHook(() => useSaleDraft(userId), { wrapper });
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

describe('recuperar y sincronizar la venta (RF-12, RF-13)', () => {
  it('empieza vacía con datos inválidos o almacenamiento que lanza errores', async () => {
    localStorage.setItem(SALE_DRAFT_KEY, '{');
    const invalid = mount();
    await waitFor(() => expect(invalid.result.current.busy).toBe(false));
    expect(invalid.result.current.quote?.lines).toEqual([]);
    invalid.unmount();
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('no disponible');
    });
    try {
      const unavailable = mount();
      await waitFor(() => expect(unavailable.result.current.busy).toBe(false));
      expect(unavailable.result.current.quote?.lines).toEqual([]);
      expect(unavailable.result.current.paymentMethod).toBeNull();
    } finally {
      get.mockRestore();
    }
  });
  it('recupera identificador, líneas y pago y recalcula al volver a montar', async () => {
    const client = createSalesDemoClient('loaded');
    const first = mount(client);
    await waitFor(() => expect(first.result.current.busy).toBe(false));
    await act(() => first.result.current.addProduct(coffee));
    act(() => first.result.current.choosePayment('qr'));
    const stored = draftStore.load(DEMO_IDS.cashier)!;
    first.unmount();
    const quote = vi.spyOn(client, 'quote');
    const register = vi.spyOn(client, 'register');
    const second = mount(client);
    await waitFor(() => expect(second.result.current.busy).toBe(false));
    expect(quote).toHaveBeenLastCalledWith({ lines: stored.lines });
    expect(second.result.current.quote?.totalCents).toBe(1250);
    expect(second.result.current.paymentMethod).toBe('qr');
    await act(() => second.result.current.registerSale());
    expect(register.mock.calls[0]![0].draftId).toBe(stored.draftId);
    expect(draftStore.load(DEMO_IDS.cashier)).toBeNull();
  });
  it('otra cuenta empieza vacía y descarta la preparación anterior', async () => {
    draftStore.save({
      userId: DEMO_IDS.cashier,
      draftId: crypto.randomUUID(),
      paymentMethod: 'cash',
      lines: [
        { productId: coffee.id, productName: coffee.name, quantity: 1, unitPriceCents: 1250 },
      ],
    });
    const { result } = mount(createSalesDemoClient('loaded'), crypto.randomUUID());
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.quote?.lines).toEqual([]);
    expect(result.current.paymentMethod).toBeNull();
    expect(draftStore.load(DEMO_IDS.cashier)).toBeNull();
  });
  it('refleja cambios y el registro de otra pestaña sin crear un ciclo de eventos', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.busy).toBe(false));
    const stored = {
      userId: DEMO_IDS.cashier,
      draftId: crypto.randomUUID(),
      paymentMethod: 'qr' as const,
      lines: [
        { productId: coffee.id, productName: coffee.name, quantity: 2, unitPriceCents: 1250 },
      ],
    };
    act(() => {
      draftStore.save(stored);
      window.dispatchEvent(new StorageEvent('storage', { key: SALE_DRAFT_KEY }));
    });
    await waitFor(() => expect(result.current.quote?.totalCents).toBe(2500));
    expect(result.current.paymentMethod).toBe('qr');
    act(() => {
      draftStore.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: SALE_DRAFT_KEY }));
    });
    await waitFor(() => expect(result.current.quote?.lines).toEqual([]));
    expect(result.current.paymentMethod).toBeNull();
    expect(localStorage.getItem(SALE_DRAFT_KEY)).toBeNull();
  });
  it('descartar borra el borrador sin registrar', async () => {
    const client = createSalesDemoClient('loaded');
    const register = vi.spyOn(client, 'register');
    const { result } = mount(client);
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(() => result.current.addProduct(coffee));
    act(() => result.current.choosePayment('cash'));
    act(() => result.current.discard());
    expect(draftStore.load(DEMO_IDS.cashier)).toBeNull();
    expect(result.current.quote?.lines).toEqual([]);
    expect(result.current.paymentMethod).toBeNull();
    expect(register).not.toHaveBeenCalled();
  });
  it('una respuesta tardía no repone un borrador descartado por otra pestaña', async () => {
    const client = createSalesDemoClient('loaded');
    const { result } = mount(client);
    await waitFor(() => expect(result.current.busy).toBe(false));
    const real = client.quote;
    let release!: () => void;
    vi.spyOn(client, 'quote').mockImplementationOnce(async (request) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return real(request);
    });
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.addProduct(coffee);
    });
    act(() => {
      draftStore.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: SALE_DRAFT_KEY }));
    });
    await waitFor(() => expect(result.current.busy).toBe(false));
    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.quote?.lines).toEqual([]);
    expect(draftStore.load(DEMO_IDS.cashier)).toBeNull();
  });
  it('no vuelve a guardar una respuesta que llega después de salir de la pantalla', async () => {
    const client = createSalesDemoClient('loaded');
    const view = mount(client);
    await waitFor(() => expect(view.result.current.busy).toBe(false));
    const real = client.quote;
    let release!: () => void;
    vi.spyOn(client, 'quote').mockImplementationOnce(async (request) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return real(request);
    });
    let pending!: Promise<void>;
    act(() => {
      pending = view.result.current.addProduct(coffee);
    });
    view.unmount();
    draftStore.clear();
    await act(async () => {
      release();
      await pending;
    });
    expect(draftStore.load(DEMO_IDS.cashier)).toBeNull();
  });
});
