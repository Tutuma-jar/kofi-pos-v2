// Superficie pública del módulo auth de la interfaz (D-11). Los demás módulos importan solo de aquí.
export { HomePage } from './pages/HomePage.tsx';
export { LoginPage } from './pages/LoginPage.tsx';
export { SessionProvider } from './components/SessionProvider.tsx';
export { useSession } from './components/useSession.ts';
export { RequireSession } from './components/RequireSession.tsx';
export { AuthenticatedLayout } from './components/AuthenticatedLayout.tsx';
export { httpAuthClient, type AuthClient } from './api/auth-client.ts';
