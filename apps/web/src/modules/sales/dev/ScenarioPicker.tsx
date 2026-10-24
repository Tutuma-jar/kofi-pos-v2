import { useState } from 'react';
import {
  SALES_SCENARIOS,
  storeSalesScenario,
  type SalesDemoClient,
  type SalesScenarioId,
} from './sales-demo-client.ts';

interface ScenarioPickerProps {
  client: SalesDemoClient;
  onChange?: (scenario: SalesScenarioId) => void;
}

// Selector de escenarios del cliente simulado de ventas. Solo se monta en desarrollo (main.tsx).
export function ScenarioPicker({ client, onChange }: ScenarioPickerProps) {
  const [scenario, setScenario] = useState(client.scenario);

  return (
    <aside
      aria-label="Escenarios de desarrollo de ventas"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 88,
        padding: 8,
        background: '#fff8e1',
        border: '1px solid #e0c060',
        borderRadius: 4,
        font: '12px sans-serif',
      }}
    >
      <label>
        Escenario de ventas{' '}
        <select
          value={scenario}
          onChange={(event) => {
            const next = event.target.value as SalesScenarioId;
            client.setScenario(next);
            storeSalesScenario(next);
            setScenario(next);
            onChange?.(next);
          }}
        >
          {Object.entries(SALES_SCENARIOS).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
