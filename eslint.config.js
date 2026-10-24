import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Reglas de imports (docs/architecture.md §4 y §5, D-11). no-restricted-imports no resuelve rutas,
// así que cada patrón se escribe sobre el texto del import y la profundidad del archivo.

const otherApp = (app) => ({
  regex: `^@kofi/${app}(/|$)|(^|/)${app}/(src|test)(/|$)`,
  message: 'Una aplicación nunca importa de otra: lo compartido va a packages/.',
});

const anyApp = {
  regex: '^@kofi/(api|web)(/|$)|(^|/)apps/',
  message: 'packages/ no depende de ninguna aplicación.',
};

const devFolder = {
  regex: '(^|/)dev(/|$)',
  message:
    'El código real no importa de dev/. Solo el punto de montaje lo hace, con import() dinámico bajo import.meta.env.DEV.',
};

const MODULE_INTERNALS = 'Los módulos se importan solo por su index.ts.';

// Desde fuera de modules/: modules/<m>/<cualquier cosa que no sea index.ts>.
const moduleInternalsFromOutside = {
  regex: '(^|/)modules/[^/]+/(?!index\\.ts$)[^/]',
  message: MODULE_INTERNALS,
};

// Desde un archivo a `depth` carpetas por debajo de modules/<m>/: subir hasta modules/ y entrar en
// otro módulo sin pasar por su index.ts.
const moduleInternalsFromDepth = (depth) => ({
  regex: `^(\\.\\./){${depth}}(?!\\.\\.)[^/]+/(?!index\\.ts$)[^/]`,
  message: MODULE_INTERNALS,
});

const restrict = (...patterns) => ({
  'no-restricted-imports': ['error', { patterns }],
});

const DEV_OR_TEST = '**/{dev/**,*.test.ts,*.test.tsx}';
const MAX_MODULE_DEPTH = 4;

// Una configuración por profundidad dentro de modules/, más la de fuera de modules/. En cada una,
// los archivos de dev/ y las pruebas no tienen la restricción de dev/.
function appImportRules(app, other, { restrictDev }) {
  const base = [otherApp(other), moduleInternalsFromOutside];
  const configs = [];
  const add = (files, patterns) => {
    configs.push({ files, rules: restrict(...patterns, ...(restrictDev ? [devFolder] : [])) });
    if (restrictDev)
      configs.push({ files: files.map((f) => [f, DEV_OR_TEST]), rules: restrict(...patterns) });
  };

  add([`apps/${app}/**/*.{ts,tsx}`], base);
  for (let depth = 1; depth <= MAX_MODULE_DEPTH; depth++) {
    add(
      [`apps/${app}/src/modules/*/${'*/'.repeat(depth - 1)}*.{ts,tsx}`],
      [...base, moduleInternalsFromDepth(depth)],
    );
  }
  return configs;
}

export default defineConfig([
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    'playwright-report/',
    'test-results/',
    // Flujo de trabajo del repositorio: tiene su propio estilo y sus pruebas (npm run test:git).
    'scripts/',
    '.githooks/',
    '.github/',
    '.agents/',
    '.claude/',
    '.codex/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  { files: ['packages/**/*.ts'], rules: restrict(anyApp) },
  ...appImportRules('api', 'web', { restrictDev: false }),
  ...appImportRules('web', 'api', { restrictDev: true }),
]);
