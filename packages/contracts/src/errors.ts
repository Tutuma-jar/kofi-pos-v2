import { z } from 'zod';

// Códigos estables (en inglés) que la interfaz usa para decidir qué hacer (D-4, plan §6).
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  SESSION_MISSING: 'SESSION_MISSING',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  SESSION_TERMINATED: 'SESSION_TERMINATED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  // Solo lo genera la interfaz, cuando no llega respuesta de la API (RF-14).
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Formato común de errores de la API. `message` está en español y la interfaz lo muestra tal cual.
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    fields: z.record(z.string(), z.string()).optional(),
    retryAfterMinutes: z.int().positive().optional(),
    // Solo en SESSION_EXPIRED: la cuenta de la sesión vencida, para el regreso (RF-11).
    userId: z.uuid().optional(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
