import { useSession } from '../components/useSession.ts';
import type { Role } from '@kofi/contracts';
import { Link, useLocation } from 'react-router';
import './HomePage.css';

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
    <main className="home">
      <h1>Kofi POS</h1>
      <p className="home__greeting">Hola, {user.displayName}</p>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <nav aria-label="Módulos">
        <ul className="home__modules">
          {links
            .filter((link) => link.roles.includes(user.role))
            .map((link) => (
              <li key={link.path}>
                <Link to={link.path} className="home__module">
                  <span className="home__swatch" aria-hidden="true" />
                  {link.label}
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </main>
  );
}
