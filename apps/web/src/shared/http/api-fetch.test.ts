import { sessionResponseSchema } from '@kofi/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiFetchError } from './api-fetch.ts';

const USER = {
  id: '4c1f2b7e-8d3a-4f5b-9c6d-1e2f3a4b9a2e',
  username: 'ana',
  displayName: 'Ana Quispe',
  role: 'owner',
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function failure(promise: Promise<unknown>): Promise<ApiFetchError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiFetchError);
  return error as ApiFetchError;
}

describe('apiFetch', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('pide al mismo origen con cookies y valida la respuesta 200 con el esquema', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: USER }));

    const result = await apiFetch('/api/auth/session', { schema: sessionResponseSchema });

    expect(result).toEqual({ user: USER });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {},
      body: undefined,
    });
  });

  it('envía el cuerpo como JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: USER }));

    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { username: 'ana', password: 'cafe con leche' },
      schema: sessionResponseSchema,
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'ana', password: 'cafe con leche' }),
    });
  });

  it('devuelve undefined en un 204 sin cuerpo', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    expect(await apiFetch('/api/auth/logout', { method: 'POST' })).toBeUndefined();
  });

  it('lanza el ApiError de la API con su estado', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        error: { code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos' },
      }),
    );

    const error = await failure(apiFetch('/api/auth/login', { method: 'POST', body: {} }));

    expect(error.status).toBe(401);
    expect(error.code).toBe('INVALID_CREDENTIALS');
    expect(error.error).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Usuario o contraseña incorrectos',
    });
    expect(error.message).toBe('Usuario o contraseña incorrectos');
  });

  it('convierte un fallo de red en NETWORK_ERROR', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const error = await failure(apiFetch('/api/auth/login', { method: 'POST', body: {} }));

    expect(error.status).toBeNull();
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.message).toBe('No hay conexión. Inténtalo de nuevo');
  });

  it('trata un error sin el formato común como INTERNAL_ERROR', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));

    const error = await failure(apiFetch('/api/auth/session'));

    expect(error.status).toBe(502);
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('Ocurrió un error. Inténtalo de nuevo');
  });

  it('rechaza una respuesta 200 que no cumple el esquema del contrato', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { user: { ...USER, role: 'admin' } }));

    const error = await failure(apiFetch('/api/auth/session', { schema: sessionResponseSchema }));

    expect(error.code).toBe('INTERNAL_ERROR');
  });
});
