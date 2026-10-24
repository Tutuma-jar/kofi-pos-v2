import { ERROR_CODES, type ApiError } from '@kofi/contracts';
import type { FastifyError, FastifyInstance } from 'fastify';

type ErrorDetails = Omit<ApiError['error'], 'code' | 'message'>;

// Error esperado de una operación: se responde con su estado y el formato común (D-4).
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ErrorDetails;

  constructor(statusCode: number, code: string, message: string, details: ErrorDetails = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const VALIDATION_MESSAGE = 'Revisa los datos';
const INTERNAL_MESSAGE = 'Ocurrió un error. Inténtalo de nuevo';

function body(code: string, message: string, details: ErrorDetails = {}): ApiError {
  return { error: { code, message, ...details } };
}

// Convierte cualquier error en el formato común. Un error inesperado se registra y se responde
// como 500 INTERNAL_ERROR, sin detalles internos.
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler<FastifyError | AppError>((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(body(error.code, error.message, error.details));
    }
    // Errores de Fastify con la petición (JSON mal formado, tipo de contenido…).
    if (error.statusCode !== undefined && error.statusCode >= 400 && error.statusCode < 500) {
      return reply
        .status(error.statusCode)
        .send(body(ERROR_CODES.VALIDATION_ERROR, VALIDATION_MESSAGE));
    }
    request.log.error(error);
    return reply.status(500).send(body(ERROR_CODES.INTERNAL_ERROR, INTERNAL_MESSAGE));
  });
}
