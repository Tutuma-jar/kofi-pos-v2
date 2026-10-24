import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createDashboardDemoClient } from './dashboard-demo-client.ts';
import { ScenarioPicker } from './ScenarioPicker.tsx';

describe('ScenarioPicker del dashboard', () => {
  it('muestra los cinco escenarios y cambia el del cliente simulado', async () => {
    const client = createDashboardDemoClient('withSales');
    const onChange = vi.fn();
    render(<ScenarioPicker client={client} onChange={onChange} />);

    const select = screen.getByRole('combobox', { name: 'Escenario del resumen de ventas' });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Con ventas',
      'Sin ventas',
      'Sin conexión',
      'Sin permiso',
      'Lento',
    ]);
    expect(select).toHaveValue('withSales');

    await userEvent.selectOptions(select, 'Sin permiso');

    expect(client.scenario).toBe('forbidden');
    expect(onChange).toHaveBeenCalledWith('forbidden');
  });
});
