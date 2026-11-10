import {defineConfig} from 'vite';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));

function referencePages() {
  let config;
  return {
    name: 'prerender-reference',
    apply: 'build',
    configResolved(value) { config = value; },
    async closeBundle() {
      const {prerender} = await import(pathToFileURL(resolve(root, 'prerender.mjs')).href);
      await prerender({
        family: config.mode,
        base: config.base,
        outDir: resolve(config.root, config.build.outDir),
      });
    },
  };
}

export default defineConfig(({mode}) => {
  if (mode !== 'martlet') throw new Error('Choose the martlet mode');
  return {
    root,
    define: {__NIGHTJAR_PEER__: JSON.stringify(process.env.NIGHTJAR_PEER_URL || '')},
    base: process.env.NIGHTJAR_BASE || '/',
    plugins: [referencePages(), {
      name: 'react-family',
      resolveId(id) { if (id === 'catalog-family') return '\0catalog-family'; },
      load(id) {
        if (id === '\0catalog-family') return `export * from ${JSON.stringify(resolve(root, '../../src/index.tsx'))}; import ${JSON.stringify(resolve(root, '../../src/styles.css'))}; import '@${mode}/core/fonts.css'; export const family='${mode}';`;
      },
    }],
    build: {
      outDir: resolve(root, 'dist', mode),
      emptyOutDir: true,
      assetsInlineLimit: 0,
      manifest: true,
      rollupOptions: {input: {
        catalog: resolve(root, 'index.html'),
        dashboard: resolve(root, 'dashboard.html'),
        scientific: resolve(root, 'scientific.html'),
      }},
    },
  };
});
