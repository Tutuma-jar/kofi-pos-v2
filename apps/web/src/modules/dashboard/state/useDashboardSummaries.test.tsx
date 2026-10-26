import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardClientProvider } from '../api/DashboardClientProvider.tsx';
import { createDashboardDemoClient } from '../dev/dashboard-demo-client.ts';
import { DEMO_TODAY } from '../dev/fixtures.ts';
import { useDashboardSummaries } from './useDashboardSummaries.ts';

describe('estado de resúmenes (RF-1, RF-6, RF-7)', () => {
  it('carga al montar y solo recarga al actualizar, conservando datos durante la carga', async () => {
    const client = createDashboardDemoClient('withSales');
    const today = vi.spyOn(client, 'today');
    const { result, rerender } = renderHook(() => useDashboardSummaries(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <DashboardClientProvider client={client}>{children}</DashboardClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.today?.totalCents).toBe(DEMO_TODAY.totalCents));
    expect(result.current.loading).toBe(false);
    rerender();
    expect(today).toHaveBeenCalledTimes(1);
    client.setScenario('slow');
    let refresh: Promise<void>;
    act(() => {
      refresh = result.current.refresh();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.today?.totalCents).toBe(4550);
    await act(async () => {
      await refresh;
    });
    expect(result.current.loading).toBe(false);
    expect(today).toHaveBeenCalledTimes(2);
  });
  it.each([
    ['offline', 'No hay conexión. Inténtalo de nuevo'],
    ['error', 'Ocurrió un error. Inténtalo de nuevo'],
  ] as const)('conserva datos tras %s y permite recuperar', async (scenario, message) => {
    const client = createDashboardDemoClient('withSales');
    const { result } = renderHook(() => useDashboardSummaries(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <DashboardClientProvider client={client}>{children}</DashboardClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.today).not.toBeNull());
    const before = result.current.today;
    client.setScenario(scenario);
    await act(() => result.current.refresh());
    expect(result.current.error).toBe(message);
    expect(result.current.today).toBe(before);
    client.setScenario('withSales');
    await act(() => result.current.refresh());
    expect(result.current.error).toBeNull();
  });
  it('sin permiso del mes sigue cargando hoy y no consulta el mes en US1', async () => {
    const client = createDashboardDemoClient('forbidden');
    const month = vi.spyOn(client, 'month');
    const { result } = renderHook(() => useDashboardSummaries(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <DashboardClientProvider client={client}>{children}</DashboardClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.today?.salesCount).toBe(2));
    expect(month).not.toHaveBeenCalled();
  });
});
