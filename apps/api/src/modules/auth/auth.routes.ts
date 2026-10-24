import cookie from '@fastify/cookie';
import { loginRequestSchema, loginResponseSchema } from '@kofi/contracts';
import type { FastifyPluginAsync } from 'fastify';
import { validate } from '../../shared/http/validate.ts';
import { createAuthService, type AuthDeps } from './auth.service.ts';

export const SESSION_COOKIE = 'kofi_session';
export const authPlugin: FastifyPluginAsync<AuthDeps & { production?: boolean }> = async (
  app,
  deps,
) => {
  await app.register(cookie);
  const auth = createAuthService(deps);
  app.post('/api/auth/login', async (request, reply) => {
    const input = validate(loginRequestSchema, request.body);
    const { token, user } = await auth.login(input, request.cookies[SESSION_COOKIE]);
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      secure: deps.production ?? false,
      maxAge: 648000,
    });
    return loginResponseSchema.parse({ user });
  });
};
