import {mountSubcellHeatmapApp} from './app.js';
import {createSubcellHeatmapDemo} from './heatmap-demo.js';
import './style.css';

async function main(): Promise<void> {
  const host = document.querySelector<HTMLElement>('#app');
  if (!host) throw new Error('Missing #app host.');
  const mounted = await mountSubcellHeatmapApp(host, createSubcellHeatmapDemo);
  window.addEventListener('pagehide', () => mounted.destroy(), {once: true});
  (window as typeof window & {subcellDemo?: typeof mounted}).subcellDemo = mounted;
}

void main().catch((error) => {
  console.error('[KChart subcell heat field]', error);
});
