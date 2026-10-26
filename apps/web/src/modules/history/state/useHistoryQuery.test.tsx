import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HISTORY_MESSAGES, type DayHistory } from '@kofi/contracts';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { createHistoryDemoClient } from '../dev/history-demo-client.ts';
import { DEMO_DAYS } from '../dev/fixtures.ts';
import { useHistoryQuery } from './useHistoryQuery.ts';

describe('estado de consultas históricas (RF-5, RF-6)', () => {
  it('carga al montar y al cambiar clave, sin recargas por render ni temporizador', async () => {
    const client = createHistoryDemoClient('withSales');
    const day = vi.spyOn(client, 'day');
    const { result, rerender } = renderHook(
      ({ date }) => useHistoryQuery(() => client.day(date), date),
      { initialProps: { date: '2026-10-24' } },
    );
    await waitFor(() => expect(result.current.data?.date).toBe('2026-10-24'));
    rerender({ date: '2026-10-24' });
    expect(day).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    try {
      await act(() => vi.advanceTimersByTimeAsync(60000));
      expect(day).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
    rerender({ date: '2026-10-23' });
    await waitFor(() => expect(result.current.data?.date).toBe('2026-10-23'));
    expect(day).toHaveBeenCalledTimes(2);
  });
  it('conserva datos al actualizar mientras carga y limpia avisos al recuperar', async () => {
    const client = createHistoryDemoClient('withSales');
    const { result } = renderHook(() =>
      useHistoryQuery(() => client.day('2026-10-24'), '2026-10-24'),
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const previous = result.current.data;
    client.setScenario('slow');
    let pending: Promise<void>;
    act(() => {
      pending = result.current.refresh();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(previous);
    await act(async () => {
      await pending;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.notice).toBeNull();
  });
  it.each([
    ['offline', 'No hay conexión. Inténtalo de nuevo'],
    ['error', 'Ocurrió un error. Inténtalo de nuevo'],
  ] as const)('conserva datos tras %s y se recupera con Actualizar', async (scenario, message) => {
    const client = createHistoryDemoClient('withSales');
    const { result } = renderHook(() =>
      useHistoryQuery(() => client.day('2026-10-24'), '2026-10-24'),
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const previous = result.current.data;
    client.setScenario(scenario);
    await act(() => result.current.refresh());
    expect(result.current.data).toBe(previous);
    expect(result.current.notice).toBe(message);
    expect(result.current.rejection).toBeNull();
    client.setScenario('withSales');
    await act(() => result.current.refresh());
    expect(result.current.notice).toBeNull();
  });
  it('borra los datos por fecha futura o sin permiso y muestra el mensaje de la API', async () => {
    const client = createHistoryDemoClient('withSales');
    const { result, rerender } = renderHook(
      ({ date }) => useHistoryQuery(() => client.day(date), date),
      { initialProps: { date: '2026-10-24' } },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    rerender({ date: '2026-10-26' });
    await waitFor(() => expect(result.current.rejection).toBe(HISTORY_MESSAGES.futureDate));
    expect(result.current.data).toBeNull();
    client.setScenario('forbidden');
    await act(() => result.current.refresh());
    expect(result.current.rejection).toBe(HISTORY_MESSAGES.forbidden);
    expect(result.current.data).toBeNull();
  });
  it('borra un detalle anterior cuando la búsqueda responde 404', async () => {
    const client = createHistoryDemoClient('withSales');
    const { result, rerender } = renderHook(
      ({ number }) => useHistoryQuery(() => client.sale(number), number),
      { initialProps: { number: '3' } },
    );
    await waitFor(() => expect(result.current.data).not.toBeNull());
    rerender({ number: '99' });
    await waitFor(() => expect(result.current.rejection).toBe('No existe la venta N.º 99'));
    expect(result.current.data).toBeNull();
  });
  it('ignora respuestas y rechazos atrasados al cambiar la consulta', async () => {
    let resolveOld!: (value: DayHistory) => void;
    const old = new Promise<DayHistory>((resolve) => {
      resolveOld = resolve;
    });
    const load = vi
      .fn<() => Promise<DayHistory>>()
      .mockReturnValueOnce(old)
      .mockResolvedValue(DEMO_DAYS['2026-10-23']!);
    const { result, rerender } = renderHook(({ key }) => useHistoryQuery(load, key), {
      initialProps: { key: 'old' },
    });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    rerender({ key: 'new' });
    await waitFor(() => expect(result.current.data?.date).toBe('2026-10-23'));
    await act(async () => resolveOld(DEMO_DAYS['2026-10-24']!));
    expect(result.current.data?.date).toBe('2026-10-23');
    load.mockRejectedValueOnce(
      new ApiFetchError(400, { code: 'VALIDATION_ERROR', message: HISTORY_MESSAGES.invalidDate }),
    );
    await act(() => result.current.refresh());
    expect(result.current.data).toBeNull();
  });
  it('un error inesperado no expone detalles internos', async () => {
    const { result } = renderHook(() =>
      useHistoryQuery(async () => {
        throw new Error('detalle privado');
      }, 'error'),
    );
    await waitFor(() => expect(result.current.notice).toBe('Ocurrió un error. Inténtalo de nuevo'));
  });
});
