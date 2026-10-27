import { useSession } from '../components/useSession.ts';
import type { Role } from '@kofi/contracts';
import { Link, useLocation } from 'react-router';
import { SteppedDiamond } from '../../../shared/components/SteppedDiamond.tsx';
import './HomePage.css';

interface HomeLink {
  path: string;
  label: string;
  roles: readonly Role[];
}

// Iconos propios de cada destino; el rombo pequeño conserva la firma tejida de Kofi.
const moduleIconPaths: Record<string, string> = {
  '/menu/administrar': 'M4 6h7m4 0h5M4 12h2m4 0h10M4 18h10m4 0h2M11 3v6M6 9v6m8 0v6',
  '/menu': 'M4 8h12v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm12 1h1a3 3 0 0 1 0 6h-1M7 3v2m4-2v2',
  '/ventas/nueva': 'M14 3H5v18l3-2 3 2 3-2 3 2v-8M8 8h3m-3 4h3m-3 4h6m4-13v6m-3-3h6',
  '/resumen': 'M4 4v16h17M8 15v-4m5 4V7m5 8V4',
  '/ventas': 'M4 8V3m0 5h5M4 8a9 9 0 1 1-1 7m9-9v6l4 2',
};

export function HomePage({ links = [] }: { links?: readonly HomeLink[] }) {
  const { user } = useSession();
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  if (!user) return null;
  return (
    <main className="home">
      <div className="home__heading">
        <h1>Kofi POS</h1>
        <p className="home__greeting">Hola, {user.displayName}</p>
      </div>
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
                  <span className="home__symbol" aria-hidden="true">
                    <svg className="home__glyph" viewBox="0 0 24 24" focusable="false">
                      <path d={moduleIconPaths[link.path] ?? 'M5 12h14m-6-6 6 6-6 6'} />
                    </svg>
                    <SteppedDiamond
                      className="home__diamond"
                      outline="var(--tone)"
                      ring="var(--color-cream)"
                      eye="var(--tone)"
                    />
                  </span>
                  <span className="home__label">{link.label}</span>
                  <svg
                    className="home__arrow"
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
        </ul>
      </nav>
    </main>
  );
}
