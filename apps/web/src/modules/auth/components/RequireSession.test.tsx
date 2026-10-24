import { act, render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../../../shared/http/api-fetch.ts';
import { createAuthDemoClient } from '../dev/auth-demo-client.ts';
import { DEMO_ERRORS, DEMO_USERS } from '../dev/fixtures.ts';
import { SessionProvider } from './SessionProvider.tsx';
import { RequireSession } from './RequireSession.tsx';

function Login() {
  return (
    <>
      <h1>Ingresar</h1>
      <output>{useLocation().pathname}</output>
    </>
  );
}
function Protected() {
  return (
    <>
      <p>Información del negocio</p>
      <button
        onClick={() => {
          void apiFetch('/api/operation').catch(() => undefined);
        }}
      >
        Operar
      </button>
    </>
  );
}
function mount(client = createAuthDemoClient('owner')) {
  render(
    <MemoryRouter initialEntries={['/privada']}>
      <SessionProvider client={client}>
        <Routes>
          <Route path="/ingresar" element={<Login />} />
          <Route
            path="/privada"
            element={
              <RequireSession>
                <Protected />
              </RequireSession>
            }
          />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}
afterEach(() => vi.unstubAllGlobals());
describe('guarda de sesión (RF-4, RF-8)', () => {
  it('no muestra información mientras comprueba y redirige sin aviso cuando falta sesión', async () => {
    const client = createAuthDemoClient('owner');
    let reject!: (error: unknown) => void;
    vi.spyOn(client, 'getSession').mockImplementationOnce(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        }),
    );
    mount(client);
    expect(screen.queryByText('Información del negocio')).not.toBeInTheDocument();
    const { ApiFetchError } = await import('../../../shared/http/api-fetch.ts');
    await act(async () => {
      reject(new ApiFetchError(401, DEMO_ERRORS.sessionMissing.body.error));
    });
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Información del negocio')).not.toBeInTheDocument();
  });
  it('una respuesta 401 de cualquier operación quita el contenido y lleva al ingreso', async () => {
    const client = createAuthDemoClient('owner');
    await client.login({ username: 'ana', password: 'prueba de cafe' });
    mount(client);
    expect(await screen.findByText('Información del negocio')).toBeVisible();
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(DEMO_ERRORS.sessionMissing.body), { status: 401 }),
        ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Operar' }));
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeVisible();
    expect(screen.queryByText('Información del negocio')).not.toBeInTheDocument();
  });
  it('un error de red no concede acceso y permite reintentar la comprobación', async () => {
    const client = createAuthDemoClient('offline');
    mount(client);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No hay conexión. Inténtalo de nuevo',
    );
    expect(screen.queryByText('Información del negocio')).not.toBeInTheDocument();
    client.setScenario('owner');
    await client.login({ username: 'ana', password: 'prueba de cafe' });
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Información del negocio')).toBeVisible();
  });
  it('ignora una comprobación antigua que llega después de la invalidación', async () => {
    const client = createAuthDemoClient('owner');
    let resolve!: (user: typeof DEMO_USERS.owner) => void;
    vi.spyOn(client, 'getSession').mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    mount(client);
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
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Ingresar' })).toBeVisible());
    await act(async () => {
      resolve(DEMO_USERS.owner);
    });
    expect(screen.queryByText('Información del negocio')).not.toBeInTheDocument();
  });
});
