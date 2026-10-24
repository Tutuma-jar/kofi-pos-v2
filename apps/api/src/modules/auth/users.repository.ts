import type { Role } from '@kofi/contracts';
import type { Queryable } from '../../shared/database/database.ts';

// Acceso a la tabla users (RF-1, RF-9, RF-13).

export interface UserRecord {
  id: string;
  username: string;
  displayName: string;
  role: Role;
  passwordHash: string;
  sessionVersion: number;
  lockedUntil: Date | null;
}

export const USER_COLUMNS = `u.id, u.username, u.display_name, u.role, u.password_hash,
  u.session_version, u.locked_until`;

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  role: Role;
  password_hash: string;
  session_version: number;
  locked_until: Date | null;
}

export function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    passwordHash: row.password_hash,
    sessionVersion: row.session_version,
    lockedUntil: row.locked_until,
  };
}

// `username` ya normalizado. Con `forUpdate`, bloquea la fila hasta el fin de la transacción, para
// que dos ingresos simultáneos a la misma cuenta se cuenten bien (D-5).
export async function findUserByUsername(
  db: Queryable,
  username: string,
  { forUpdate = false } = {},
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `SELECT ${USER_COLUMNS} FROM users u WHERE u.username = $1${forUpdate ? ' FOR UPDATE' : ''}`,
    [username],
  );
  const row = result.rows[0];
  return row ? toUserRecord(row) : null;
}
