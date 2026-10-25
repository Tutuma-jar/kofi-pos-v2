import { createContext, useContext, type ReactNode } from 'react';
import type { DashboardClient } from './dashboard-client.ts';

// Cliente del dashboard en uso (plan D-8): el real, también en desarrollo, y el simulado solo con
// ?escenarios=dashboard. No hay valor por defecto, para que una pantalla fuera del proveedor falle.

const DashboardClientContext = createContext<DashboardClient | null>(null);

interface DashboardClientProviderProps {
  client: DashboardClient;
  children: ReactNode;
}

export function DashboardClientProvider({ client, children }: DashboardClientProviderProps) {
  return <DashboardClientContext value={client}>{children}</DashboardClientContext>;
}

export function useDashboardClient(): DashboardClient {
  const client = useContext(DashboardClientContext);
  if (!client) throw new Error('useDashboardClient necesita un DashboardClientProvider');
  return client;
}
