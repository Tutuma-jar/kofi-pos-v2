import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SessionProvider } from '../components/SessionProvider.tsx';
import { createAuthDemoClient } from '../dev/auth-demo-client.ts';
import { HomePage } from './HomePage.tsx';

describe('enlaces y avisos de inicio (Menú RF-1)', () => {
  it.each(['owner', 'cashier'] as const)(
    'muestra los enlaces permitidos para %s y el aviso recibido',
    async (role) => {
      const client = createAuthDemoClient(role);
      const credentials =
        role === 'owner'
          ? { username: 'ana', password: 'prueba de cafe' }
          : { username: 'luis', password: 'prueba de caja' };
      await client.login(credentials);
      render(
        <MemoryRouter
          initialEntries={[
            { pathname: '/', state: { notice: 'No tienes permiso para administrar el menú' } },
          ]}
        >
          <SessionProvider client={client}>
            <HomePage
              links={[
                { path: '/menu/administrar', label: 'Administrar menú', roles: ['owner'] },
                { path: '/menu', label: 'Ver menú', roles: ['owner', 'cashier'] },
              ]}
            />
          </SessionProvider>
        </MemoryRouter>,
      );
      expect(await screen.findByRole('link', { name: 'Ver menú' })).toHaveAttribute(
        'href',
        '/menu',
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        'No tienes permiso para administrar el menú',
      );
      if (role === 'owner')
        expect(screen.getByRole('link', { name: 'Administrar menú' })).toHaveAttribute(
          'href',
          '/menu/administrar',
        );
      else expect(screen.queryByRole('link', { name: 'Administrar menú' })).not.toBeInTheDocument();
    },
  );
});
