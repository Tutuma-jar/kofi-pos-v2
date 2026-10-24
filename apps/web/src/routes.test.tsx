import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppRoutes, protectedRoutes, publicRoutes } from './routes.tsx';

function CurrentPath() {
  return <output aria-label="ruta actual">{useLocation().pathname}</output>;
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
      <CurrentPath />
    </MemoryRouter>,
  );
}

describe('routes', () => {
  it('/ingresar es pública y muestra la página de ingreso', () => {
    renderAt('/ingresar');

    expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeInTheDocument();
    expect(publicRoutes.map((r) => r.path)).toEqual(['/ingresar']);
  });

  it('/ muestra la pantalla inicial', () => {
    renderAt('/');

    expect(screen.getByRole('heading', { name: 'Kofi POS' })).toBeInTheDocument();
  });

  it('una ruta desconocida lleva a /', () => {
    renderAt('/no-existe');

    expect(screen.getByLabelText('ruta actual')).toHaveTextContent(/^\/$/);
    expect(screen.getByRole('heading', { name: 'Kofi POS' })).toBeInTheDocument();
  });

  it('/ es protegida y declara los dos roles', () => {
    expect(protectedRoutes.map((r) => [r.path, r.roles])).toEqual([['/', ['owner', 'cashier']]]);
  });
});
