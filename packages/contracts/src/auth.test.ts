import { describe, expect, it } from 'vitest';
import {
  accountInputSchema,
  loginRequestSchema,
  loginResponseSchema,
  PASSWORD_MAX_LENGTH,
  roleSchema,
  sessionResponseSchema,
  USERNAME_MAX_LENGTH,
} from './auth.ts';

const USER = {
  id: '4c1f2b7e-8d3a-4f5b-9c6d-1e2f3a4b9a2e',
  username: 'ana',
  displayName: 'Ana Quispe',
  role: 'owner',
} as const;

// Mensaje del primer problema de un campo, o undefined si el campo es válido.
function fieldError(
  result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } },
  field: string,
) {
  return result.error?.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('constantes', () => {
  it('fijan los máximos de «Datos de una cuenta»', () => {
    expect(USERNAME_MAX_LENGTH).toBe(30);
    expect(PASSWORD_MAX_LENGTH).toBe(64);
  });

  it('Role admite dueño y cajero', () => {
    expect(roleSchema.options).toEqual(['owner', 'cashier']);
  });
});

describe('loginRequestSchema', () => {
  it('acepta el ejemplo de §6 y quita los espacios alrededor del usuario', () => {
    expect(loginRequestSchema.parse({ username: '  Ana ', password: 'cafe con leche' })).toEqual({
      username: 'Ana',
      password: 'cafe con leche',
    });
  });

  it('compara la contraseña tal cual, sin recortarla', () => {
    expect(loginRequestSchema.parse({ username: 'ana', password: ' clave ' }).password).toBe(
      ' clave ',
    );
  });

  it.each([
    ['', 'clave'],
    ['   ', 'clave'],
  ])('indica que falta el usuario cuando es %j', (username, password) => {
    const result = loginRequestSchema.safeParse({ username, password });
    expect(fieldError(result, 'username')).toBe('Escribe tu usuario');
  });

  it.each(['', '    '])('indica que falta la contraseña cuando es %j', (password) => {
    const result = loginRequestSchema.safeParse({ username: 'ana', password });
    expect(fieldError(result, 'password')).toBe('Escribe tu contraseña');
  });

  it('respeta los máximos de largo', () => {
    expect(
      loginRequestSchema.safeParse({ username: 'a'.repeat(30), password: 'p'.repeat(64) }).success,
    ).toBe(true);
    const result = loginRequestSchema.safeParse({
      username: 'a'.repeat(31),
      password: 'p'.repeat(65),
    });
    expect(fieldError(result, 'username')).toBeDefined();
    expect(fieldError(result, 'password')).toBeDefined();
  });
});

describe('accountInputSchema', () => {
  const valid = {
    username: 'ana',
    password: 'cafe con leche',
    displayName: 'Ana Quispe',
    role: 'owner',
  };

  it('normaliza el usuario: "  Ana " queda como "ana"', () => {
    expect(accountInputSchema.parse({ ...valid, username: '  Ana ' }).username).toBe('ana');
  });

  it.each(['ana', 'a.b', 'luis_m-2', 'x'.repeat(30)])('acepta el usuario %j', (username) => {
    expect(accountInputSchema.safeParse({ ...valid, username }).success).toBe(true);
  });

  it.each(['an', 'x'.repeat(31), 'ñandú', 'josé', 'ana maría', 'ana@kofi'])(
    'rechaza el usuario %j e indica el dato',
    (username) => {
      const result = accountInputSchema.safeParse({ ...valid, username });
      expect(fieldError(result, 'username')).toMatch(/usuario/);
    },
  );

  it.each([8, 64])('acepta una contraseña de %i caracteres', (length) => {
    expect(accountInputSchema.safeParse({ ...valid, password: 'p'.repeat(length) }).success).toBe(
      true,
    );
  });

  it.each([7, 65])('rechaza una contraseña de %i caracteres', (length) => {
    const result = accountInputSchema.safeParse({ ...valid, password: 'p'.repeat(length) });
    expect(fieldError(result, 'password')).toMatch(/contraseña/);
  });

  it('rechaza una contraseña formada solo por espacios', () => {
    const result = accountInputSchema.safeParse({ ...valid, password: ' '.repeat(10) });
    expect(fieldError(result, 'password')).toMatch(/espacios/);
  });

  it('acepta un nombre visible de 1 a 40 caracteres y le quita los espacios alrededor', () => {
    expect(accountInputSchema.parse({ ...valid, displayName: ' Ana ' }).displayName).toBe('Ana');
    expect(accountInputSchema.safeParse({ ...valid, displayName: 'A'.repeat(40) }).success).toBe(
      true,
    );
  });

  it.each(['', '   ', 'A'.repeat(41)])('rechaza el nombre visible %j', (displayName) => {
    const result = accountInputSchema.safeParse({ ...valid, displayName });
    expect(fieldError(result, 'displayName')).toMatch(/nombre visible/);
  });

  it('rechaza un rol desconocido', () => {
    const result = accountInputSchema.safeParse({ ...valid, role: 'admin' });
    expect(fieldError(result, 'role')).toMatch(/rol/);
  });
});

describe('respuestas', () => {
  it('loginResponseSchema y sessionResponseSchema aceptan el ejemplo de §6', () => {
    expect(loginResponseSchema.parse({ user: USER })).toEqual({ user: USER });
    expect(sessionResponseSchema.parse({ user: USER })).toEqual({ user: USER });
  });

  it('rechazan una cuenta con un id que no es uuid o un rol desconocido', () => {
    expect(sessionResponseSchema.safeParse({ user: { ...USER, id: 'ana' } }).success).toBe(false);
    expect(sessionResponseSchema.safeParse({ user: { ...USER, role: 'admin' } }).success).toBe(
      false,
    );
  });
});
