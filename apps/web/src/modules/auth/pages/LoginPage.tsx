import { Navigate, useLocation, useNavigate } from 'react-router';
import { LoginForm } from '../components/LoginForm.tsx';
import { useSession } from '../components/useSession.ts';
import type { Role } from '@kofi/contracts';
import { returnTo } from '../api/return-to.ts';

export function LoginPage({
  canView = (_role, path) => path === '/',
}: {
  canView?: (role: Role, path: string) => boolean;
}) {
  const { user, checking, client, acceptSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const notice: unknown = location.state?.notice;
  if (checking) return <p role="status">Comprobando sesión…</p>;
  if (user) return <Navigate to="/" replace />;
  return (
    <main>
      <h1>Ingresar</h1>
      {typeof notice === 'string' && notice && <p role="alert">{notice}</p>}
      <LoginForm
        client={client}
        onSuccess={(signedInUser) => {
          const target = returnTo.take();
          acceptSession(signedInUser);
          navigate(
            target?.userId === signedInUser.id && canView(signedInUser.role, target.path)
              ? target.path
              : '/',
            { replace: true },
          );
        }}
      />
    </main>
  );
}
