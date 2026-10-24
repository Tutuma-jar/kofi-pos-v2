import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createAuthDemoClient } from '../dev/auth-demo-client.ts';
import { SessionProvider } from '../components/SessionProvider.tsx';
import { LoginPage } from './LoginPage.tsx';

describe('página de ingreso (RF-1, RF-6)', () => {
  function mount(client = createAuthDemoClient('owner')) {
    render(
      <MemoryRouter initialEntries={['/ingresar']}>
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
});
