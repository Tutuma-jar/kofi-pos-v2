import { createContext, useContext, type ReactNode } from 'react';
import type { SalesClient } from './sales-client.ts';

// Cliente de ventas en uso (plan D-10): el real, también en desarrollo, y el simulado solo con
// ?escenarios=ventas. No hay valor por defecto, para que una pantalla fuera del proveedor falle.

const SalesClientContext = createContext<SalesClient | null>(null);

interface SalesClientProviderProps {
  client: SalesClient;
  children: ReactNode;
}

export function SalesClientProvider({ client, children }: SalesClientProviderProps) {
  return <SalesClientContext value={client}>{children}</SalesClientContext>;
}

export function useSalesClient(): SalesClient {
  const client = useContext(SalesClientContext);
  if (!client) throw new Error('useSalesClient necesita un SalesClientProvider');
  return client;
}
