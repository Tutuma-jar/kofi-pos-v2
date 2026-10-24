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
  canView,
} from './modules/auth/index.ts';
import { MenuAdminPage, MenuPage } from './modules/menu/index.ts';
import { NewSalePage } from './modules/sales/index.ts';

// Rutas de la interfaz (docs/architecture.md §6.6). Cada ruta protegida declara los roles que pueden
// verla; por defecto, los dos. La interfaz solo usa esa lista para navegar (RF-11) y para no mostrar
// lo que el rol no puede ver; los permisos reales los aplica la API. `homeLink` es el texto de su
// enlace en la pantalla inicial (SPEC-002, D-8).

export const ALL_ROLES: readonly Role[] = roleSchema.options;

interface RouteDefinition {
  path: string;
  element: ReactNode;
}

interface ProtectedRouteDefinition extends RouteDefinition {
  roles?: readonly Role[];
  homeLink?: string;
}

export const publicRoutes: RouteDefinition[] = [
  {
    path: '/ingresar',
    element: <LoginPage canView={(role, path) => canView(role, path, protectedRoutes)} />,
  },
];

const protectedRouteDefinitions: ProtectedRouteDefinition[] = [
  { path: '/', element: <HomePage /> },
  {
    path: '/menu/administrar',
    element: <MenuAdminPage />,
    roles: ['owner'],
    homeLink: 'Administrar menú',
  },
  { path: '/menu', element: <MenuPage />, homeLink: 'Ver menú' },
  // SPEC-003 D-11: /ventas queda libre para el Historial (005).
  { path: '/ventas/nueva', element: <NewSalePage />, homeLink: 'Nueva venta' },
];

export const protectedRoutes = protectedRouteDefinitions.map((route) => ({
  ...route,
  roles: route.roles ?? ALL_ROLES,
  element:
    route.path === '/' ? (
      <HomePage
        links={protectedRouteDefinitions.flatMap((entry) =>
          entry.homeLink
            ? [{ path: entry.path, label: entry.homeLink, roles: entry.roles ?? ALL_ROLES }]
            : [],
        )}
      />
    ) : (
      route.element
    ),
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
