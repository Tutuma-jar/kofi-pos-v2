import { useState } from 'react';
import {
  MENU_SCENARIOS,
  storeMenuScenario,
  type MenuDemoClient,
  type MenuScenarioId,
} from './menu-demo-client.ts';

interface ScenarioPickerProps {
  client: MenuDemoClient;
  onChange?: (scenario: MenuScenarioId) => void;
}

// Selector de escenarios del cliente simulado del menú. Solo se monta en desarrollo (main.tsx).
export function ScenarioPicker({ client, onChange }: ScenarioPickerProps) {
  const [scenario, setScenario] = useState(client.scenario);

  return (
    <aside
      aria-label="Escenarios de desarrollo del menú"
      style={{
        position: 'fixed',
        right: 8,
        bottom: 48,
        padding: 8,
        background: '#fff8e1',
        border: '1px solid #e0c060',
        borderRadius: 4,
        font: '12px sans-serif',
      }}
    >
      <label>
        Escenario del menú{' '}
        <select
          value={scenario}
          onChange={(event) => {
            const next = event.target.value as MenuScenarioId;
            client.setScenario(next);
            storeMenuScenario(next);
            setScenario(next);
            onChange?.(next);
          }}
        >
          {Object.entries(MENU_SCENARIOS).map(([id, { label }]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </aside>
  );
}
