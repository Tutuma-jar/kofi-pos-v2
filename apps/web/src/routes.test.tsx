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
    expect(protectedRoutes.find((r) => r.path === '/')?.roles).toEqual(['owner', 'cashier']);
  });

  // SPEC-002 Menú (plan §3, D-8; RF-1, RF-13).
  it('/menu/administrar muestra la administración del menú', () => {
    renderAt('/menu/administrar');

    expect(screen.getByRole('heading', { name: 'Administrar menú' })).toBeInTheDocument();
  });

  it('/menu muestra la consulta del menú', () => {
    renderAt('/menu');

    expect(screen.getByRole('heading', { name: 'Menú' })).toBeInTheDocument();
  });

  it('las rutas protegidas declaran sus roles y el enlace de la pantalla inicial', () => {
    expect(protectedRoutes.map(({ path, roles, homeLink }) => ({ path, roles, homeLink }))).toEqual(
      [
        { path: '/', roles: ['owner', 'cashier'], homeLink: undefined },
        { path: '/menu/administrar', roles: ['owner'], homeLink: 'Administrar menú' },
        { path: '/menu', roles: ['owner', 'cashier'], homeLink: 'Ver menú' },
      ],
    );
  });
});
