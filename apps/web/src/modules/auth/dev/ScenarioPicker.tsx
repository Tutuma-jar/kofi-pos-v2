import { useState } from 'react';
import {
  SCENARIOS,
  storeScenario,
  type AuthDemoClient,
  type ScenarioId,
} from './auth-demo-client.ts';

interface ScenarioPickerProps {
  client: AuthDemoClient;
  onChange?: (scenario: ScenarioId) => void;
}

// Selector de escenarios del cliente simulado. Solo se monta en desarrollo (main.tsx).
export function ScenarioPicker({ client, onChange }: ScenarioPickerProps) {
  const [scenario, setScenario] = useState(client.scenario);

  return (
    <aside
      aria-label="Escenarios de desarrollo"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 8,
        padding: 8,
        background: '#fff8e1',
        border: '1px solid #e0c060',
        borderRadius: 4,
        font: '12px sans-serif',
      }}
    >
      <label>
        Escenario de acceso{' '}
        <select
          value={scenario}
          onChange={(event) => {
            const next = event.target.value as ScenarioId;
            client.setScenario(next);
            storeScenario(next);
            setScenario(next);
            onChange?.(next);
          }}
        >
          {Object.entries(SCENARIOS).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
