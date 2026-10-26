import { Navigate, useLocation, useNavigate } from 'react-router';
import { LoginForm } from '../components/LoginForm.tsx';
import { useSession } from '../components/useSession.ts';
import type { Role } from '@kofi/contracts';
import { returnTo } from '../api/return-to.ts';
import { SteppedDiamond } from '../../../shared/components/SteppedDiamond.tsx';
import { WeaveStrip } from '../../../shared/components/WeaveStrip.tsx';
import './LoginPage.css';

export function LoginPage({
  canView = (_role, path) => path === '/',
}: {
  canView?: (role: Role, path: string) => boolean;
}) {
  const { user, checking, client, acceptSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const notice: unknown = location.state?.notice;
  if (!checking && user) return <Navigate to="/" replace />;
  return (
    <div className="login">
      <div className="login__brand">
        <p className="login__name">Kofi POS</p>
        <SteppedDiamond
          className="login__relief"
          outline="var(--color-brand-deep)"
          ring="var(--color-brand-deep)"
          eye="var(--color-brand)"
        />
      </div>
      <WeaveStrip orientation="vertical" />
      <WeaveStrip orientation="horizontal" />
      <main className="login__main">
        {checking ? (
          <p role="status" className="login__checking">
            Comprobando sesión…
          </p>
        ) : (
          <div className="login__content">
            <h1>Ingresar</h1>
            {typeof notice === 'string' && notice && (
              <p role="alert" className="notice">
                {notice}
              </p>
            )}
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
          </div>
        )}
      </main>
    </div>
  );
}
