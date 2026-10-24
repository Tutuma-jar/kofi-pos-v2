import type { SessionUser } from '@kofi/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/http/errors.ts';
import { clearSessionCookie, SESSION_COOKIE } from './auth.cookie.ts';
import type { AuthService } from './auth.service.ts';

declare module 'fastify' {
  interface FastifyRequest {
    sessionUser: SessionUser | null;
  }
}

export function requireSession(auth: AuthService, production = false) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.sessionUser = await auth.resolveSession(request.cookies[SESSION_COOKIE]);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 401) {
        clearSessionCookie(reply, production);
      }
      throw error;
    }
  };
}
