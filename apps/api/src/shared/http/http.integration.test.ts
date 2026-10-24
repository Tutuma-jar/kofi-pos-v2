import { apiErrorSchema, loginRequestSchema } from '@kofi/contracts';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.ts';
import { AppError } from './errors.ts';
import { validate } from './validate.ts';

describe('errores y cabeceras comunes de la API', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp({ logger: false });
    app.get('/api/__test/app-error', async () => {
      throw new AppError(
        429,
        'ACCOUNT_LOCKED',
        'Demasiados intentos. Vuelve a intentarlo en 4 minutos',
        {
          retryAfterMinutes: 4,
        },
      );
    });
    app.get('/api/__test/unexpected', async () => {
      throw new Error('detalle interno: tabla users no responde');
    });
    app.post('/api/__test/validate', async (request) => validate(loginRequestSchema, request.body));
  });

  afterEach(async () => {
    await app.close();
  });

  it('responde un AppError con su estado y el formato común', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/__test/app-error' });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({
      error: {
        code: 'ACCOUNT_LOCKED',
        message: 'Demasiados intentos. Vuelve a intentarlo en 4 minutos',
        retryAfterMinutes: 4,
      },
    });
    expect(apiErrorSchema.safeParse(response.json()).success).toBe(true);
  });

  it('responde un error inesperado con 500 INTERNAL_ERROR, sin detalles ni traza', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/__test/unexpected' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error. Inténtalo de nuevo' },
    });
    expect(response.body).not.toMatch(/detalle interno|at |\.ts/);
  });

  it('responde un cuerpo inválido con 400 VALIDATION_ERROR y el mensaje de cada campo', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/__test/validate',
      payload: { username: '   ', password: '' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos',
        fields: { username: 'Escribe tu usuario', password: 'Escribe tu contraseña' },
      },
    });
  });

  it('trata un cuerpo ausente como inválido', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/__test/validate' });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('responde un JSON mal formado con 400 VALIDATION_ERROR', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/__test/validate',
      headers: { 'content-type': 'application/json' },
      payload: '{"username":',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos' },
    });
  });

  it('devuelve el cuerpo validado cuando es correcto', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/__test/validate',
      payload: { username: '  Ana ', password: 'cafe con leche' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ username: 'Ana', password: 'cafe con leche' });
  });

  it.each([
    ['GET', '/api/health'],
    ['GET', '/api/__test/app-error'],
    ['GET', '/api/__test/unexpected'],
    ['POST', '/api/__test/validate'],
    ['GET', '/api/no-existe'],
  ] as const)('%s %s lleva Cache-Control: no-store', async (method, url) => {
    const response = await app.inject({ method, url });
    expect(response.headers['cache-control']).toBe('no-store');
  });
});
