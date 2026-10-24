import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: import.meta.dirname });

// Devuelve los mensajes de no-restricted-imports al importar `specifier` desde `filePath`.
async function restrictedImports(filePath: string, specifier: string): Promise<string[]> {
  const [result] = await eslint.lintText(`import '${specifier}';\n`, { filePath });
  return (result?.messages ?? [])
    .filter((m) => m.ruleId === 'no-restricted-imports' || m.fatal)
    .map((m) => m.message);
}

describe('eslint.config.js: no-restricted-imports', { timeout: 15_000 }, () => {
  describe('ninguna aplicación importa de otra', () => {
    it.each([
      ['apps/web/src/main.tsx', '@kofi/api'],
      ['apps/web/src/main.tsx', '../../api/src/app.ts'],
      ['apps/web/src/modules/auth/api/auth-client.ts', '../../../../../api/test/e2e-server.ts'],
      ['apps/api/src/app.ts', '@kofi/web'],
      ['apps/api/src/app.ts', '../../web/src/main.tsx'],
      ['packages/contracts/src/auth.ts', '@kofi/api'],
      ['packages/contracts/src/auth.ts', '../../../apps/web/src/main.tsx'],
    ])('%s no puede importar %s', async (file, specifier) => {
      expect(await restrictedImports(file, specifier)).toHaveLength(1);
    });

    it('las aplicaciones sí importan el contrato', async () => {
      expect(await restrictedImports('apps/web/src/main.tsx', '@kofi/contracts')).toEqual([]);
      expect(await restrictedImports('apps/api/src/app.ts', '@kofi/contracts')).toEqual([]);
    });
  });

  describe('el código real no importa de dev/', () => {
    it('una página no puede importar el cliente simulado', async () => {
      expect(
        await restrictedImports(
          'apps/web/src/modules/auth/pages/LoginPage.tsx',
          '../dev/auth-demo-client.ts',
        ),
      ).toHaveLength(1);
    });

    it('main.tsx no puede importar dev/ de forma estática', async () => {
      expect(
        await restrictedImports('apps/web/src/main.tsx', './modules/auth/dev/ScenarioPicker.tsx'),
      ).toContainEqual(expect.stringContaining('no importa de dev/'));
    });

    it('las pruebas y los archivos de dev/ sí pueden', async () => {
      expect(
        await restrictedImports(
          'apps/web/src/modules/auth/components/LoginForm.test.tsx',
          '../dev/auth-demo-client.ts',
        ),
      ).toEqual([]);
      expect(
        await restrictedImports(
          'apps/web/src/modules/auth/dev/auth-demo-client.ts',
          './fixtures.ts',
        ),
      ).toEqual([]);
    });
  });

  describe('los módulos solo se importan por su index.ts', () => {
    it.each([
      ['apps/web/src/routes.tsx', './modules/auth/pages/LoginPage.tsx'],
      ['apps/web/src/shared/layout/Shell.tsx', '../../modules/auth/components/useSession.ts'],
      ['apps/web/src/modules/sales/pages/SalesPage.tsx', '../../auth/components/useSession.ts'],
      ['apps/web/src/modules/sales/SalesPage.tsx', '../auth/components/useSession.ts'],
      ['apps/api/src/app.ts', './modules/auth/auth.routes.ts'],
      ['apps/api/src/modules/sales/sales.routes.ts', '../auth/auth.hook.ts'],
      // Módulo menu (SPEC-002).
      ['apps/web/src/routes.tsx', './modules/menu/pages/MenuAdminPage.tsx'],
      ['apps/web/src/modules/auth/pages/HomePage.tsx', '../../menu/api/menu-client.ts'],
      ['apps/web/src/modules/menu/pages/MenuPage.tsx', '../../auth/components/useSession.ts'],
      ['apps/api/src/app.ts', './modules/menu/menu.routes.ts'],
      ['apps/api/src/modules/menu/menu.routes.ts', '../auth/auth.hook.ts'],
      ['apps/api/src/modules/sales/sales.service.ts', '../menu/menu.views.ts'],
      // Módulo sales (SPEC-003).
      ['apps/web/src/routes.tsx', './modules/sales/pages/NewSalePage.tsx'],
      ['apps/web/src/main.tsx', './modules/sales/api/sales-client.ts'],
      [
        'apps/web/src/modules/auth/components/SessionProvider.tsx',
        '../../sales/state/draft-store.ts',
      ],
      ['apps/web/src/modules/sales/state/useSaleDraft.ts', '../../menu/api/menu-client.ts'],
      ['apps/api/src/app.ts', './modules/sales/sales.routes.ts'],
      ['apps/api/src/modules/sales/sales.service.ts', '../menu/products.repository.ts'],
      ['apps/api/src/modules/menu/menu.views.ts', '../sales/sales.repository.ts'],
    ])('%s no puede importar %s', async (file, specifier) => {
      expect(await restrictedImports(file, specifier)).toHaveLength(1);
    });

    it.each([
      ['apps/web/src/routes.tsx', './modules/auth/index.ts'],
      ['apps/web/src/modules/sales/pages/SalesPage.tsx', '../../auth/index.ts'],
      ['apps/web/src/modules/auth/pages/LoginPage.tsx', '../components/LoginForm.tsx'],
      ['apps/web/src/modules/auth/api/auth-client.ts', '../../../shared/http/api-fetch.ts'],
      ['apps/api/src/app.ts', './modules/auth/index.ts'],
      ['apps/api/src/modules/sales/sales.routes.ts', '../auth/index.ts'],
      ['apps/api/src/modules/auth/auth.routes.ts', './auth.service.ts'],
      ['apps/api/src/modules/auth/auth.routes.ts', '../../shared/http/errors.ts'],
      ['apps/web/src/routes.tsx', './modules/menu/index.ts'],
      ['apps/web/src/modules/menu/pages/MenuAdminPage.tsx', '../../auth/index.ts'],
      ['apps/web/src/modules/menu/pages/MenuAdminPage.tsx', '../components/ProductForm.tsx'],
      ['apps/api/src/app.ts', './modules/menu/index.ts'],
      ['apps/api/src/modules/menu/menu.routes.ts', '../auth/index.ts'],
      ['apps/api/src/modules/sales/sales.service.ts', '../menu/index.ts'],
      ['apps/web/src/routes.tsx', './modules/sales/index.ts'],
      ['apps/web/src/modules/sales/pages/NewSalePage.tsx', '../../auth/index.ts'],
      ['apps/web/src/modules/sales/pages/NewSalePage.tsx', '../state/useSaleDraft.ts'],
      ['apps/web/src/modules/sales/state/useSaleDraft.ts', '../api/sales-client.ts'],
      ['apps/api/src/app.ts', './modules/sales/index.ts'],
      ['apps/api/src/modules/sales/sales.routes.ts', './sales.service.ts'],
      ['apps/api/src/modules/sales/sales.repository.ts', '../../shared/database/database.ts'],
    ])('%s sí puede importar %s', async (file, specifier) => {
      expect(await restrictedImports(file, specifier)).toEqual([]);
    });
  });
});
