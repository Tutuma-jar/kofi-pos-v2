import { describe, expect, it } from 'vitest';
import { apiErrorSchema, ERROR_CODES } from './errors.ts';

const USER_ID = '4c1f2b7e-8d3a-4f5b-9c6d-1e2f3a4b9a2e';

describe('apiErrorSchema', () => {
  it.each([
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos',
        fields: { username: 'Escribe tu usuario', password: 'Escribe tu contraseña' },
      },
    },
    { error: { code: 'INVALID_CREDENTIALS', message: 'Usuario o contraseña incorrectos' } },
    {
      error: {
        code: 'ACCOUNT_LOCKED',
        message: 'Demasiados intentos. Vuelve a intentarlo en 4 minutos',
        retryAfterMinutes: 4,
      },
    },
    { error: { code: 'SESSION_MISSING', message: 'Inicia sesión para continuar' } },
    {
      error: {
        code: 'SESSION_EXPIRED',
        message: 'Tu sesión venció. Vuelve a iniciar sesión',
        userId: USER_ID,
      },
    },
    {
      error: { code: 'SESSION_TERMINATED', message: 'Tu sesión terminó. Vuelve a iniciar sesión' },
    },
    { error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error. Inténtalo de nuevo' } },
  ])('acepta el ejemplo $error.code', (example) => {
    expect(apiErrorSchema.parse(example)).toEqual(example);
  });

  it('rechaza un error sin code', () => {
    expect(apiErrorSchema.safeParse({ error: { message: 'Algo' } }).success).toBe(false);
  });

  it('rechaza un error sin message', () => {
    expect(apiErrorSchema.safeParse({ error: { code: 'INTERNAL_ERROR' } }).success).toBe(false);
  });

  it('rechaza un userId que no es un uuid', () => {
    const result = apiErrorSchema.safeParse({
      error: { code: 'SESSION_EXPIRED', message: 'Tu sesión venció', userId: 'ana' },
    });
    expect(result.success).toBe(false);
  });

  it('rechaza un cuerpo sin el objeto error', () => {
    expect(apiErrorSchema.safeParse({ code: 'INTERNAL_ERROR', message: 'Algo' }).success).toBe(
      false,
    );
  });
});

describe('ERROR_CODES', () => {
  it('incluye los códigos del plan', () => {
    expect(Object.values(ERROR_CODES)).toEqual([
      'VALIDATION_ERROR',
      'INVALID_CREDENTIALS',
      'ACCOUNT_LOCKED',
      'SESSION_MISSING',
      'SESSION_EXPIRED',
      'SESSION_TERMINATED',
      'INTERNAL_ERROR',
      'NETWORK_ERROR',
    ]);
  });
});
