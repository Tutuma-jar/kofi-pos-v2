import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueryStatus } from './QueryStatus.tsx';

describe('estado visible de consulta (RF-5, RF-6)', () => {
  it('muestra el momento en Bolivia y permite actualizar', async () => {
    const refresh = vi.fn();
    render(
      <QueryStatus
        data={{ asOf: '2026-10-25T15:00:00Z' }}
        loading={false}
        notice={null}
        rejection={null}
        refresh={refresh}
      />,
    );
    expect(screen.getByText('Datos al 25/10/2026 11:00')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(refresh).toHaveBeenCalledOnce();
  });
  it('sin asOf no inventa un momento, bloquea Actualizar al cargar y muestra el rechazo', () => {
    render(
      <QueryStatus
        data={null}
        loading
        notice={null}
        rejection="No tienes permiso para ver el historial de ventas"
        refresh={vi.fn()}
      />,
    );
    expect(screen.queryByText(/^Datos al/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando…');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No tienes permiso para ver el historial de ventas',
    );
  });
});
