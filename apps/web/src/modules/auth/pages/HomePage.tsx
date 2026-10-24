import { useSession } from '../components/useSession.ts';
import type { Role } from '@kofi/contracts';
import { Link, useLocation } from 'react-router';

interface HomeLink {
  path: string;
  label: string;
  roles: readonly Role[];
}

export function HomePage({ links = [] }: { links?: readonly HomeLink[] }) {
  const { user } = useSession();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  if (!user) return null;
  return (
    <main>
      <h1>Kofi POS</h1>
      <p>Hola, {user.displayName}</p>
      {notice && <p role="status">{notice}</p>}
      <nav aria-label="Módulos">
        <ul>
          {links
            .filter((link) => link.roles.includes(user.role))
            .map((link) => (
              <li key={link.path}>
                <Link to={link.path}>{link.label}</Link>
              </li>
            ))}
        </ul>
      </nav>
    </main>
  );
}
