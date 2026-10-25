import { createContext, useContext, type ReactNode } from 'react';
import type { HistoryClient } from './history-client.ts';

// Cliente del historial en uso (plan D-9): el real, también en desarrollo, y el simulado solo con
// ?escenarios=historial. No hay valor por defecto, para que una pantalla fuera del proveedor falle.

const HistoryClientContext = createContext<HistoryClient | null>(null);

interface HistoryClientProviderProps {
  client: HistoryClient;
  children: ReactNode;
}

export function HistoryClientProvider({ client, children }: HistoryClientProviderProps) {
  return <HistoryClientContext value={client}>{children}</HistoryClientContext>;
}

export function useHistoryClient(): HistoryClient {
  const client = useContext(HistoryClientContext);
  if (!client) throw new Error('useHistoryClient necesita un HistoryClientProvider');
  return client;
}
