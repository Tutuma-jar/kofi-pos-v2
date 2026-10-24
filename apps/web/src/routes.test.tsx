import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppRoutes, protectedRoutes, publicRoutes } from './routes.tsx';
import type { AuthClient } from './modules/auth/index.ts';
import { ApiFetchError } from './shared/http/api-fetch.ts';

function CurrentPath() {
  return <output aria-label="ruta actual">{useLocation().pathname}</output>;
}

async function renderAt(path: string, role: 'owner' | 'cashier' = 'owner') {
  const user = {
    id: '4c1f2b7e-8d3a-4f5b-9c6d-1e2f3a4b9a2e',
    username: 'ana',
    displayName: 'Ana Quispe',
    role,
  };
  const client: AuthClient = {
    async login() {
      return user;
    },
    async logout() {},
    async getSession() {
      if (path === '/ingresar')
        throw new ApiFetchError(401, {
          code: 'SESSION_MISSING',
          message: 'Inicia sesión para continuar',
        });
      return user;
    },
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes client={client} />
      <CurrentPath />
    </MemoryRouter>,
  );
}

describe('routes', () => {
  it('/ingresar es pública y muestra la página de ingreso', async () => {
    await renderAt('/ingresar');

    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument();
    expect(publicRoutes.map((r) => r.path)).toEqual(['/ingresar']);
  });

  it('/ muestra la pantalla inicial', async () => {
    await renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Kofi POS' })).toBeInTheDocument();
  });

  it('una ruta desconocida lleva a /', async () => {
    await renderAt('/no-existe');

    expect(await screen.findByRole('heading', { name: 'Kofi POS' })).toBeInTheDocument();
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent(/^\/$/);
  });

  it('/ es protegida y declara los dos roles', () => {
    expect(protectedRoutes.find((r) => r.path === '/')?.roles).toEqual(['owner', 'cashier']);
  });

  // SPEC-002 Menú (plan §3, D-8; RF-1, RF-13).
  it('/menu/administrar muestra la administración del menú', async () => {
    await renderAt('/menu/administrar');

    expect(await screen.findByRole('heading', { name: 'Administrar menú' })).toBeInTheDocument();
  });

  it('/menu muestra la consulta del menú', async () => {
    await renderAt('/menu');

    expect(await screen.findByRole('heading', { name: 'Menú' })).toBeInTheDocument();
  });

  // SPEC-003 Ventas (plan §3, D-11; RF-1).
  it.each(['owner', 'cashier'] as const)(
    '/ventas/nueva muestra la nueva venta con una sesión de %s',
    async (role) => {
      await renderAt('/ventas/nueva', role);

      expect(await screen.findByRole('heading', { name: 'Nueva venta' })).toBeInTheDocument();
      expect(screen.getByLabelText('ruta actual')).toHaveTextContent('/ventas/nueva');
    },
  );

  it('las rutas protegidas declaran sus roles y el enlace de la pantalla inicial', () => {
    expect(protectedRoutes.map(({ path, roles, homeLink }) => ({ path, roles, homeLink }))).toEqual(
      [
        { path: '/', roles: ['owner', 'cashier'], homeLink: undefined },
        { path: '/menu/administrar', roles: ['owner'], homeLink: 'Administrar menú' },
        { path: '/menu', roles: ['owner', 'cashier'], homeLink: 'Ver menú' },
        { path: '/ventas/nueva', roles: ['owner', 'cashier'], homeLink: 'Nueva venta' },
      ],
    );
  });
});
