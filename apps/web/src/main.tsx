import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from './routes.tsx';

const container = document.getElementById('root');
if (!container) throw new Error('Falta el elemento #root en index.html');
const root = createRoot(container);

root.render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
);

// Escenarios de desarrollo (docs/architecture.md §4.5): import() dinámico bajo import.meta.env.DEV,
// para que el build de producción no los incluya.
if (import.meta.env.DEV) {
  const [{ ScenarioPicker }, { createAuthDemoClient, loadStoredScenario }] = await Promise.all([
    import('./modules/auth/dev/ScenarioPicker.tsx'),
    import('./modules/auth/dev/auth-demo-client.ts'),
  ]);
  const authDemoClient = createAuthDemoClient(loadStoredScenario());
  const picker = document.body.appendChild(document.createElement('div'));
  createRoot(picker).render(
    <StrictMode>
      <ScenarioPicker client={authDemoClient} />
    </StrictMode>,
  );
}
