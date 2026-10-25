import { useState } from 'react';
import {
  DASHBOARD_SCENARIOS,
  storeDashboardScenario,
  type DashboardDemoClient,
  type DashboardScenarioId,
} from './dashboard-demo-client.ts';

interface ScenarioPickerProps {
  client: DashboardDemoClient;
  onChange?: (scenario: DashboardScenarioId) => void;
}

// Selector de escenarios del cliente simulado del dashboard. Solo se monta en desarrollo (main.tsx).
export function ScenarioPicker({ client, onChange }: ScenarioPickerProps) {
  const [scenario, setScenario] = useState(client.scenario);

  return (
    <aside
      aria-label="Escenarios de desarrollo del resumen de ventas"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 128,
        padding: 8,
        background: '#fff8e1',
        border: '1px solid #e0c060',
        borderRadius: 4,
        font: '12px sans-serif',
      }}
    >
      <label>
        Escenario del resumen de ventas{' '}
        <select
          value={scenario}
          onChange={(event) => {
            const next = event.target.value as DashboardScenarioId;
            client.setScenario(next);
            storeDashboardScenario(next);
            setScenario(next);
            onChange?.(next);
          }}
        >
          {Object.entries(DASHBOARD_SCENARIOS).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
