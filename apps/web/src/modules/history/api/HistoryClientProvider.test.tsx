import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { httpHistoryClient, type HistoryClient } from './history-client.ts';
import { HistoryClientProvider, useHistoryClient } from './HistoryClientProvider.tsx';

describe('HistoryClientProvider y useHistoryClient (plan D-9)', () => {
  it('useHistoryClient devuelve el cliente que recibe el proveedor', () => {
    const client = { day: vi.fn(), sale: vi.fn(), month: vi.fn() } as HistoryClient;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <HistoryClientProvider client={client}>{children}</HistoryClientProvider>
    );

    const { result } = renderHook(() => useHistoryClient(), { wrapper });

    expect(result.current).toBe(client);
  });

  it('también con el cliente real', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <HistoryClientProvider client={httpHistoryClient}>{children}</HistoryClientProvider>
    );

    expect(renderHook(() => useHistoryClient(), { wrapper }).result.current).toBe(
      httpHistoryClient,
    );
  });

  it('fuera de un proveedor falla con un error claro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useHistoryClient())).toThrow(
      'useHistoryClient necesita un HistoryClientProvider',
    );
  });
});
