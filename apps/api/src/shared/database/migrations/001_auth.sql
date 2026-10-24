-- SPEC-001 Acceso: cuentas, intentos fallidos y sesiones (plan §4).

-- Cuentas (RF-1, RF-5, RF-9, RF-12, RF-13).
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z0-9._-]{3,30}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 40),
  role text NOT NULL CHECK (role IN ('owner', 'cashier')),
  password_hash text NOT NULL,
  session_version integer NOT NULL DEFAULT 1,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Cambiar el rol o la contraseña termina todas las sesiones de la cuenta (RF-12).
CREATE FUNCTION users_bump_session_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    NEW.session_version := OLD.session_version + 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_session_version
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION users_bump_session_version();

-- Intentos fallidos que cuentan para el bloqueo (RF-9).
CREATE TABLE failed_logins (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  attempted_at timestamptz NOT NULL
);

CREATE INDEX failed_logins_user_id_idx ON failed_logins (user_id);

-- Una fila por sesión iniciada; solo se guarda el SHA-256 del token (RF-6 a RF-8, RF-10, RF-12).
-- Si se elimina la cuenta, la sesión queda con user_id NULL y se reconoce como terminada.
CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  user_session_version integer NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
