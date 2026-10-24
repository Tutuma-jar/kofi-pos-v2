import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { httpSalesClient, type SalesClient } from './sales-client.ts';
import { SalesClientProvider, useSalesClient } from './SalesClientProvider.tsx';

describe('SalesClientProvider y useSalesClient (plan D-10)', () => {
  it('useSalesClient devuelve el cliente que recibe el proveedor', () => {
    const client = { quote: vi.fn() } as unknown as SalesClient;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SalesClientProvider client={client}>{children}</SalesClientProvider>
    );

    const { result } = renderHook(() => useSalesClient(), { wrapper });

    expect(result.current).toBe(client);
  });

  it('también con el cliente real', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SalesClientProvider client={httpSalesClient}>{children}</SalesClientProvider>
    );

    expect(renderHook(() => useSalesClient(), { wrapper }).result.current).toBe(httpSalesClient);
  });

  it('fuera de un proveedor falla con un error claro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSalesClient())).toThrow(
      'useSalesClient necesita un SalesClientProvider',
    );
  });
});
