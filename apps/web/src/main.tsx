import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from './routes.tsx';
import { httpAuthClient, type AuthClient } from './modules/auth/index.ts';
import { httpMenuClient, MenuClientProvider, type MenuClient } from './modules/menu/index.ts';

const container = document.getElementById('root');
if (!container) throw new Error('Falta el elemento #root en index.html');
const root = createRoot(container);

function renderApp(
  client: AuthClient = httpAuthClient,
  revision = 0,
  menuClient: MenuClient = httpMenuClient,
) {
  root.render(
    <StrictMode>
      <MenuClientProvider client={menuClient}>
        <BrowserRouter>
          <AppRoutes key={revision} client={client} />
        </BrowserRouter>
      </MenuClientProvider>
    </StrictMode>,
  );
}

// Escenarios de desarrollo (docs/architecture.md §4.5): import() dinámico bajo import.meta.env.DEV,
// para que el build de producción no los incluya.
if (import.meta.env.DEV && new URLSearchParams(location.search).get('escenarios') === 'acceso') {
  const [{ ScenarioPicker }, { createAuthDemoClient, loadStoredScenario }] = await Promise.all([
    import('./modules/auth/dev/ScenarioPicker.tsx'),
    import('./modules/auth/dev/auth-demo-client.ts'),
  ]);
  const authDemoClient = createAuthDemoClient(loadStoredScenario());
  let revision = 0;
  renderApp(authDemoClient);
  const picker = document.body.appendChild(document.createElement('div'));
  createRoot(picker).render(
    <StrictMode>
      <ScenarioPicker
        client={authDemoClient}
        onChange={() => {
          renderApp(authDemoClient, ++revision);
        }}
      />
    </StrictMode>,
  );
} else {
  renderApp();
}
