import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { httpAuthClient } from './auth-client.ts';

const USER = {
  id: '4c1f2b7e-8d3a-4f5b-9c6d-1e2f3a4b9a2e',
  username: 'ana',
  displayName: 'Ana Quispe',
  role: 'owner',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('httpAuthClient', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('login hace POST /api/auth/login con el usuario y la contraseña y devuelve la cuenta', async () => {
    fetchMock.mockResolvedValue(json(200, { user: USER }));

    const user = await httpAuthClient.login({ username: '  Ana ', password: 'cafe con leche' });

    expect(user).toEqual(USER);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: '  Ana ', password: 'cafe con leche' }),
      }),
    );
  });

  it('logout hace POST /api/auth/logout sin cuerpo', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(httpAuthClient.logout()).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', body: undefined }),
    );
  });

  it('getSession hace GET /api/auth/session y devuelve la cuenta', async () => {
    fetchMock.mockResolvedValue(json(200, { user: USER }));

    expect(await httpAuthClient.getSession()).toEqual(USER);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/session',
      expect.objectContaining({ method: 'GET', body: undefined }),
    );
  });

  it.each([
    ['login', () => httpAuthClient.login({ username: 'ana', password: 'x' })],
    ['getSession', () => httpAuthClient.getSession()],
  ])('%s valida la respuesta con el esquema del contrato', async (_name, call) => {
    fetchMock.mockResolvedValue(json(200, { user: { ...USER, id: 'no-es-uuid' } }));

    await expect(call()).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });

  it('propaga el error de la API', async () => {
    fetchMock.mockResolvedValue(
      json(401, { error: { code: 'SESSION_MISSING', message: 'Inicia sesión para continuar' } }),
    );

    const error = await httpAuthClient.getSession().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiFetchError);
    expect(error).toMatchObject({ status: 401, code: 'SESSION_MISSING' });
  });
});
