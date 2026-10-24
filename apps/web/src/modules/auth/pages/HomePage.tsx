import { useSession } from '../components/useSession.ts';

export function HomePage() {
  const { user } = useSession();
  if (!user) return null;
  return (
    <main>
      <h1>Kofi POS</h1>
      <p>Hola, {user.displayName}</p>
    </main>
  );
}
