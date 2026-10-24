import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { createAuthDemoClient } from './auth-demo-client.ts';
import { ScenarioPicker } from './ScenarioPicker.tsx';

describe('ScenarioPicker', () => {
  it('muestra los siete escenarios y cambia el del cliente simulado', async () => {
    const client = createAuthDemoClient('owner');
    render(<ScenarioPicker client={client} />);

    const select = screen.getByRole('combobox', { name: 'Escenario de acceso' });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Dueño',
      'Cajero',
      'Credenciales incorrectas',
      'Cuenta bloqueada',
      'Sin conexión',
      'Sesión vencida',
      'Sesión terminada',
    ]);
    expect(select).toHaveValue('owner');

    await userEvent.selectOptions(select, 'Sesión vencida');

    expect(client.scenario).toBe('sessionExpired');
  });
});
