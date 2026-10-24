import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.ts';

const DATABASE_URL = 'postgresql://localhost:5432/kofi';

describe('loadEnv', () => {
  it('lee la configuración y aplica los valores por defecto', () => {
    expect(loadEnv({ DATABASE_URL })).toEqual({
      DATABASE_URL,
      PORT: 3000,
      NODE_ENV: 'development',
    });
  });

  it('convierte PORT a número y acepta NODE_ENV', () => {
    expect(loadEnv({ DATABASE_URL, PORT: '10000', NODE_ENV: 'production' })).toEqual({
      DATABASE_URL,
      PORT: 10000,
      NODE_ENV: 'production',
    });
  });

  it('falla con un mensaje en español cuando falta DATABASE_URL', () => {
    expect(() => loadEnv({})).toThrow(/Configuración inválida[\s\S]*DATABASE_URL/);
  });

  it('falla si DATABASE_URL no es una URL de PostgreSQL', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://localhost/kofi' })).toThrow(/DATABASE_URL/);
  });

  it('falla con un PORT o un NODE_ENV inválidos', () => {
    expect(() => loadEnv({ DATABASE_URL, PORT: 'abc' })).toThrow(/PORT/);
    expect(() => loadEnv({ DATABASE_URL, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('no muestra el valor de DATABASE_URL en el error', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://secreto@host/kofi' })).toThrow(
      expect.not.objectContaining({ message: expect.stringContaining('secreto') }),
    );
  });
});
