import { apiErrorSchema, ERROR_CODES, type ApiError } from '@kofi/contracts';

// Peticiones de la interfaz a la API: mismo origen, con la cookie de sesión (D-2). Todo fallo llega
// como ApiFetchError con el formato común de errores; la falta de conexión, como NETWORK_ERROR
// (RF-14), que solo existe en la interfaz.

export const NETWORK_ERROR_MESSAGE = 'No hay conexión. Inténtalo de nuevo';
const UNEXPECTED_MESSAGE = 'Ocurrió un error. Inténtalo de nuevo';

export type ApiErrorDetail = ApiError['error'];

export class ApiFetchError extends Error {
  // null si no llegó respuesta.
  readonly status: number | null;
  readonly error: ApiErrorDetail;

  constructor(status: number | null, error: ApiErrorDetail) {
    super(error.message);
    this.name = 'ApiFetchError';
    this.status = status;
    this.error = error;
  }

  get code(): string {
    return this.error.code;
  }
}

// Un esquema del contrato (Zod) que valida la respuesta.
interface ResponseSchema<T> {
  parse(data: unknown): T;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
}

export function apiFetch<T>(
  path: string,
  options: RequestOptions & { schema: ResponseSchema<T> },
): Promise<T>;
export function apiFetch(path: string, options?: RequestOptions): Promise<void>;
export async function apiFetch<T>(
  path: string,
  { method = 'GET', body, schema }: RequestOptions & { schema?: ResponseSchema<T> } = {},
): Promise<T | void> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiFetchError(null, {
      code: ERROR_CODES.NETWORK_ERROR,
      message: NETWORK_ERROR_MESSAGE,
    });
  }

  const unexpected = () =>
    new ApiFetchError(response.status, {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: UNEXPECTED_MESSAGE,
    });

  const data: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    throw parsed.success ? new ApiFetchError(response.status, parsed.data.error) : unexpected();
  }
  if (!schema) return;
  try {
    return schema.parse(data);
  } catch {
    throw unexpected();
  }
}
