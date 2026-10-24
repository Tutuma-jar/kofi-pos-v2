import { createHash, randomUUID } from 'node:crypto';
import type { Queryable } from '../../shared/database/database.ts';
import { toUserRecord, USER_COLUMNS, type UserRecord, type UserRow } from './users.repository.ts';

// Acceso a la tabla sessions (RF-6 a RF-8, RF-10, RF-12). El token de la cookie nunca se guarda:
// solo su SHA-256 (D-1).

export interface SessionRecord {
  id: string;
  userId: string | null;
  userSessionVersion: number;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  // null si la cuenta se eliminó (RF-12).
  user: UserRecord | null;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface NewSession {
  token: string;
  userId: string;
  userSessionVersion: number;
  createdAt: Date;
  expiresAt: Date;
}

export async function createSession(db: Queryable, session: NewSession): Promise<{ id: string }> {
  const id = randomUUID();
  await db.query(
    `INSERT INTO sessions (id, token_hash, user_id, user_session_version, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      hashToken(session.token),
      session.userId,
      session.userSessionVersion,
      session.createdAt,
      session.expiresAt,
    ],
  );
  return { id };
}

interface SessionRow extends Partial<UserRow> {
  session_id: string;
  user_id: string | null;
  user_session_version: number;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

export async function findSessionByToken(
  db: Queryable,
  token: string,
): Promise<SessionRecord | null> {
  const result = await db.query<SessionRow>(
    `SELECT s.id AS session_id, s.user_id, s.user_session_version, s.created_at, s.expires_at,
       s.revoked_at, ${USER_COLUMNS}
     FROM sessions s LEFT JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.session_id,
    userId: row.user_id,
    userSessionVersion: row.user_session_version,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    user: row.id ? toUserRecord(row as UserRow) : null,
  };
}

// Cierra la sesión de ese token. Devuelve false si no existía o ya estaba cerrada.
export async function revokeSession(
  db: Queryable,
  token: string,
  revokedAt: Date,
): Promise<boolean> {
  const result = await db.query(
    'UPDATE sessions SET revoked_at = $1 WHERE token_hash = $2 AND revoked_at IS NULL',
    [revokedAt, hashToken(token)],
  );
  return result.rowCount > 0;
}
