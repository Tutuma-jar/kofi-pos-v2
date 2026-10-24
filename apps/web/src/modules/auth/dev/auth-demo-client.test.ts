import { apiErrorSchema, sessionUserSchema } from '@kofi/contracts';
import { describe, expect, it } from 'vitest';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import { createAuthDemoClient, SCENARIOS, type ScenarioId } from './auth-demo-client.ts';
import { DEMO_ERRORS, DEMO_USERS } from './fixtures.ts';

const CREDENTIALS = { username: 'ana', password: 'cafe con leche' };

async function rejection(promise: Promise<unknown>): Promise<ApiFetchError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ApiFetchError);
  return error as ApiFetchError;
}

describe('fixtures', () => {
  it.each(Object.entries(DEMO_USERS))('la cuenta %s cumple SessionUser', (_name, user) => {
    expect(sessionUserSchema.parse(user)).toEqual(user);
  });

  it.each(Object.entries(DEMO_ERRORS))('el error %s cumple ApiError', (_name, { body }) => {
    expect(apiErrorSchema.parse(body)).toEqual(body);
  });
});

describe('createAuthDemoClient', () => {
  it('ofrece los siete escenarios', () => {
    expect(Object.keys(SCENARIOS)).toEqual([
      'owner',
      'cashier',
      'invalidCredentials',
      'accountLocked',
      'offline',
      'sessionExpired',
      'sessionTerminated',
    ]);
  });

  it.each(Object.keys(SCENARIOS) as ScenarioId[])(
    'todo lo que devuelve o lanza en el escenario %s cumple el contrato',
    async (scenario) => {
      const client = createAuthDemoClient(scenario);
      const results = [
        await client.getSession().then(
          (user) => ({ user }),
          (e: ApiFetchError) => ({ error: e }),
        ),
        await client.login(CREDENTIALS).then(
          (user) => ({ user }),
          (e: ApiFetchError) => ({ error: e }),
        ),
        await client.getSession().then(
          (user) => ({ user }),
          (e: ApiFetchError) => ({ error: e }),
        ),
      ];
      for (const result of results) {
        if ('user' in result) expect(sessionUserSchema.safeParse(result.user).success).toBe(true);
        else expect(apiErrorSchema.safeParse({ error: result.error.error }).success).toBe(true);
      }
    },
  );

  it.each([
    ['owner', DEMO_USERS.owner],
    ['cashier', DEMO_USERS.cashier],
  ] as const)('%s: sin sesión al empezar, ingresa y cierra sesión', async (scenario, user) => {
    const client = createAuthDemoClient(scenario);

    expect((await rejection(client.getSession())).code).toBe('SESSION_MISSING');
    expect(await client.login(CREDENTIALS)).toEqual(user);
    expect(await client.getSession()).toEqual(user);
    await client.logout();
    expect((await rejection(client.getSession())).code).toBe('SESSION_MISSING');
  });

  it.each([
    ['invalidCredentials', 401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos'],
    [
      'accountLocked',
      429,
      'ACCOUNT_LOCKED',
      'Demasiados intentos. Vuelve a intentarlo en 5 minutos',
    ],
  ] as const)('%s: el ingreso falla con %i %s', async (scenario, status, code, message) => {
    const error = await rejection(createAuthDemoClient(scenario).login(CREDENTIALS));
    expect(error).toMatchObject({ status, code, message });
  });

  it('offline: todas las llamadas fallan con NETWORK_ERROR', async () => {
    const client = createAuthDemoClient('offline');
    for (const call of [() => client.login(CREDENTIALS), client.getSession, client.logout]) {
      expect(await rejection(call())).toMatchObject({ status: null, code: 'NETWORK_ERROR' });
    }
  });

  it('sessionExpired: la sesión vence con el userId del dueño y luego queda sin sesión', async () => {
    const client = createAuthDemoClient('sessionExpired');

    const expired = await rejection(client.getSession());
    expect(expired).toMatchObject({ status: 401, code: 'SESSION_EXPIRED' });
    expect(expired.error.userId).toBe(DEMO_USERS.owner.id);
    expect((await rejection(client.getSession())).code).toBe('SESSION_MISSING');
    expect(await client.login(CREDENTIALS)).toEqual(DEMO_USERS.owner);
  });

  it('sessionTerminated: la sesión termina sin userId y luego queda sin sesión', async () => {
    const client = createAuthDemoClient('sessionTerminated');

    const terminated = await rejection(client.getSession());
    expect(terminated).toMatchObject({ status: 401, code: 'SESSION_TERMINATED' });
    expect(terminated.error.userId).toBeUndefined();
    expect((await rejection(client.getSession())).code).toBe('SESSION_MISSING');
  });

  it('setScenario cambia el escenario y reinicia la sesión', async () => {
    const client = createAuthDemoClient('owner');
    await client.login(CREDENTIALS);

    client.setScenario('cashier');

    expect(client.scenario).toBe('cashier');
    expect((await rejection(client.getSession())).code).toBe('SESSION_MISSING');
    expect(await client.login(CREDENTIALS)).toEqual(DEMO_USERS.cashier);
  });
});
