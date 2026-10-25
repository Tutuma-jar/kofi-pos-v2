import { useState } from 'react';
import {
  HISTORY_SCENARIOS,
  storeHistoryScenario,
  type HistoryDemoClient,
  type HistoryScenarioId,
} from './history-demo-client.ts';

interface ScenarioPickerProps {
  client: HistoryDemoClient;
  onChange?: (scenario: HistoryScenarioId) => void;
}

// Selector de escenarios del cliente simulado del historial. Solo se monta en desarrollo (main.tsx).
export function ScenarioPicker({ client, onChange }: ScenarioPickerProps) {
  const [scenario, setScenario] = useState(client.scenario);

  return (
    <aside
      aria-label="Escenarios de desarrollo del historial de ventas"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 168,
        padding: 8,
        background: '#fff8e1',
        border: '1px solid #e0c060',
        borderRadius: 4,
        font: '12px sans-serif',
      }}
    >
      <label>
        Escenario del historial de ventas{' '}
        <select
          value={scenario}
          onChange={(event) => {
            const next = event.target.value as HistoryScenarioId;
            client.setScenario(next);
            storeHistoryScenario(next);
            setScenario(next);
            onChange?.(next);
          }}
        >
          {Object.entries(HISTORY_SCENARIOS).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
