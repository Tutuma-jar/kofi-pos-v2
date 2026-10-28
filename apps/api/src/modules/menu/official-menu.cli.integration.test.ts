import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { runOfficialMenuLoad } from './official-menu.cli.ts';
import { getAdminMenu, saveCategory } from './index.ts';

const URL = 'postgresql://db.kofi.test:5432/kofi';
const LOADED = 'Menú oficial cargado: 6 categorías y 37 productos';
const NOT_EMPTY =
  'La base ya tiene categorías o productos. El menú oficial solo se carga en una base nueva';
const FAILED =
  'No se pudo cargar el menú oficial. Comprueba la configuración y la conexión a la base';

describe('comando load:menu (RF-2, RF-3, RF-4, RNF-1)', () => {
  let db: Database;
  let messages: string[];
  const write = (message: string) => {
    messages.push(message);
  };
  // La base de PGlite, con un close que solo se registra para poder consultarla después.
  let opened: { db: Database; close: ReturnType<typeof vi.fn> };
  const createDatabase = vi.fn((url: string) => {
    expect(url).toBe(URL);
    return opened.db;
  });

  beforeEach(async () => {
    db = await createEmptyTestDatabase();
    messages = [];
    const close = vi.fn(async () => {});
    opened = { db: { ...db, close }, close };
    createDatabase.mockClear();
  });
  afterEach(async () => {
    await db.close();
  });

  it('carga en una base vacía, devuelve 0 y cierra la base', async () => {
    expect(await runOfficialMenuLoad({ env: { DATABASE_URL: URL }, createDatabase, write })).toBe(
      0,
    );
    expect(messages).toEqual([LOADED]);
    expect((await getAdminMenu(db)).flatMap((category) => category.products)).toHaveLength(37);
    expect(opened.close).toHaveBeenCalledOnce();
  });

  it('rechaza una base con menú, devuelve 1 y cierra la base', async () => {
    await runOfficialMenuLoad({ env: { DATABASE_URL: URL }, createDatabase, write: () => {} });
    await saveCategory(db, { name: 'Propia' });
    const before = await getAdminMenu(db);
    opened.close.mockClear();
    expect(await runOfficialMenuLoad({ env: { DATABASE_URL: URL }, createDatabase, write })).toBe(
      1,
    );
    expect(messages).toEqual([NOT_EMPTY]);
    expect(await getAdminMenu(db)).toEqual(before);
    expect(opened.close).toHaveBeenCalledOnce();
  });

  it.each([
    ['sin DATABASE_URL', {}],
    ['con una DATABASE_URL inválida', { DATABASE_URL: 'mysql://db.kofi.test/kofi' }],
  ])('%s devuelve 1 con el mensaje de RF-4 y no abre ninguna base', async (_, env) => {
    expect(await runOfficialMenuLoad({ env, createDatabase, write })).toBe(1);
    expect(messages).toEqual([FAILED]);
    expect(createDatabase).not.toHaveBeenCalled();
  });

  it('no muestra la dirección si createDatabase falla', async () => {
    const failing = vi.fn(() => {
      throw new Error(`No se pudo conectar a ${URL}`);
    });
    expect(
      await runOfficialMenuLoad({ env: { DATABASE_URL: URL }, createDatabase: failing, write }),
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
      await runOfficialMenuLoad({
        env: { DATABASE_URL: URL },
        createDatabase: () => unreachable,
        write,
      }),
    ).toBe(1);
    expect(messages).toEqual([FAILED]);
    expect(messages.join('\n')).not.toContain('db.kofi.test');
    expect(close).toHaveBeenCalledOnce();
    // La base sigue sin tablas: no se tocó.
    expect(await getAdminMenu(db).catch(() => 'sin tablas')).toBe('sin tablas');
  });
});
