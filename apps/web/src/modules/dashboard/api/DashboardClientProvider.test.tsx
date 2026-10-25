import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { httpDashboardClient, type DashboardClient } from './dashboard-client.ts';
import { DashboardClientProvider, useDashboardClient } from './DashboardClientProvider.tsx';

describe('DashboardClientProvider y useDashboardClient (plan D-8)', () => {
  it('useDashboardClient devuelve el cliente que recibe el proveedor', () => {
    const client = { today: vi.fn(), month: vi.fn() } as DashboardClient;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DashboardClientProvider client={client}>{children}</DashboardClientProvider>
    );

    const { result } = renderHook(() => useDashboardClient(), { wrapper });

    expect(result.current).toBe(client);
  });

  it('también con el cliente real', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <DashboardClientProvider client={httpDashboardClient}>{children}</DashboardClientProvider>
    );

    expect(renderHook(() => useDashboardClient(), { wrapper }).result.current).toBe(
      httpDashboardClient,
    );
  });

  it('fuera de un proveedor falla con un error claro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useDashboardClient())).toThrow(
      'useDashboardClient necesita un DashboardClientProvider',
    );
  });
});
