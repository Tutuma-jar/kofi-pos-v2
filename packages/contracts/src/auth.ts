import { z } from 'zod';

// Contrato del módulo Acceso (plan §6). Los mensajes de validación están en español: la interfaz
// los muestra tal cual (RF-3) y la CLI de cuentas los usa para indicar qué dato no cumple (RF-13).

export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MAX_LENGTH = 64;

export const roleSchema = z.enum(['owner', 'cashier'], {
  error: 'El rol debe ser «owner» (dueño) o «cashier» (cajero)',
});
export type Role = z.infer<typeof roleSchema>;

const isNotOnlySpaces = (value: string) => value.trim().length > 0;

// Datos de una cuenta (spec.md §2, RF-13).
export const accountInputSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9._-]{3,30}$/,
      'El usuario debe tener de 3 a 30 caracteres: letras de la «a» a la «z» (sin tildes ni «ñ»), dígitos, punto, guion o guion bajo',
    ),
  password: z
    .string()
    .min(8, 'La contraseña debe tener de 8 a 64 caracteres')
    .max(PASSWORD_MAX_LENGTH, 'La contraseña debe tener de 8 a 64 caracteres')
    .refine(isNotOnlySpaces, 'La contraseña no puede estar formada solo por espacios'),
  displayName: z
    .string()
    .trim()
    .min(1, 'El nombre visible debe tener de 1 a 40 caracteres')
    .max(40, 'El nombre visible debe tener de 1 a 40 caracteres'),
  role: roleSchema,
});
export type AccountInput = z.infer<typeof accountInputSchema>;

// POST /api/auth/login (RF-1, RF-3). El usuario se normaliza a minúsculas en la API; la contraseña
// se compara tal cual.
export const loginRequestSchema = z.object({
  username: z
    .string({ error: 'Escribe tu usuario' })
    .trim()
    .min(1, 'Escribe tu usuario')
    .max(USERNAME_MAX_LENGTH, `El usuario tiene como máximo ${USERNAME_MAX_LENGTH} caracteres`),
  password: z
    .string({ error: 'Escribe tu contraseña' })
    .min(1, 'Escribe tu contraseña')
    .max(PASSWORD_MAX_LENGTH, `La contraseña tiene como máximo ${PASSWORD_MAX_LENGTH} caracteres`)
    .refine(isNotOnlySpaces, 'Escribe tu contraseña'),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

// La cuenta de una sesión válida (RF-5).
export const sessionUserSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  displayName: z.string(),
  role: roleSchema,
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const loginResponseSchema = z.object({ user: sessionUserSchema });
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// GET /api/auth/session (RF-4, RF-5).
export const sessionResponseSchema = z.object({ user: sessionUserSchema });
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
