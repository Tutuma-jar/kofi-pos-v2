import { createContext, useContext, type ReactNode } from 'react';
import type { MenuClient } from './menu-client.ts';

// Cliente del menú en uso (plan D-10): el real en producción y el simulado en desarrollo hasta la
// integración de US1. No hay valor por defecto, para que una pantalla fuera del proveedor falle.

const MenuClientContext = createContext<MenuClient | null>(null);

interface MenuClientProviderProps {
  client: MenuClient;
  children: ReactNode;
}

export function MenuClientProvider({ client, children }: MenuClientProviderProps) {
  return <MenuClientContext value={client}>{children}</MenuClientContext>;
}

export function useMenuClient(): MenuClient {
  const client = useContext(MenuClientContext);
  if (!client) throw new Error('useMenuClient necesita un MenuClientProvider');
  return client;
}
