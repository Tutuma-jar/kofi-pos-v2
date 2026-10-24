import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createAuthDemoClient } from '../dev/auth-demo-client.ts';
import { DEMO_USERS } from '../dev/fixtures.ts';
import { LoginForm } from './LoginForm.tsx';

describe('formulario de ingreso (RF-1, RF-2, RF-3, RF-14, RNF-5)', () => {
  it('se completa con Tab e Intro y conserva la contraseña exacta al enviar', async () => {
    const client = createAuthDemoClient('owner');
    const login = vi.spyOn(client, 'login');
    const onSuccess = vi.fn();
    const keyboard = userEvent.setup();
    render(<LoginForm client={client} onSuccess={onSuccess} />);
    await keyboard.tab();
    expect(screen.getByLabelText('Usuario')).toHaveFocus();
    await keyboard.keyboard('  Ana ');
    await keyboard.tab();
    expect(screen.getByLabelText('Contraseña')).toHaveFocus();
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    await keyboard.keyboard(' cafe con Leche {Enter}');
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(DEMO_USERS.owner));
    expect(login).toHaveBeenCalledWith({ username: 'Ana', password: ' cafe con Leche ' });
  });
  it.each(['', '   '])('indica los campos vacíos sin llamar al cliente', async (value) => {
    const client = createAuthDemoClient('owner');
    const login = vi.spyOn(client, 'login');
    render(<LoginForm client={client} onSuccess={vi.fn()} />);
    const user = userEvent.setup();
    if (value) {
      await user.type(screen.getByLabelText('Usuario'), value);
      await user.type(screen.getByLabelText('Contraseña'), value);
    }
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByText('Escribe tu usuario')).toBeVisible();
    expect(screen.getByText('Escribe tu contraseña')).toBeVisible();
    expect(screen.getByLabelText('Usuario')).toHaveAttribute('aria-invalid', 'true');
    expect(login).not.toHaveBeenCalled();
  });
  it.each([
    ['invalidCredentials', 'Usuario o contraseña incorrectos'],
    ['offline', 'No hay conexión. Inténtalo de nuevo'],
  ] as const)('muestra %s y conserva solo el usuario tras el error', async (scenario, message) => {
    render(<LoginForm client={createAuthDemoClient(scenario)} onSuccess={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Usuario'), '  Ana ');
    await user.type(screen.getByLabelText('Contraseña'), 'prueba de cafe');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Usuario')).toHaveValue('  Ana ');
    expect(screen.getByLabelText('Contraseña')).toHaveValue('');
  });
  it('impide escribir más de 30 y 64 caracteres', async () => {
    render(<LoginForm client={createAuthDemoClient('owner')} onSuccess={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Usuario'), 'a'.repeat(31));
    await user.type(screen.getByLabelText('Contraseña'), 'b'.repeat(65));
    expect(screen.getByLabelText('Usuario')).toHaveValue('a'.repeat(30));
    expect(screen.getByLabelText('Contraseña')).toHaveValue('b'.repeat(64));
  });
  it('espera una respuesta lenta sin duplicar el envío ni mostrar falta de conexión', async () => {
    const client = createAuthDemoClient('owner');
    let finish!: (user: typeof DEMO_USERS.owner) => void;
    const login = vi.spyOn(client, 'login').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<LoginForm client={client} onSuccess={vi.fn()} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Usuario'), 'ana');
    await user.type(screen.getByLabelText('Contraseña'), 'prueba de cafe');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(screen.getByRole('button', { name: 'Ingresando…' })).toBeDisabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(login).toHaveBeenCalledTimes(1);
    finish(DEMO_USERS.owner);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled());
  });
});
