import { roleSchema, type Role } from '@kofi/contracts';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import {
  HomePage,
  LoginPage,
  SessionProvider,
  RequireSession,
  AuthenticatedLayout,
  httpAuthClient,
  type AuthClient,
} from './modules/auth/index.ts';

// Rutas de la interfaz (docs/architecture.md §6.6). Cada ruta protegida declara los roles que pueden
// verla; por defecto, los dos. La interfaz solo usa esa lista para navegar (RF-11); los permisos
// reales los aplica la API.

export const ALL_ROLES: readonly Role[] = roleSchema.options;

interface RouteDefinition {
  path: string;
  element: ReactNode;
}

interface ProtectedRouteDefinition extends RouteDefinition {
  roles?: readonly Role[];
}

export const publicRoutes: RouteDefinition[] = [{ path: '/ingresar', element: <LoginPage /> }];

const protectedRouteDefinitions: ProtectedRouteDefinition[] = [
  { path: '/', element: <HomePage /> },
];

export const protectedRoutes = protectedRouteDefinitions.map((route) => ({
  ...route,
  roles: route.roles ?? ALL_ROLES,
}));

export function AppRoutes({ client = httpAuthClient }: { client?: AuthClient }) {
  return (
    <SessionProvider client={client}>
      <Routes>
        {publicRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}
        {protectedRoutes.map(({ path, element }) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireSession>
                <AuthenticatedLayout>{element}</AuthenticatedLayout>
              </RequireSession>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}
