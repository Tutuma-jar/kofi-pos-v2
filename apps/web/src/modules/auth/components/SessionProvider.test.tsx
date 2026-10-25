import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
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
