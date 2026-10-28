import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDate } from '@kofi/contracts';
import { TEST_ACCOUNTS } from '../../../../../e2e/fixtures.ts';
import { startDroppingPostgres } from '../../../test/dropping-postgres.ts';
import { loadOfficialMenuFixture } from '../../../test/official-menu-fixture.ts';
import { createTestDatabase } from '../../../test/test-database.ts';
import { createAccountsService } from '../auth/index.ts';
import { OFFICIAL_MENU } from '../menu/index.ts';
import { createPgDatabase, type Database } from '../../shared/database/database.ts';
import { demoPeriod } from './demo-sales.calendar.ts';
import { runDemoSalesLoad } from './demo-sales.cli.ts';
import { DemoSalesGenerationError } from './demo-sales.rules.ts';
import { listRegisteredSales } from './sales.repository.ts';

const URL = 'postgresql://db.kofi.test:5432/kofi';
const CANCELLED = 'Carga cancelada. No se cambió nada';
const HAS_SALES =
  'La base ya tiene ventas registradas. Las ventas de demostración solo se cargan en una base sin ventas';
const NO_ACCOUNTS = 'La base no tiene cuentas de dueño ni de cajero que registren las ventas';
const FAILED =
  'No se pudieron cargar las ventas de demostración. Comprueba la configuración y la conexión a la base';

describe('comando load:demo-sales (RF-1, RF-2, RF-3, RF-10, RNF-1)', () => {
  let db: Database;
  let messages: string[];
  let questions: string[];
  const write = (message: string) => {
    messages.push(message);
  };
  const answering = (answer: string | null) =>
    vi.fn(async (question: string) => {
      questions.push(question);
      return answer;
    });
  // La base de PGlite, con un close que solo se registra para poder consultarla después.
  let opened: { db: Database; close: ReturnType<typeof vi.fn> };
  const createDatabase = vi.fn((url: string) => {
    expect(url).toBe(URL);
    return opened.db;
  });
  const run = (
    answer: string | null,
    env: Record<string, string | undefined> = { DATABASE_URL: URL },
  ) => runDemoSalesLoad({ env, createDatabase, ask: answering(answer), write, seed: 7 });

  async function prepare({ menu = true, accounts = true } = {}) {
    if (menu) await loadOfficialMenuFixture(db);
    if (accounts)
      for (const input of Object.values(TEST_ACCOUNTS))
        await createAccountsService(db).create(input);
  }

  beforeEach(async () => {
    db = await createTestDatabase();
    messages = [];
    questions = [];
    const close = vi.fn(async () => {});
    opened = { db: { ...db, close }, close };
    createDatabase.mockClear();
  });
  afterEach(async () => {
    await db.close();
  });

  it.each([['CARGAR'], ['  CARGAR  ']])(
    'con «%s», carga lo anunciado, devuelve 0 y cierra la base, sin pedir cuenta ni sesión',
    async (answer) => {
      await prepare();
      expect(await run(answer)).toBe(0);
      const count = (await listRegisteredSales(db)).length;
      // La hora sale de PostgreSQL, que en PGlite es la de esta máquina.
      const { from, to } = demoPeriod(new Date());
      const dates = `del ${formatDate(from)} al ${formatDate(to)}`;
      expect(count).toBeGreaterThan(0);
      expect(questions).toEqual([
        `Se cargarán ${count} ventas de demostración ${dates}. Las ventas registradas no se pueden borrar. Escribe CARGAR para continuar`,
      ]);
      expect(messages).toEqual([`Ventas de demostración cargadas: ${count} ventas ${dates}`]);
      expect(opened.close).toHaveBeenCalledOnce();
    },
    60_000,
  );

  it.each([['cargar'], ['sí'], [''], [null]])(
    'con %j, cancela sin cambiar nada y devuelve 1',
    async (answer) => {
      await prepare();
      expect(await run(answer)).toBe(1);
      expect(messages).toEqual([CANCELLED]);
      expect(await listRegisteredSales(db)).toEqual([]);
      expect(opened.close).toHaveBeenCalledOnce();
    },
  );

  it('rechaza una base con ventas sin preguntar', async () => {
    await prepare();
    await run('CARGAR');
    messages = [];
    questions = [];
    const before = await listRegisteredSales(db);
    expect(await run('CARGAR')).toBe(1);
    expect(questions).toEqual([]);
    expect(messages).toEqual([HAS_SALES]);
    expect(await listRegisteredSales(db)).toHaveLength(before.length);
  }, 60_000);

  it('rechaza una base sin el menú oficial y nombra los productos, sin preguntar', async () => {
    await prepare({ menu: false });
    expect(await run('CARGAR')).toBe(1);
    expect(questions).toEqual([]);
    const names = OFFICIAL_MENU.flatMap((c) => c.products.map((p) => p.name)).join(', ');
    expect(messages).toEqual([
      `La base no tiene el menú oficial completo y activo. Faltan o están inactivos: ${names}`,
    ]);
  });

  it('rechaza una base sin cuentas, sin preguntar', async () => {
    await prepare({ accounts: false });
    expect(await run('CARGAR')).toBe(1);
    expect(questions).toEqual([]);
    expect(messages).toEqual([NO_ACCOUNTS]);
  });

  it.each([
    ['sin DATABASE_URL', {}],
    ['con una DATABASE_URL inválida', { DATABASE_URL: 'mysql://db.kofi.test/kofi' }],
  ])('%s devuelve 1 con el mensaje de RF-10 y no abre ninguna base', async (_, env) => {
    expect(await run('CARGAR', env)).toBe(1);
    expect(messages).toEqual([FAILED]);
    expect(createDatabase).not.toHaveBeenCalled();
  });

  it('no muestra la dirección si createDatabase falla', async () => {
    const failing = vi.fn(() => {
      throw new Error(`No se pudo conectar a ${URL}`);
    });
    expect(
      await runDemoSalesLoad({
        env: { DATABASE_URL: URL },
        createDatabase: failing,
        ask: answering('CARGAR'),
        write,
        seed: 7,
      }),
    ).toBe(1);
    expect(messages).toEqual([FAILED]);
  });

  it('no muestra la dirección si falla la conexión y cierra la base', async () => {
    const close = vi.fn(async () => {});
    const unreachable: Database = {
      ...db,
      transaction: () => Promise.reject(new Error(`connect ECONNREFUSED ${URL}`)),
      close,
    };
    expect(
      await runDemoSalesLoad({
        env: { DATABASE_URL: URL },
        createDatabase: () => unreachable,
        ask: answering('CARGAR'),
        write,
        seed: 7,
      }),
    ).toBe(1);
    expect(messages).toEqual([FAILED]);
    expect(messages.join('\n')).not.toContain('db.kofi.test');
    expect(close).toHaveBeenCalledOnce();
  });

  it('muestra el mensaje de RF-10 si el generador agota sus intentos, sin cambiar la base', async () => {
    await prepare();
    const result = await runDemoSalesLoad({
      env: { DATABASE_URL: URL },
      createDatabase,
      ask: answering('CARGAR'),
      write,
      seed: 7,
      load: async () => {
        throw new DemoSalesGenerationError();
      },
    });
    expect(result).toBe(1);
    expect(messages).toEqual([FAILED]);
    expect(await listRegisteredSales(db)).toEqual([]);
  });

  it('muestra el mensaje de RF-10 si la conexión real se corta', async () => {
    const server = await startDroppingPostgres();
    try {
      expect(
        await runDemoSalesLoad({
          env: { DATABASE_URL: server.url },
          createDatabase: createPgDatabase,
          ask: answering('CARGAR'),
          write,
          seed: 7,
        }),
      ).toBe(1);
      expect(messages).toEqual([FAILED]);
      expect(messages.some((message) => message.includes('127.0.0.1'))).toBe(false);
    } finally {
      await server.close();
    }
  });
});
