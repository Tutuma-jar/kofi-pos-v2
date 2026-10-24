import { randomBytes } from 'node:crypto';
import type { LoginRequest, SessionUser } from '@kofi/contracts';
import type { Clock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { AppError } from '../../shared/http/errors.ts';
import { hashPassword, verifyPassword } from './passwords.service.ts';
import { createSession, findSessionByToken, revokeSession } from './sessions.repository.ts';
import { findUserByUsername, type UserRecord } from './users.repository.ts';

export interface AuthDeps {
  db: Database;
  clock: Clock;
}

// Se calcula una vez con los mismos parámetros que una cuenta real (RNF-2).
const dummyHash = hashPassword(randomBytes(32).toString('base64url'));
const SESSION_DURATION = 12 * 60 * 60 * 1000;

export function toSessionUser(user: UserRecord): SessionUser {
  const { id, username, displayName, role } = user;
  return { id, username, displayName, role };
}

export function createAuthService({ db, clock }: AuthDeps) {
  return {
    async logout(token?: string): Promise<void> {
      if (token) await revokeSession(db, token, clock.now());
    },
    async resolveSession(token?: string): Promise<SessionUser> {
      const session = token ? await findSessionByToken(db, token) : null;
      if (!session || session.revokedAt || !session.user) {
        throw new AppError(401, 'SESSION_MISSING', 'Inicia sesión para continuar');
      }
      return toSessionUser(session.user);
    },
    async login(input: LoginRequest, previousToken?: string) {
      return db.transaction(async (tx) => {
        const user = await findUserByUsername(tx, input.username.trim().toLowerCase(), {
          forUpdate: true,
        });
        const valid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash));
        if (!user || !valid) {
          throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos');
        }
        const now = clock.now();
        if (previousToken) await revokeSession(tx, previousToken, now);
        const token = randomBytes(32).toString('base64url');
        await createSession(tx, {
          token,
          userId: user.id,
          userSessionVersion: user.sessionVersion,
          createdAt: now,
          expiresAt: new Date(now.getTime() + SESSION_DURATION),
        });
        return { token, user: toSessionUser(user) };
      });
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
