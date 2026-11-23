import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vite';

export default defineConfig({
  resolve: {
    // Adapter 0.2.0 is CommonJS; MapLibre 6 exposes an ESM-only root entry.
    // Vite can bridge the published adapter when the bare import resolves to the ESM build.
    alias: [{
      find: /^maplibre-gl$/,
      replacement: fileURLToPath(new URL('./src/maplibre-compat.ts', import.meta.url))
    }]
  }
});
