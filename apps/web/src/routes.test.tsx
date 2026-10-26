import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import { HISTORY_ROLES } from '@kofi/contracts';
import { describe, expect, it } from 'vitest';
import { AppRoutes, protectedRoutes, publicRoutes } from './routes.tsx';
import { canView, type AuthClient } from './modules/auth/index.ts';
import { ApiFetchError } from './shared/http/api-fetch.ts';
import { MenuClientProvider, httpMenuClient } from './modules/menu/index.ts';
import { SalesClientProvider, httpSalesClient } from './modules/sales/index.ts';
import { DashboardClientProvider, httpDashboardClient } from './modules/dashboard/index.ts';

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
      <MenuClientProvider
        client={{ ...httpMenuClient, getAdminMenu: async () => [], getCurrentMenu: async () => [] }}
      >
        <SalesClientProvider
          client={{
            ...httpSalesClient,
            quote: async () => ({ menu: [], lines: [], totalCents: 0, notices: [] }),
          }}
        >
          <DashboardClientProvider
            client={{
              ...httpDashboardClient,
              today: async () => ({
                date: '2026-10-24',
                asOf: '2026-10-24T15:00:00.000Z',
                totalCents: 0,
                salesCount: 0,
                averageTicketCents: null,
                byPaymentMethod: [
                  { paymentMethod: 'cash', totalCents: 0, salesCount: 0 },
                  { paymentMethod: 'qr', totalCents: 0, salesCount: 0 },
                ],
                topProducts: [],
              }),
            }}
          >
            <AppRoutes client={client} />
          </DashboardClientProvider>
        </SalesClientProvider>
      </MenuClientProvider>
      <CurrentPath />
    </MemoryRouter>,
  );
}

describe('routes', () => {
  it.each(['owner', 'cashier'] as const)('ofrece Ver menú en inicio a %s (RF-13)', async (role) => {
    await renderAt('/', role);
    expect(await screen.findByRole('link', { name: 'Ver menú' })).toHaveAttribute('href', '/menu');
  });
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

  // SPEC-004 Dashboard (plan §3, D-9; RF-1): el resumen de hoy lo ven los dos roles.
  it.each(['owner', 'cashier'] as const)(
    '/resumen muestra el resumen de ventas con una sesión de %s',
    async (role) => {
      await renderAt('/resumen', role);

      expect(await screen.findByRole('heading', { name: 'Resumen de ventas' })).toBeInTheDocument();
      expect(screen.getByLabelText('ruta actual')).toHaveTextContent('/resumen');
    },
  );

  it('/resumen es de los dos roles', () => {
    const route = protectedRoutes.find((r) => r.path === '/resumen');
    expect(route?.roles).toEqual(['owner', 'cashier']);
    expect(route?.homeLink).toBe('Resumen de ventas');
    expect(canView('owner', '/resumen', protectedRoutes)).toBe(true);
    expect(canView('cashier', '/resumen', protectedRoutes)).toBe(true);
  });

  // SPEC-005 Historial (plan §3, D-6, D-7; RF-1): solo los roles de HISTORY_ROLES.
  it.each([
    ['/ventas', 'Historial de ventas'],
    ['/ventas/mes', 'Ventas por mes'],
    ['/ventas/7', 'Detalle de una venta'],
  ])('%s muestra su página del historial con una sesión de dueño', async (path, heading) => {
    await renderAt(path);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByLabelText('ruta actual')).toHaveTextContent(path);
  });

  it('/ventas/nueva sigue mostrando la nueva venta y no el detalle de una venta', async () => {
    await renderAt('/ventas/nueva');

    expect(await screen.findByRole('heading', { name: 'Nueva venta' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Detalle de una venta' })).not.toBeInTheDocument();
  });

  it('las rutas del historial son de HISTORY_ROLES y solo /ventas tiene enlace', () => {
    for (const path of ['/ventas', '/ventas/mes', '/ventas/:numero']) {
      const route = protectedRoutes.find((r) => r.path === path);
      expect(route?.roles).toEqual(HISTORY_ROLES);
      expect(route?.homeLink).toBe(path === '/ventas' ? 'Historial de ventas' : undefined);
    }
    for (const path of ['/ventas', '/ventas/mes', '/ventas/7']) {
      expect(canView('owner', path, protectedRoutes)).toBe(true);
      expect(canView('cashier', path, protectedRoutes)).toBe(false);
    }
  });

  it('las rutas protegidas declaran sus roles y el enlace de la pantalla inicial', () => {
    expect(protectedRoutes.map(({ path, roles, homeLink }) => ({ path, roles, homeLink }))).toEqual(
      [
        { path: '/', roles: ['owner', 'cashier'], homeLink: undefined },
        { path: '/menu/administrar', roles: ['owner'], homeLink: 'Administrar menú' },
        { path: '/menu', roles: ['owner', 'cashier'], homeLink: 'Ver menú' },
        { path: '/ventas/nueva', roles: ['owner', 'cashier'], homeLink: 'Nueva venta' },
        { path: '/resumen', roles: ['owner', 'cashier'], homeLink: 'Resumen de ventas' },
        { path: '/ventas', roles: ['owner'], homeLink: 'Historial de ventas' },
        { path: '/ventas/mes', roles: ['owner'], homeLink: undefined },
        { path: '/ventas/:numero', roles: ['owner'], homeLink: undefined },
      ],
    );
  });
});
