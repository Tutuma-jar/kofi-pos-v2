import { loginRequestSchema, loginResponseSchema, sessionResponseSchema } from '@kofi/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { validate } from '../../shared/http/validate.ts';
import { createAuthService, type AuthDeps } from './auth.service.ts';
import { SESSION_COOKIE, sessionCookieOptions } from './auth.cookie.ts';
import { requireSession } from './auth.hook.ts';

export const authPlugin: FastifyPluginAsync<AuthDeps & { production?: boolean }> = async (
  app,
  deps,
) => {
  const auth = createAuthService(deps);
  app.get(
    '/api/auth/session',
    { preHandler: requireSession(auth, deps.production) },
    async (request) => sessionResponseSchema.parse({ user: request.sessionUser }),
  );
  app.post('/api/auth/login', async (request, reply) => {
    const input = validate(loginRequestSchema, request.body);
    const { token, user } = await auth.login(input, request.cookies[SESSION_COOKIE]);
    reply.setCookie(SESSION_COOKIE, token, {
      ...sessionCookieOptions(deps.production),
      maxAge: 648000,
    });
    return loginResponseSchema.parse({ user });
  });
};
