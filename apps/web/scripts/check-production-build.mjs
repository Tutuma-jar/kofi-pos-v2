import { isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const webRoot = fileURLToPath(new URL('../', import.meta.url));

// Inspecciona el grafo de módulos real de Vite, independiente de la minificación y los textos.
export async function checkProductionBuild({
  root = webRoot,
  configFile = join(root, 'vite.config.ts'),
  write = true,
} = {}) {
  const sourceRoot = join(root, 'src');
  return build({
    root,
    configFile,
    mode: 'production',
    logLevel: 'silent',
    build: { write },
    plugins: [{
      name: 'exclude-dev-from-production',
      generateBundle() {
        const developmentModules = [...this.getModuleIds()].filter((id) => {
          const path = relative(sourceRoot, id.split('?')[0]).replaceAll('\\', '/');
          return !isAbsolute(path) && !path.startsWith('../') && path.split('/').includes('dev');
        });
        if (developmentModules.length) {
          this.error(`El build de producción incluye módulos de dev/:\n${developmentModules.map((id) => relative(root, id)).join('\n')}`);
        }
      },
    }],
  });
}

if (import.meta.main) {
  try {
    await checkProductionBuild();
    console.log('Build de producción comprobado: no incluye módulos de dev/.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'No se pudo comprobar el build de producción');
    process.exitCode = 1;
  }
}
