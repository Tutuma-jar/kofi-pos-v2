import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createSalesDemoClient } from './sales-demo-client.ts';
import { ScenarioPicker } from './ScenarioPicker.tsx';

describe('ScenarioPicker de ventas', () => {
  it('muestra los seis escenarios y cambia el del cliente simulado', async () => {
    const client = createSalesDemoClient('loaded');
    const onChange = vi.fn();
    render(<ScenarioPicker client={client} onChange={onChange} />);

    const select = screen.getByRole('combobox', { name: 'Escenario de ventas' });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Menú cargado',
      'Menú vacío',
      'Cambió un precio',
      'Producto retirado',
      'Sin conexión',
      'Respuesta perdida',
    ]);
    expect(select).toHaveValue('loaded');

    await userEvent.selectOptions(select, 'Respuesta perdida');

    expect(client.scenario).toBe('lostResponse');
    expect(onChange).toHaveBeenCalledWith('lostResponse');
  });
});
