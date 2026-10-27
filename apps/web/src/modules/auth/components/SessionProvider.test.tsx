import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { SessionProvider } from './SessionProvider.tsx';
import { RequireSession } from './RequireSession.tsx';
import { useSession } from './useSession.ts';
import { DEMO_USERS } from '../dev/fixtures.ts';

function Probe() {
  const { logout } = useSession();
  return (
    <>
      <button onClick={() => void logout().catch(() => undefined)}>Cerrar</button>
      <button onClick={() => void apiFetch('/api/operation').catch(() => undefined)}>Operar</button>
    </>
  );
}
function mount(onSessionEnd = vi.fn(), initialError?: string) {
  const getSession = vi.fn(async () => DEMO_USERS.cashier);
  if (initialError)
    getSession.mockRejectedValueOnce(
      new ApiFetchError(401, {
        code: initialError,
        message: 'Sesión inválida',
        userId: DEMO_USERS.cashier.id,
      }),
    );
  const client = {
    getSession,
    login: async () => DEMO_USERS.cashier,
    logout: vi.fn(async () => {}),
  };
  render(
    <MemoryRouter initialEntries={['/privada']}>
      <SessionProvider client={client} onSessionEnd={onSessionEnd}>
        <Routes>
          <Route
            path="/privada"
            element={
              <RequireSession>
                <Probe />
              </RequireSession>
            }
          />
          <Route path="/ingresar" element={<h1>Ingresar</h1>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
  return { client, onSessionEnd };
}
afterEach(() => vi.unstubAllGlobals());
describe('aviso de fin de sesión (SPEC-003 RF-13)', () => {
  it('avisa logout después de cerrar correctamente', async () => {
    const { client, onSessionEnd } = mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar' }));
    expect(client.logout).toHaveBeenCalledTimes(1);
    expect(onSessionEnd).toHaveBeenCalledExactlyOnceWith('logout');
  });
  it('conserva el trabajo si falla el cierre por conexión', async () => {
    const { client, onSessionEnd } = mount();
    client.logout.mockRejectedValueOnce(new Error('sin conexión'));
    await userEvent.click(await screen.findByRole('button', { name: 'Cerrar' }));
    expect(onSessionEnd).not.toHaveBeenCalled();
  });
  it.each(['SESSION_TERMINATED', 'SESSION_EXPIRED', 'SESSION_MISSING'])(
    'resuelve %s al comprobar la sesión',
    async (code) => {
      const { onSessionEnd } = mount(vi.fn(), code);
      await screen.findByRole('heading', { name: 'Ingresar' });
      if (code === 'SESSION_TERMINATED')
        expect(onSessionEnd).toHaveBeenCalledExactlyOnceWith('terminated');
      else expect(onSessionEnd).not.toHaveBeenCalled();
    },
  );
  it('avisa terminated ante el 401 de cualquier operación', async () => {
    const { onSessionEnd } = mount();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: 'SESSION_TERMINATED',
                message: 'Tu sesión terminó. Vuelve a iniciar sesión',
              },
            }),
            { status: 401 },
          ),
      ),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Operar' }));
    await waitFor(() => expect(onSessionEnd).toHaveBeenCalledExactlyOnceWith('terminated'));
  });
});

describe('sesión por pantalla y parámetros de consulta (SPEC-005 T026)', () => {
  function mountScreen() {
    const getSession = vi.fn(async () => DEMO_USERS.owner);
    const client = { getSession, login: async () => DEMO_USERS.owner, logout: async () => {} };
    function Controls() {
      const navigate = useNavigate();
      return (
        <>
          <h1>Información del negocio</h1>
          <input aria-label="Trabajo local" defaultValue="consulta anterior" />
          <button onClick={() => void navigate('?mes=2026-09')}>Cambiar consulta</button>
          <button onClick={() => void navigate('/otra')}>Otra pantalla</button>
          <Probe />
        </>
      );
    }
    function Host() {
      const location = useLocation();
      return (
        <SessionProvider client={client} screenKey={location.pathname}>
          <Routes>
            <Route
              path="/privada"
              element={
                <RequireSession>
                  <Controls />
                </RequireSession>
              }
            />
            <Route
              path="/otra"
              element={
                <RequireSession>
                  <h1>Otra información</h1>
                </RequireSession>
              }
            />
            <Route path="/ingresar" element={<h1>Ingresar</h1>} />
          </Routes>
        </SessionProvider>
      );
    }
    render(
      <MemoryRouter initialEntries={['/privada?mes=2026-10']}>
        <Host />
      </MemoryRouter>,
    );
    return { getSession };
  }
  it('conserva la pantalla y sus datos locales al cambiar solo la consulta', async () => {
    const { getSession } = mountScreen();
    await screen.findByRole('heading', { name: 'Información del negocio' });
    const field = screen.getByLabelText('Trabajo local');
    await userEvent.clear(field);
    await userEvent.type(field, 'datos anteriores');
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar consulta' }));
    expect(screen.getByLabelText('Trabajo local')).toBe(field);
    expect(field).toHaveValue('datos anteriores');
    expect(getSession).toHaveBeenCalledTimes(1);
  });
  it('oculta la información y exige validar la sesión al abrir otra pantalla', async () => {
    const { getSession } = mountScreen();
    await screen.findByRole('heading', { name: 'Información del negocio' });
    let resolve!: (user: typeof DEMO_USERS.owner) => void;
    getSession.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Otra pantalla' }));
    expect(screen.getByRole('status')).toHaveTextContent('Comprobando sesión…');
    expect(screen.queryByRole('heading', { name: 'Otra información' })).not.toBeInTheDocument();
    expect(getSession).toHaveBeenCalledTimes(2);
    resolve(DEMO_USERS.owner);
    expect(await screen.findByRole('heading', { name: 'Otra información' })).toBeVisible();
  });
  it('invalida la sesión ante un 401 de una petición dentro de la misma pantalla', async () => {
    mountScreen();
    await screen.findByRole('heading', { name: 'Información del negocio' });
    await userEvent.click(screen.getByRole('button', { name: 'Cambiar consulta' }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'SESSION_TERMINATED',
              message: 'Tu sesión terminó. Vuelve a iniciar sesión',
            },
          }),
          { status: 401 },
        ),
      ),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Operar' }));
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeVisible();
    expect(screen.queryByText('Información del negocio')).not.toBeInTheDocument();
  });
});
