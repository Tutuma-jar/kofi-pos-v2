import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEMO_USERS } from '../dev/fixtures.ts';
import { canView, returnTo, RETURN_TO_KEY } from './return-to.ts';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});
describe('pantalla de regreso (RF-11)', () => {
  it('persiste solo cuenta y ruta entre montajes y lee borrando', () => {
    returnTo.save(DEMO_USERS.owner.id, '/privada?tab=1#detalle');
    expect(JSON.parse(localStorage.getItem(RETURN_TO_KEY)!)).toEqual({
      userId: DEMO_USERS.owner.id,
      path: '/privada?tab=1#detalle',
    });
    expect(returnTo.take()).toEqual({
      userId: DEMO_USERS.owner.id,
      path: '/privada?tab=1#detalle',
    });
    expect(returnTo.take()).toBeNull();
  });
  it('permite borrar explícitamente el destino', () => {
    returnTo.save(DEMO_USERS.owner.id, '/privada');
    returnTo.clear();
    expect(returnTo.take()).toBeNull();
  });
  it.each(['mal JSON', '{}', '{"userId":"no-uuid","path":"/"}'])(
    'ignora y borra datos inválidos: %s',
    (raw) => {
      localStorage.setItem(RETURN_TO_KEY, raw);
      expect(returnTo.take()).toBeNull();
      expect(localStorage.getItem(RETURN_TO_KEY)).toBeNull();
    },
  );
  it('el almacenamiento no disponible no impide ingresar', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sin espacio');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('sin permiso');
    });
    expect(() => returnTo.save(DEMO_USERS.owner.id, '/')).not.toThrow();
    expect(returnTo.take()).toBeNull();
  });
  const routes = [
    { path: '/', roles: ['owner', 'cashier'] as const },
    { path: '/privada/:id', roles: ['owner'] as const },
  ];
  it('consulta la existencia y los roles en las rutas declaradas, con búsqueda y fragmento', () => {
    expect(canView('owner', '/privada/12?tab=1#detalle', routes)).toBe(true);
    expect(canView('cashier', '/privada/12', routes)).toBe(false);
    expect(canView('cashier', '/', routes)).toBe(true);
    expect(canView('owner', '/desconocida', routes)).toBe(false);
  });
  it.each(['https://otro.test/', '//otro.test/', '/\\otro.test/', 'privada'])(
    'rechaza destinos externos o relativos: %s',
    (path) => {
      returnTo.save(DEMO_USERS.owner.id, path);
      expect(returnTo.take()).toBeNull();
      expect(canView('owner', path, routes)).toBe(false);
    },
  );
});
