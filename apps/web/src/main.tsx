import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { AppRoutes } from './routes.tsx';
import { httpAuthClient, type AuthClient } from './modules/auth/index.ts';
import {
  DashboardClientProvider,
  httpDashboardClient,
  type DashboardClient,
} from './modules/dashboard/index.ts';
import {
  HistoryClientProvider,
  httpHistoryClient,
  type HistoryClient,
} from './modules/history/index.ts';
import { httpMenuClient, MenuClientProvider, type MenuClient } from './modules/menu/index.ts';
import { httpSalesClient, SalesClientProvider, type SalesClient } from './modules/sales/index.ts';
import { requestedScenarios } from './scenarios.ts';

const container = document.getElementById('root');
if (!container) throw new Error('Falta el elemento #root en index.html');
const root = createRoot(container);

function renderApp(
  client: AuthClient = httpAuthClient,
  revision = 0,
  menuClient: MenuClient = httpMenuClient,
  salesClient: SalesClient = httpSalesClient,
  dashboardClient: DashboardClient = httpDashboardClient,
  historyClient: HistoryClient = httpHistoryClient,
) {
  root.render(
    <StrictMode>
      <MenuClientProvider client={menuClient}>
        <SalesClientProvider client={salesClient}>
          <DashboardClientProvider client={dashboardClient}>
            <HistoryClientProvider client={historyClient}>
              <BrowserRouter>
                <AppRoutes key={revision} client={client} />
              </BrowserRouter>
            </HistoryClientProvider>
          </DashboardClientProvider>
        </SalesClientProvider>
      </MenuClientProvider>
    </StrictMode>,
  );
}

const scenarios = requestedScenarios(location.search);

// Escenarios de desarrollo (docs/architecture.md §4.5): import() dinámico bajo import.meta.env.DEV,
// para que el build de producción no los incluya. Sin ?escenarios=…, se usa la API real
// (SPEC-001 DD-17, SPEC-002 D-10, SPEC-003 D-10, SPEC-004 D-8). Cambiar de escenario vuelve a
// montar las rutas.
if (
  import.meta.env.DEV &&
  (scenarios.acceso || scenarios.menu || scenarios.ventas || scenarios.dashboard)
) {
  let authClient: AuthClient = httpAuthClient;
  let menuClient: MenuClient = httpMenuClient;
  let salesClient: SalesClient = httpSalesClient;
  let dashboardClient: DashboardClient = httpDashboardClient;
  let revision = 0;
  const remount = () => renderApp(authClient, ++revision, menuClient, salesClient, dashboardClient);
  const pickers: ReactNode[] = [];

  if (scenarios.acceso) {
    const [{ ScenarioPicker }, { createAuthDemoClient, loadStoredScenario }] = await Promise.all([
      import('./modules/auth/dev/ScenarioPicker.tsx'),
      import('./modules/auth/dev/auth-demo-client.ts'),
    ]);
    const authDemoClient = createAuthDemoClient(loadStoredScenario());
    authClient = authDemoClient;
    pickers.push(<ScenarioPicker key="acceso" client={authDemoClient} onChange={remount} />);
  }
  if (scenarios.menu) {
    const [{ ScenarioPicker }, { createMenuDemoClient, loadStoredMenuScenario }] =
      await Promise.all([
        import('./modules/menu/dev/ScenarioPicker.tsx'),
        import('./modules/menu/dev/menu-demo-client.ts'),
      ]);
    const menuDemoClient = createMenuDemoClient(loadStoredMenuScenario());
    menuClient = menuDemoClient;
    pickers.push(<ScenarioPicker key="menu" client={menuDemoClient} onChange={remount} />);
  }
  if (scenarios.ventas) {
    const [{ ScenarioPicker }, { createSalesDemoClient, loadStoredSalesScenario }] =
      await Promise.all([
        import('./modules/sales/dev/ScenarioPicker.tsx'),
        import('./modules/sales/dev/sales-demo-client.ts'),
      ]);
    const salesDemoClient = createSalesDemoClient(loadStoredSalesScenario());
    salesClient = salesDemoClient;
    pickers.push(<ScenarioPicker key="ventas" client={salesDemoClient} onChange={remount} />);
  }
  if (scenarios.dashboard) {
    const [{ ScenarioPicker }, { createDashboardDemoClient, loadStoredDashboardScenario }] =
      await Promise.all([
        import('./modules/dashboard/dev/ScenarioPicker.tsx'),
        import('./modules/dashboard/dev/dashboard-demo-client.ts'),
      ]);
    const dashboardDemoClient = createDashboardDemoClient(loadStoredDashboardScenario());
    dashboardClient = dashboardDemoClient;
    pickers.push(
      <ScenarioPicker key="dashboard" client={dashboardDemoClient} onChange={remount} />,
    );
  }

  renderApp(authClient, revision, menuClient, salesClient, dashboardClient);
  const picker = document.body.appendChild(document.createElement('div'));
  createRoot(picker).render(<StrictMode>{pickers}</StrictMode>);
} else {
  renderApp();
}
