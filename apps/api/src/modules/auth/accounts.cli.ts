import { emitKeypressEvents, type Key } from 'node:readline';
import { createInterface } from 'node:readline/promises';
import type { ReadStream } from 'node:tty';
import type { Writable } from 'node:stream';
import { loadEnv } from '../../shared/config/env.ts';
import { createPgDatabase } from '../../shared/database/database.ts';
import { AppError } from '../../shared/http/errors.ts';
import { createAccountsService, type AccountsService } from './accounts.service.ts';

export interface AccountsIO {
  ask(label: string, options?: { secret?: boolean }): Promise<string>;
  write(message: string): void;
}

// Sin eco ni argumentos: la contraseña no queda en pantalla ni en el historial de la consola.
export function readPassword(input: ReadStream, output: Writable): Promise<string> {
  if (!input.isTTY)
    return Promise.reject(new Error('Escribe la contraseña en una terminal interactiva'));
  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw;
    let value = '';
    const cleanup = () => {
      input.off('keypress', onKey);
      input.off('end', onEnd);
      input.off('error', onError);
      input.setRawMode(wasRaw);
      input.pause();
      output.write('\n');
    };
    const onEnd = () => {
      cleanup();
      reject(new Error('Operación cancelada'));
    };
    const onError = () => {
      cleanup();
      reject(new Error('No se pudo leer la contraseña'));
    };
    const onKey = (text: string | undefined, key: Key) => {
      if (key.ctrl && (key.name === 'c' || key.name === 'd')) {
        onEnd();
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value);
        return;
      }
      if (key.name === 'backspace') {
        value = Array.from(value).slice(0, -1).join('');
        return;
      }
      if (text && !key.ctrl && !key.meta && !text.includes('\u001b')) value += text;
    };
    emitKeypressEvents(input);
    input.setRawMode(true);
    input.on('keypress', onKey);
    input.once('end', onEnd);
    input.once('error', onError);
    input.resume();
  });
}

export function createTerminalIO(): AccountsIO {
  return {
    async ask(label, options) {
      if (options?.secret) {
        process.stdout.write(label);
        return readPassword(process.stdin, process.stdout);
      }
      const prompt = createInterface({ input: process.stdin, output: process.stdout });
      try {
        return await prompt.question(label);
      } finally {
        prompt.close();
      }
    },
    write(message) {
      process.stdout.write(`${message}\n`);
    },
  };
}

export async function runAccounts(
  args: string[],
  accounts: AccountsService,
  io: AccountsIO,
): Promise<number> {
  if (args.length !== 1 || !['create', 'list'].includes(args[0]!)) {
    io.write('Uso: npm run accounts -w @kofi/api -- create|list (sin otros argumentos)');
    return 1;
  }
  try {
    if (args[0] === 'create') {
      const username = await io.ask('Usuario: ');
      const displayName = await io.ask('Nombre visible: ');
      const role = await io.ask('Rol (owner: dueño, cashier: cajero): ');
      const password = await io.ask('Contraseña: ', { secret: true });
      const user = await accounts.create({ username, displayName, role, password });
      io.write(`Cuenta creada: ${user.username}`);
    } else {
      const users = await accounts.list();
      if (users.length === 0) io.write('No hay cuentas.');
      for (const user of users) {
        io.write(
          `${user.username} | ${user.displayName} | ${user.role === 'owner' ? 'Dueño' : 'Cajero'}`,
        );
      }
    }
    return 0;
  } catch (error) {
    if (error instanceof AppError) {
      io.write(error.message);
      for (const message of Object.values(error.details.fields ?? {})) io.write(message);
    } else {
      io.write('No se pudo completar la operación de cuentas');
    }
    return 1;
  }
}

if (import.meta.main) {
  const env = loadEnv();
  const db = createPgDatabase(env.DATABASE_URL);
  try {
    process.exitCode = await runAccounts(
      process.argv.slice(2),
      createAccountsService(db),
      createTerminalIO(),
    );
  } finally {
    await db.close();
  }
}
