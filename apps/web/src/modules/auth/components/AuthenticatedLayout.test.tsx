import { act, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { createAuthDemoClient, type ScenarioId } from '../dev/auth-demo-client.ts';
import { DEMO_ERRORS } from '../dev/fixtures.ts';
import { HomePage } from '../pages/HomePage.tsx';
import { SessionProvider } from './SessionProvider.tsx';
import { RequireSession } from './RequireSession.tsx';
import { AuthenticatedLayout } from './AuthenticatedLayout.tsx';

describe('pantalla inicial y sesión (RF-5, RF-7, RF-8)', () => {
  async function mount(scenario: ScenarioId = 'owner') {
    const client = createAuthDemoClient(scenario);
    await client.login({ username: 'ana', password: 'prueba de cafe' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <SessionProvider client={client}>
          <Routes>
            <Route
              path="/"
              element={
                <RequireSession>
                  <AuthenticatedLayout>
                    <HomePage />
                  </AuthenticatedLayout>
                </RequireSession>
              }
            />
            <Route path="/ingresar" element={<h1>Ingresar</h1>} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: 'Cerrar sesión' });
    return client;
  }
  it.each([
    ['owner', 'Ana Quispe', 'Dueño'],
    ['cashier', 'Luis Mamani', 'Cajero'],
  ] as const)('saluda y muestra identidad para %s', async (scenario, name, role) => {
    await mount(scenario);
    expect(screen.getByText(`Hola, ${name}`)).toBeVisible();
    expect(screen.getByRole('banner')).toHaveTextContent(name);
    expect(screen.getByRole('banner')).toHaveTextContent(role);
    expect(screen.getByRole('heading', { name: 'Kofi POS' })).toBeVisible();
  });
  it('cierra sin confirmación y vuelve al ingreso', async () => {
    const client = await mount();
    const logout = vi.spyOn(client, 'logout');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeVisible();
    expect(screen.queryByText('Hola, Ana Quispe')).not.toBeInTheDocument();
  });
  it('al volver desde la caché oculta el contenido y comprueba de nuevo la sesión', async () => {
    const client = await mount();
    let fail!: (error: unknown) => void;
    const check = vi.spyOn(client, 'getSession').mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    );
    fireEvent(window, new PageTransitionEvent('pageshow', { persisted: true }));
    expect(screen.queryByText('Hola, Ana Quispe')).not.toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
    });
    expect(check).toHaveBeenCalledTimes(1);
    await act(async () => {
      fail(new ApiFetchError(401, DEMO_ERRORS.sessionMissing.body.error));
    });
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeVisible();
  });
  it('un pageshow normal no repite la comprobación', async () => {
    const client = await mount();
    const check = vi.spyOn(client, 'getSession');
    fireEvent(window, new PageTransitionEvent('pageshow', { persisted: false }));
    expect(check).not.toHaveBeenCalled();
  });
  it('si el cierre falla por red muestra el error y permite volver a intentarlo', async () => {
    const client = await mount();
    vi.spyOn(client, 'logout').mockRejectedValueOnce(
      new ApiFetchError(null, {
        code: 'NETWORK_ERROR',
        message: 'No hay conexión. Inténtalo de nuevo',
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay conexión. Inténtalo de nuevo',
    );
    expect(screen.getByText('Hola, Ana Quispe')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeVisible();
  });
});
