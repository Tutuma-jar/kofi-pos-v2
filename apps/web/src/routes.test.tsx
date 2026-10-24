import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppRoutes, protectedRoutes, publicRoutes } from './routes.tsx';
import type { AuthClient } from './modules/auth/index.ts';
import { ApiFetchError } from './shared/http/api-fetch.ts';

function CurrentPath() {
  return <output aria-label="ruta actual">{useLocation().pathname}</output>;
}

async function renderAt(path: string) {
  const user = {
    id: '4c1f2b7e-8d3a-4f5b-9c6d-1e2f3a4b9a2e',
    username: 'ana',
    displayName: 'Ana Quispe',
    role: 'owner' as const,
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
    expect(protectedRoutes.map((r) => [r.path, r.roles])).toEqual([['/', ['owner', 'cashier']]]);
  });
});
