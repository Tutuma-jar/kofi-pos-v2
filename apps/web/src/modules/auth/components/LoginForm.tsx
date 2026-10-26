import {
  loginRequestSchema,
  USERNAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  type SessionUser,
} from '@kofi/contracts';
import { useId, useRef, useState, type SubmitEvent } from 'react';
import { ApiFetchError } from '../../../shared/http/api-fetch.ts';
import type { AuthClient } from '../api/auth-client.ts';

interface LoginFormProps {
  client: AuthClient;
  onSuccess(user: SessionUser): void;
}

export function LoginForm({ client, onSuccess }: LoginFormProps) {
  const id = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pending = useRef(false);
  const usernameInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    setMessage('');
    const parsed = loginRequestSchema.safeParse({ username, password });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]);
        errors[field] ??= issue.message;
      }
      setFields(errors);
      (errors.username ? usernameInput : passwordInput).current?.focus();
      return;
    }
    setFields({});
    pending.current = true;
    setSubmitting(true);
    try {
      const user = await client.login(parsed.data);
      setPassword('');
      onSuccess(user);
    } catch (error) {
      setPassword('');
      setMessage(
        error instanceof ApiFetchError ? error.message : 'Ocurrió un error. Inténtalo de nuevo',
      );
      if (error instanceof ApiFetchError) setFields(error.error.fields ?? {});
      passwordInput.current?.focus();
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-label="Ingreso" aria-busy={submitting} className="form">
      <div className="field">
        <label htmlFor={`${id}-username`}>Usuario</label>
        <input
          id={`${id}-username`}
          ref={usernameInput}
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={USERNAME_MAX_LENGTH}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          aria-invalid={!!fields.username}
          aria-describedby={fields.username ? `${id}-username-error` : undefined}
        />
        {fields.username && (
          <p id={`${id}-username-error`} className="field__error">
            {fields.username}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor={`${id}-password`}>Contraseña</label>
        <input
          id={`${id}-password`}
          ref={passwordInput}
          name="password"
          type="password"
          autoComplete="current-password"
          maxLength={PASSWORD_MAX_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={!!fields.password}
          aria-describedby={fields.password ? `${id}-password-error` : undefined}
        />
        {fields.password && (
          <p id={`${id}-password-error`} className="field__error">
            {fields.password}
          </p>
        )}
      </div>
      {message && (
        <p role="alert" className="alert">
          {message}
        </p>
      )}
      <button type="submit" disabled={submitting} className="button-primary">
        {submitting ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
