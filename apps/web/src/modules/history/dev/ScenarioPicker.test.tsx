import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createHistoryDemoClient } from './history-demo-client.ts';
import { ScenarioPicker } from './ScenarioPicker.tsx';

describe('ScenarioPicker del historial', () => {
  it('muestra los seis escenarios y cambia el del cliente simulado', async () => {
    const client = createHistoryDemoClient('withSales');
    const onChange = vi.fn();
    render(<ScenarioPicker client={client} onChange={onChange} />);

    const select = screen.getByRole('combobox', { name: 'Escenario del historial de ventas' });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Con ventas',
      'Sin ventas',
      'Sin conexión',
      'Con error',
      'Sin permiso',
      'Lento',
    ]);
    expect(select).toHaveValue('withSales');

    await userEvent.selectOptions(select, 'Sin permiso');

    expect(client.scenario).toBe('forbidden');
    expect(onChange).toHaveBeenCalledWith('forbidden');
  });
});
