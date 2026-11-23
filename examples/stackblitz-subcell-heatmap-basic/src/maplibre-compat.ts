import * as maplibregl from 'maplibre-gl/dist/maplibre-gl.mjs';

// Adapter 0.2.0 expects the MapLibre namespace as a CommonJS default export.
// Pin the matching module worker because adapter 0.2.0's CommonJS bundle hides import.meta.url.
maplibregl.setWorkerUrl('https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl-worker.mjs');
export default maplibregl;
