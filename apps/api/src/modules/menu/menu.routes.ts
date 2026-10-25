import {
  adminMenuResponseSchema,
  categoryResponseSchema,
  productResponseSchema,
  currentMenuResponseSchema,
} from '@kofi/contracts';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createAuthService, requireSession } from '../auth/index.ts';
import type { Database } from '../../shared/database/database.ts';
import type { Clock } from '../../shared/clock.ts';
import { AppError } from '../../shared/http/errors.ts';
import { saveCategory, deactivateCategory, reactivateCategory } from './categories.service.ts';
import { saveProduct, deactivateProduct, reactivateProduct } from './products.service.ts';
import { getAdminMenu, getCurrentMenu } from './menu.views.ts';

async function requireOwner(request: FastifyRequest) {
  if (request.sessionUser?.role !== 'owner')
    throw new AppError(403, 'FORBIDDEN', 'No tienes permiso para administrar el menú');
}

function entityId(request: FastifyRequest, entity: 'category' | 'product') {
  const id = (request.params as { id: string }).id;
  if (!z.uuid().safeParse(id).success)
    throw new AppError(
      404,
      'NOT_FOUND',
      entity === 'category' ? 'No se encontró la categoría' : 'No se encontró el producto',
    );
  return id;
}

function inputBody(request: FastifyRequest): Record<string, unknown> {
  return request.body && typeof request.body === 'object' && !Array.isArray(request.body)
    ? (request.body as Record<string, unknown>)
    : {};
}

export const menuPlugin: FastifyPluginAsync<{
  db: Database;
  clock: Clock;
  production?: boolean;
}> = async (app, deps) => {
  app.addHook('preHandler', requireSession(createAuthService(deps), deps.production));
  app.get('/api/menu', async () =>
    currentMenuResponseSchema.parse({ categories: await getCurrentMenu(deps.db) }),
  );
  const owner = { preHandler: requireOwner };
  for (const [action, change] of [
    ['deactivate', deactivateCategory],
    ['reactivate', reactivateCategory],
  ] as const) {
    app.post(`/api/menu/categories/:id/${action}`, owner, async (request) =>
      categoryResponseSchema.parse({
        category: await change(deps.db, entityId(request, 'category')),
      }),
    );
  }
  for (const [action, change] of [
    ['deactivate', deactivateProduct],
    ['reactivate', reactivateProduct],
  ] as const) {
    app.post(`/api/menu/products/:id/${action}`, owner, async (request) =>
      productResponseSchema.parse({ product: await change(deps.db, entityId(request, 'product')) }),
    );
  }
  app.get('/api/menu/admin', owner, async () =>
    adminMenuResponseSchema.parse({ categories: await getAdminMenu(deps.db) }),
  );
  app.post('/api/menu/categories', owner, async (request, reply) => {
    const category = await saveCategory(deps.db, inputBody(request));
    return reply.code(201).send(categoryResponseSchema.parse({ category }));
  });
  app.put('/api/menu/categories/:id', owner, async (request) => {
    const id = entityId(request, 'category');
    return categoryResponseSchema.parse({
      category: await saveCategory(deps.db, inputBody(request), id),
    });
  });
  app.post('/api/menu/products', owner, async (request, reply) => {
    const product = await saveProduct(deps.db, inputBody(request));
    return reply.code(201).send(productResponseSchema.parse({ product }));
  });
  app.put('/api/menu/products/:id', owner, async (request) => {
    const id = entityId(request, 'product');
    return productResponseSchema.parse({
      product: await saveProduct(deps.db, inputBody(request), id),
    });
  });
};
