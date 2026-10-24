import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../../shared/http/api-fetch.ts';
import { createAuthDemoClient } from '../dev/auth-demo-client.ts';
import { DEMO_ERRORS, DEMO_USERS } from '../dev/fixtures.ts';
import { returnTo, canView, RETURN_TO_KEY } from '../api/return-to.ts';
import { LoginPage } from '../pages/LoginPage.tsx';
import { SessionProvider } from './SessionProvider.tsx';
import { RequireSession } from './RequireSession.tsx';
import { AuthenticatedLayout } from './AuthenticatedLayout.tsx';

const routes = [
  { path: '/', roles: ['owner', 'cashier'] as const },
  { path: '/privada', roles: ['owner', 'cashier'] as const },
  { path: '/solo-dueno', roles: ['owner'] as const },
];
function Path() {
  return (
    <output aria-label="Ruta">
      {useLocation().pathname}
      {useLocation().search}
      {useLocation().hash}
    </output>
  );
}
function mount(client = createAuthDemoClient('sessionExpired'), path = '/privada?tab=1#detalle') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider client={client}>
        <Path />
        <Routes>
          <Route
            path="/ingresar"
            element={<LoginPage canView={(role, target) => canView(role, target, routes)} />}
          />
          {routes.map(({ path: route }) => (
            <Route
              key={route}
              path={route}
              element={
                <RequireSession>
                  <AuthenticatedLayout>
                    <h1>{route === '/' ? 'Inicio' : 'Pantalla privada'}</h1>
                  </AuthenticatedLayout>
                </RequireSession>
              }
            />
          ))}
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}
async function submit() {
  await userEvent.type(await screen.findByLabelText('Usuario'), 'ana');
  await userEvent.type(screen.getByLabelText('Contraseña'), 'prueba de cafe');
  await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
}
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});
describe('regreso después del vencimiento (RF-11)', () => {
  it('al recargar sin identidad guarda la cuenta de la API y vuelve a la ruta completa tras ingresar', async () => {
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      DEMO_ERRORS.sessionExpired.body.error.message,
    );
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(RETURN_TO_KEY)!)).toEqual({
        userId: DEMO_USERS.owner.id,
        path: '/privada?tab=1#detalle',
      }),
    );
    await submit();
    expect(await screen.findByRole('heading', { name: 'Pantalla privada' })).toBeVisible();
    expect(screen.getByLabelText('Ruta')).toHaveTextContent('/privada?tab=1#detalle');
    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });
  it('con otra cuenta vuelve al inicio y consume el destino', async () => {
    const client = createAuthDemoClient('sessionExpired');
    mount(client);
    await screen.findByRole('alert');
    client.setScenario('cashier');
    await submit();
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeVisible();
    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });
  it.each(['/desconocida', '/solo-dueno'])(
    'la misma cuenta va al inicio si no puede ver %s',
    async (path) => {
      returnTo.save(DEMO_USERS.owner.id, path);
      const client = createAuthDemoClient('owner');
      mount(client, '/ingresar');
      await screen.findByLabelText('Usuario');
      const user = { ...DEMO_USERS.owner, role: 'cashier' as const };
      vi.spyOn(client, 'login').mockResolvedValue(user);
      vi.spyOn(client, 'getSession').mockResolvedValue(user);
      await submit();
      expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeVisible();
      expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
    },
  );
  it('un SESSION_MISSING posterior no borra el regreso pendiente', async () => {
    mount();
    await screen.findByRole('alert');
    await screen.findByLabelText('Usuario');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(DEMO_ERRORS.sessionMissing.body), { status: 401 }),
        ),
    );
    await act(async () => {
      await apiFetch('/api/operation').catch(() => undefined);
    });
    expect(JSON.parse(localStorage.getItem(RETURN_TO_KEY)!)).toMatchObject({
      path: '/privada?tab=1#detalle',
    });
    await submit();
    expect(await screen.findByRole('heading', { name: 'Pantalla privada' })).toBeVisible();
  });
  it('SESSION_TERMINATED borra un regreso anterior', async () => {
    returnTo.save(DEMO_USERS.owner.id, '/privada');
    mount(createAuthDemoClient('sessionTerminated'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      DEMO_ERRORS.sessionTerminated.body.error.message,
    );
    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
    await submit();
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeVisible();
  });
  it('cerrar sesión borra el regreso pendiente', async () => {
    const client = createAuthDemoClient('owner');
    await client.login({ username: 'ana', password: 'prueba de cafe' });
    mount(client);
    await screen.findByRole('heading', { name: 'Pantalla privada' });
    returnTo.save(DEMO_USERS.owner.id, '/privada');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await screen.findByRole('heading', { name: 'Ingresar' });
    expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
  });
  it('el vencimiento en una operación guarda la pantalla actual', async () => {
    const client = createAuthDemoClient('owner');
    await client.login({ username: 'ana', password: 'prueba de cafe' });
    mount(client);
    await screen.findByRole('heading', { name: 'Pantalla privada' });
    client.setScenario('owner');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(DEMO_ERRORS.sessionExpired.body), { status: 401 }),
        ),
    );
    await act(async () => {
      await apiFetch('/api/operation').catch(() => undefined);
    });
    await screen.findByRole('alert');
    expect(JSON.parse(localStorage.getItem(RETURN_TO_KEY)!)).toMatchObject({
      userId: DEMO_USERS.owner.id,
      path: '/privada?tab=1#detalle',
    });
    await submit();
    expect(await screen.findByRole('heading', { name: 'Pantalla privada' })).toBeVisible();
  });
});
