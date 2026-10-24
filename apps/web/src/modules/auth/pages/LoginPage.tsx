import { Navigate, useNavigate } from 'react-router';
import { LoginForm } from '../components/LoginForm.tsx';
import { useSession } from '../components/useSession.ts';

export function LoginPage() {
  const { user, checking, client, acceptSession } = useSession();
  const navigate = useNavigate();
  if (checking) return <p role="status">Comprobando sesión…</p>;
  if (user) return <Navigate to="/" replace />;
  return (
    <main>
      <h1>Ingresar</h1>
      <LoginForm
        client={client}
        onSuccess={(signedInUser) => {
          acceptSession(signedInUser);
          navigate('/', { replace: true });
        }}
      />
    </main>
  );
}
