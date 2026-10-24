import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { httpMenuClient, MenuClientProvider, type MenuClient } from './modules/menu/index.ts';
import { AppRoutes } from './routes.tsx';

const container = document.getElementById('root');
if (!container) throw new Error('Falta el elemento #root en index.html');
const root = createRoot(container);

// El cliente real del menú en producción; en desarrollo, el simulado hasta la integración de US1
// (SPEC-002, plan D-10).
let menuClient: MenuClient = httpMenuClient;

// Escenarios de desarrollo (docs/architecture.md §4.5): import() dinámico bajo import.meta.env.DEV,
// para que el build de producción no los incluya.
if (import.meta.env.DEV) {
  const [
    { ScenarioPicker },
    { createAuthDemoClient, loadStoredScenario },
    { ScenarioPicker: MenuScenarioPicker },
    { createMenuDemoClient, loadStoredMenuScenario },
  ] = await Promise.all([
    import('./modules/auth/dev/ScenarioPicker.tsx'),
    import('./modules/auth/dev/auth-demo-client.ts'),
    import('./modules/menu/dev/ScenarioPicker.tsx'),
    import('./modules/menu/dev/menu-demo-client.ts'),
  ]);
  const authDemoClient = createAuthDemoClient(loadStoredScenario());
  const menuDemoClient = createMenuDemoClient(loadStoredMenuScenario());
  menuClient = menuDemoClient;
  const picker = document.body.appendChild(document.createElement('div'));
  createRoot(picker).render(
    <StrictMode>
      <ScenarioPicker client={authDemoClient} />
      {/* El escenario queda guardado: recargar vuelve a pedir el menú con el nuevo. */}
      <MenuScenarioPicker client={menuDemoClient} onChange={() => location.reload()} />
    </StrictMode>,
  );
}

root.render(
  <StrictMode>
    <MenuClientProvider client={menuClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MenuClientProvider>
  </StrictMode>,
);
