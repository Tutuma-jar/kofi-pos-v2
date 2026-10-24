import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createAuthDemoClient } from '../dev/auth-demo-client.ts';
import { DEMO_ERRORS } from '../dev/fixtures.ts';
import { SessionProvider } from '../components/SessionProvider.tsx';
import { LoginPage } from './LoginPage.tsx';

describe('página de ingreso (RF-1, RF-6)', () => {
  function mount(client = createAuthDemoClient('owner'), notice?: string) {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/ingresar', state: { notice } }]}>
        <SessionProvider client={client}>
          <Routes>
            <Route path="/ingresar" element={<LoginPage />} />
            <Route path="/" element={<h1>Pantalla inicial</h1>} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    );
  }
  it('lleva a la pantalla inicial si ya hay sesión, sin mostrar el formulario', async () => {
    const client = createAuthDemoClient('owner');
    await client.login({ username: 'ana', password: 'prueba de cafe' });
    mount(client);
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Pantalla inicial' })).toBeVisible();
  });
  it('tras un ingreso correcto lleva a la pantalla inicial', async () => {
    mount();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Usuario'), 'ana');
    await user.type(screen.getByLabelText('Contraseña'), 'prueba de cafe');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('heading', { name: 'Pantalla inicial' })).toBeVisible();
  });
  it.each(['sessionExpired', 'sessionTerminated'] as const)(
    'muestra el aviso recibido de %s tal cual (RF-10, RF-12)',
    async (scenario) => {
      const client = createAuthDemoClient(scenario);
      const notice = DEMO_ERRORS[scenario].body.error.message;
      // Al llegar desde la pantalla protegida, la API ya rechazó la sesión y borró la cookie.
      await expect(client.getSession()).rejects.toMatchObject({ message: notice });
      mount(client, notice);
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(notice);
        expect(screen.getByLabelText('Usuario')).toBeVisible();
      });
      await userEvent.type(screen.getByLabelText('Usuario'), 'ana');
      expect(screen.getByLabelText('Usuario')).toHaveValue('ana');
    },
  );
  it('muestra el bloqueo calculado por la API y conserva el usuario (RF-9)', async () => {
    mount(createAuthDemoClient('accountLocked'));
    await userEvent.type(await screen.findByLabelText('Usuario'), 'ana');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'prueba de cafe');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      DEMO_ERRORS.accountLocked.body.error.message,
    );
    expect(screen.getByLabelText('Usuario')).toHaveValue('ana');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });
});
