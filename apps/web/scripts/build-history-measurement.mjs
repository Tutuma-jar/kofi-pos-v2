import { build } from 'vite';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export async function buildHistoryMeasurement(outputDirectory) {
  const outDir = outputDirectory ?? await mkdtemp(join(tmpdir(), 'kofi-history-runtime-'));
  const result = await build({
    configFile: false,
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    logLevel: 'error',
    build: {
      target: 'esnext',
      outDir: resolve(outDir),
      emptyOutDir: false,
      minify: false,
      lib: {
        entry: fileURLToPath(new URL('../../../scripts/history-measurement-core.mjs', import.meta.url)),
        formats: ['es'],
        fileName: () => 'history-measurement.mjs',
      },
    },
  });
  const chunks = (Array.isArray(result) ? result : [result]).flatMap(output => output.output).filter(file => file.type === 'chunk');
  if (chunks.length !== 1 || chunks[0].imports.length || chunks[0].dynamicImports.length) {
    throw new Error('El medidor debe producir un solo módulo sin importaciones externas');
  }
  return join(resolve(outDir), chunks[0].fileName);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(await buildHistoryMeasurement());
}
