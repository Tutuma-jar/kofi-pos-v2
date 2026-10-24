// API para las pruebas de punta a punta (playwright.config.ts). Nunca se despliega.
import { buildApp } from '../src/app.ts';

const port = Number(process.env.PORT ?? 3100);
const app = buildApp({ logger: false });

await app.listen({ port, host: '127.0.0.1' });
