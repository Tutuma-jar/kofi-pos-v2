import { randomInt } from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { formatDate } from '@kofi/contracts';
import { loadEnv } from '../../shared/config/env.ts';
import { createPgDatabase, type Database } from '../../shared/database/database.ts';
import {
  DemoSalesHasSalesError,
  DemoSalesMenuError,
  DemoSalesNoAccountsError,
  inspectDemoSales,
  loadDemoSales,
} from './demo-sales.service.ts';

// Mensajes de la carga (SPEC-007, RF-2, RF-3, RF-10). Solo se muestran en la terminal (plan §6).
const period = (from: string, to: string) => `del ${formatDate(from)} al ${formatDate(to)}`;
const messages = {
  confirm: (count: number, from: string, to: string) =>
    `Se cargarán ${count} ventas de demostración ${period(from, to)}. Las ventas registradas no se pueden borrar. Escribe CARGAR para continuar`,
  loaded: (count: number, from: string, to: string) =>
    `Ventas de demostración cargadas: ${count} ventas ${period(from, to)}`,
  cancelled: 'Carga cancelada. No se cambió nada',
  hasSales:
    'La base ya tiene ventas registradas. Las ventas de demostración solo se cargan en una base sin ventas',
  menu: (missing: string[]) =>
    `La base no tiene el menú oficial completo y activo. Faltan o están inactivos: ${missing.join(', ')}`,
  noAccounts: 'La base no tiene cuentas de dueño ni de cajero que registren las ventas',
  failed:
    'No se pudieron cargar las ventas de demostración. Comprueba la configuración y la conexión a la base',
};

export interface DemoSalesLoadDeps {
  env: Record<string, string | undefined>;
  createDatabase: (url: string) => Database;
  // Muestra la pregunta y devuelve la respuesta, o null si se cierra la entrada.
  ask: (question: string) => Promise<string | null>;
  write: (message: string) => void;
  seed?: number;
  load?: typeof loadDemoSales;
}

// Devuelve el código de salida. Nunca muestra el error original: los de pg y de loadEnv pueden
// incluir la dirección de la base (RF-10, D-8, D-11).
export async function runDemoSalesLoad({
  env,
  createDatabase,
  ask,
  write,
  seed = randomInt(0x7fffffff),
  load = loadDemoSales,
}: DemoSalesLoadDeps): Promise<number> {
  let db: Database;
  try {
    db = createDatabase(loadEnv(env).DATABASE_URL);
  } catch {
    write(messages.failed);
    return 1;
  }
  try {
    const { calendar, now } = await inspectDemoSales(db, { seed });
    const answer = await ask(messages.confirm(calendar.total, calendar.from, calendar.to));
    if (answer?.trim() !== 'CARGAR') {
      write(messages.cancelled);
      return 1;
    }
    const { count, from, to } = await load(db, { seed, now });
    write(messages.loaded(count, from, to));
    return 0;
  } catch (error) {
    if (error instanceof DemoSalesHasSalesError) write(messages.hasSales);
    else if (error instanceof DemoSalesMenuError) write(messages.menu(error.missing));
    else if (error instanceof DemoSalesNoAccountsError) write(messages.noAccounts);
    else write(messages.failed);
    return 1;
  } finally {
    await db.close().catch(() => {});
  }
}

// Pregunta en la terminal. Ctrl+C o el fin de la entrada cierran la pregunta sin respuesta (D-7).
async function askInTerminal(question: string): Promise<string | null> {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  terminal.on('SIGINT', () => terminal.close());
  try {
    return await new Promise<string | null>((resolve) => {
      terminal.once('close', () => resolve(null));
      terminal.question(`${question}\n`).then(resolve, () => resolve(null));
    });
  } finally {
    terminal.close();
  }
}

// npm run load:demo-sales -w @kofi/api: carga las ventas de demostración en la base de
// DATABASE_URL (D-1).
if (import.meta.main) {
  process.exitCode = await runDemoSalesLoad({
    env: process.env,
    createDatabase: createPgDatabase,
    ask: askInTerminal,
    write: (message) => process.stdout.write(`${message}\n`),
  });
}
