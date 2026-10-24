import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createMenuDemoClient } from './menu-demo-client.ts';
import { ScenarioPicker } from './ScenarioPicker.tsx';

describe('ScenarioPicker del menú', () => {
  it('muestra los seis escenarios y cambia el del cliente simulado', async () => {
    const client = createMenuDemoClient('loaded');
    const onChange = vi.fn();
    render(<ScenarioPicker client={client} onChange={onChange} />);

    const select = screen.getByRole('combobox', { name: 'Escenario del menú' });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Menú cargado',
      'Menú vacío',
      'Nombre repetido',
      'Categoría con productos activos',
      'Sin permiso',
      'Sin conexión',
    ]);
    expect(select).toHaveValue('loaded');

    await userEvent.selectOptions(select, 'Sin permiso');

    expect(client.scenario).toBe('forbidden');
    expect(onChange).toHaveBeenCalledWith('forbidden');
  });
});
