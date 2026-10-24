import type { FastifyReply } from 'fastify';

export const SESSION_COOKIE = 'kofi_session';
export const sessionCookieOptions = (production = false) => ({
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  secure: production,
});

export function clearSessionCookie(reply: FastifyReply, production = false) {
  reply.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(production), maxAge: 0 });
}
