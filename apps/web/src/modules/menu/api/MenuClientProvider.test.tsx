import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { httpMenuClient, type MenuClient } from './menu-client.ts';
import { MenuClientProvider, useMenuClient } from './MenuClientProvider.tsx';

describe('MenuClientProvider y useMenuClient (plan D-10)', () => {
  it('useMenuClient devuelve el cliente que recibe el proveedor', () => {
    const client = { getAdminMenu: vi.fn() } as unknown as MenuClient;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MenuClientProvider client={client}>{children}</MenuClientProvider>
    );

    const { result } = renderHook(() => useMenuClient(), { wrapper });

    expect(result.current).toBe(client);
  });

  it('también con el cliente real', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MenuClientProvider client={httpMenuClient}>{children}</MenuClientProvider>
    );

    expect(renderHook(() => useMenuClient(), { wrapper }).result.current).toBe(httpMenuClient);
  });

  it('fuera de un proveedor falla con un error claro', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useMenuClient())).toThrow(
      'useMenuClient necesita un MenuClientProvider',
    );
  });
});
