import { randomBytes } from 'node:crypto';
import type { LoginRequest, SessionUser } from '@kofi/contracts';
import type { Clock } from '../../shared/clock.ts';
import type { Database } from '../../shared/database/database.ts';
import { AppError } from '../../shared/http/errors.ts';
import { hashPassword, verifyPassword } from './passwords.service.ts';
import { createSession, findSessionByToken, revokeSession } from './sessions.repository.ts';
import {
  clearLoginFailures,
  findUserByUsername,
  recordLoginFailure,
  setAccountLock,
  type UserRecord,
} from './users.repository.ts';

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
      if (!session || session.revokedAt) {
        throw new AppError(401, 'SESSION_MISSING', 'Inicia sesión para continuar');
      }
      if (!session.user || session.userSessionVersion !== session.user.sessionVersion) {
        throw new AppError(401, 'SESSION_TERMINATED', 'Tu sesión terminó. Vuelve a iniciar sesión');
      }
      if (clock.now() >= session.expiresAt) {
        throw new AppError(401, 'SESSION_EXPIRED', 'Tu sesión venció. Vuelve a iniciar sesión', {
          userId: session.user.id,
        });
      }
      return toSessionUser(session.user);
    },
    async login(input: LoginRequest, previousToken?: string) {
      const result = await db.transaction(async (tx) => {
        const user = await findUserByUsername(tx, input.username.trim().toLowerCase(), {
          forUpdate: true,
        });
        const now = clock.now();
        if (user?.lockedUntil && user.lockedUntil > now) {
          const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60_000);
          return new AppError(
            429,
            'ACCOUNT_LOCKED',
            `Demasiados intentos. Vuelve a intentarlo en ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`,
            { retryAfterMinutes: minutes },
          );
        }
        const valid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash));
        if (!user || !valid) {
          if (user && (await recordLoginFailure(tx, user.id, now)) >= 5) {
            await setAccountLock(tx, user.id, new Date(now.getTime() + 5 * 60_000));
            await clearLoginFailures(tx, user.id);
          }
          return new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos');
        }
        await clearLoginFailures(tx, user.id);
        await setAccountLock(tx, user.id, null);
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
      // El rechazo se lanza después del commit: los fallos y el bloqueo deben persistir.
      if (result instanceof AppError) throw result;
      return result;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
