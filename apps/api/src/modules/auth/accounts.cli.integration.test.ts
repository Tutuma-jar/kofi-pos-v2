import { PassThrough } from 'node:stream';
import type { ReadStream } from 'node:tty';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from '../../../test/test-database.ts';
import type { Database } from '../../shared/database/database.ts';
import { createAccountsService } from './accounts.service.ts';
import { readPassword, runAccounts, type AccountsIO } from './accounts.cli.ts';

describe('CLI de cuentas (RF-13, RNF-1)', () => {
  let db: Database;
  let accounts: ReturnType<typeof createAccountsService>;
  beforeAll(async () => {
    db = await createTestDatabase();
    accounts = createAccountsService(db);
  });
  beforeEach(async () => {
    await db.query('TRUNCATE users CASCADE');
  });
  afterAll(async () => {
    await db.close();
  });
  function terminal(values: string[]) {
    const messages: string[] = [];
    const io: AccountsIO = {
      ask: vi.fn(async () => values.shift() ?? ''),
      write: (message) => {
        messages.push(message);
      },
    };
    return { io, messages };
  }
  it('ejecuta create y list con entrada simulada, en español y sin revelar la contraseña', async () => {
    const { io, messages } = terminal(['Ana', 'Ana Quispe', 'owner', 'clave de prueba']);
    expect(await runAccounts(['create'], accounts, io)).toBe(0);
    expect(io.ask).toHaveBeenLastCalledWith('Contraseña: ', { secret: true });
    expect(messages).toContain('Cuenta creada: ana');
    expect(await runAccounts(['list'], accounts, io)).toBe(0);
    expect(messages.join('\n')).toContain('ana | Ana Quispe | Dueño');
    expect(messages.join('\n')).not.toMatch(/clave de prueba|scrypt/);
  });
  it('informa el usuario repetido y el dato inválido', async () => {
    await accounts.create({
      username: 'ana',
      displayName: 'Ana',
      role: 'owner',
      password: 'clave de prueba',
    });
    const duplicate = terminal(['ANA', 'Otra Ana', 'cashier', 'otra de prueba']);
    expect(await runAccounts(['create'], accounts, duplicate.io)).toBe(1);
    expect(duplicate.messages.join('\n')).toContain('Ya existe una cuenta con el usuario ana');
    const invalid = terminal(['ab', 'Ana', 'owner', 'clave de prueba']);
    expect(await runAccounts(['create'], accounts, invalid.io)).toBe(1);
    expect(invalid.messages.join('\n')).toContain('El usuario debe tener de 3 a 30 caracteres');
  });
  it('rechaza argumentos adicionales antes de pedir o escribir una contraseña', async () => {
    const { io, messages } = terminal([]);
    expect(await runAccounts(['create', '--password', 'dato-sensible'], accounts, io)).toBe(1);
    expect(io.ask).not.toHaveBeenCalled();
    expect(messages.join('\n')).not.toContain('dato-sensible');
    expect(messages.join('\n')).toContain('Uso:');
  });
  it('lista sin cuentas con un mensaje en español', async () => {
    const { io, messages } = terminal([]);
    expect(await runAccounts(['list'], accounts, io)).toBe(0);
    expect(messages).toContain('No hay cuentas.');
  });
});

describe('entrada secreta', () => {
  function input() {
    const stream = Object.assign(new PassThrough(), {
      isTTY: true,
      isRaw: false,
      setRawMode: vi.fn(),
    });
    return stream as typeof stream & ReadStream;
  }
  it('no muestra caracteres, admite retroceso y restaura la terminal', async () => {
    const source = input();
    const output = new PassThrough();
    let written = '';
    output.on('data', (chunk) => {
      written += chunk.toString();
    });
    const promise = readPassword(source, output);
    source.write('claveX\x7f de prueba\r');
    expect(await promise).toBe('clave de prueba');
    expect(written).toBe('\n');
    expect(source.setRawMode.mock.calls).toEqual([[true], [false]]);
    expect(source.listenerCount('keypress')).toBe(0);
  });
  it('cancela con Ctrl+C sin mostrar lo escrito y restaura el modo', async () => {
    const source = input();
    const promise = readPassword(source, new PassThrough());
    source.write('clave\x03');
    await expect(promise).rejects.toThrow('Operación cancelada');
    expect(source.setRawMode).toHaveBeenLastCalledWith(false);
  });
  it('rechaza entrada redirigida para contraseñas', async () => {
    const source = input();
    Object.assign(source, { isTTY: false });
    await expect(readPassword(source, new PassThrough())).rejects.toThrow('terminal interactiva');
  });
});
