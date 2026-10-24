import { z } from 'zod';

// Variables de entorno de la API. En desarrollo se leen de apps/api/.env (ver .env.example).
const envSchema = z.object({
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: 'debe ser la cadena de conexión de PostgreSQL (postgresql://…)',
  }),
  PORT: z.coerce
    .number({ error: 'debe ser un número de puerto' })
    .int('debe ser un número de puerto')
    .positive('debe ser un número de puerto')
    .default(3000),
  NODE_ENV: z
    .enum(['development', 'test', 'production'], {
      error: 'debe ser development, test o production',
    })
    .default('development'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Solo se nombran las variables, nunca sus valores (pueden tener credenciales).
    const problems = result.error.issues.map((issue) => {
      const name = String(issue.path[0]);
      return source[name] === undefined ? `- Falta ${name}` : `- ${name} ${issue.message}`;
    });
    throw new Error(`Configuración inválida de la API:\n${problems.join('\n')}`);
  }
  return result.data;
}
