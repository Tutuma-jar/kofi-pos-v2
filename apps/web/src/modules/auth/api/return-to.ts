import { sessionUserSchema, type Role } from '@kofi/contracts';
import { matchPath } from 'react-router';

export const RETURN_TO_KEY = 'kofi:auth:return-to';
interface ReturnTarget {
  userId: string;
  path: string;
}
const isLocalPath = (path: string) =>
  path.startsWith('/') && !path.startsWith('//') && !path.includes('\\');

export const returnTo = {
  save(userId: string, path: string): void {
    if (!sessionUserSchema.shape.id.safeParse(userId).success || !isLocalPath(path)) return;
    try {
      localStorage.setItem(RETURN_TO_KEY, JSON.stringify({ userId, path }));
    } catch {
      /* El ingreso funciona sin almacenamiento. */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(RETURN_TO_KEY);
    } catch {
      /* Puede estar deshabilitado. */
    }
  },
  take(): ReturnTarget | null {
    try {
      const raw = localStorage.getItem(RETURN_TO_KEY);
      localStorage.removeItem(RETURN_TO_KEY);
      if (!raw) return null;
      const value: unknown = JSON.parse(raw);
      if (
        typeof value !== 'object' ||
        value === null ||
        !('userId' in value) ||
        !('path' in value) ||
        !sessionUserSchema.shape.id.safeParse(value.userId).success ||
        typeof value.path !== 'string' ||
        !isLocalPath(value.path)
      )
        return null;
      return { userId: value.userId as string, path: value.path };
    } catch {
      return null;
    }
  },
};

export function canView(
  role: Role,
  path: string,
  routes: readonly { path: string; roles: readonly Role[] }[],
): boolean {
  if (!isLocalPath(path)) return false;
  const pathname = path.split(/[?#]/)[0]!;
  return routes.some(
    (route) =>
      matchPath({ path: route.path, end: true }, pathname) !== null && route.roles.includes(role),
  );
}
