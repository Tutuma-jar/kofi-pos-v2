import type { Role, AccountInput } from '@kofi/contracts';
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

export async function insertUser(
  db: Queryable,
  input: AccountInput,
  passwordHash: string,
): Promise<UserRecord> {
  const result = await db.query<UserRow>(
    `INSERT INTO users AS u (username, display_name, role, password_hash)
     VALUES ($1, $2, $3, $4) RETURNING ${USER_COLUMNS}`,
    [input.username, input.displayName, input.role, passwordHash],
  );
  return toUserRecord(result.rows[0]!);
}

export async function listUsers(db: Queryable): Promise<UserRecord[]> {
  const result = await db.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users u ORDER BY u.username`);
  return result.rows.map(toUserRecord);
}

export async function updateUser(
  db: Queryable,
  username: string,
  changes: { displayName?: string; role?: Role; passwordHash?: string },
): Promise<UserRecord | null> {
  const result = await db.query<UserRow>(
    `UPDATE users AS u SET display_name = COALESCE($2, display_name),
      role = COALESCE($3, role), password_hash = COALESCE($4, password_hash), updated_at = now()
      WHERE username = $1 RETURNING ${USER_COLUMNS}`,
    [username, changes.displayName ?? null, changes.role ?? null, changes.passwordHash ?? null],
  );
  return result.rows[0] ? toUserRecord(result.rows[0]) : null;
}

export async function deleteUser(db: Queryable, username: string): Promise<boolean> {
  return (await db.query('DELETE FROM users WHERE username = $1', [username])).rowCount > 0;
}

export async function clearLoginFailures(db: Queryable, userId: string): Promise<void> {
  await db.query('DELETE FROM failed_logins WHERE user_id = $1', [userId]);
}

export async function setAccountLock(
  db: Queryable,
  userId: string,
  until: Date | null,
): Promise<void> {
  await db.query('UPDATE users SET locked_until = $2 WHERE id = $1', [userId, until]);
}

export async function recordLoginFailure(
  db: Queryable,
  userId: string,
  now: Date,
): Promise<number> {
  await db.query('INSERT INTO failed_logins (user_id, attempted_at) VALUES ($1, $2)', [
    userId,
    now,
  ]);
  const result = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM failed_logins WHERE user_id = $1 AND attempted_at > $2',
    [userId, new Date(now.getTime() - 15 * 60_000)],
  );
  return result.rows[0]!.count;
}
