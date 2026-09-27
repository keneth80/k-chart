import {createMapLibreFlatMap} from '@keneth80/k-chart-maplibre';
import type {KChartMapLibrePlace} from '@keneth80/k-chart-maplibre';
import {
  createSubcellHeatmapDemoWithAdapter,
  type HeatmapOptions,
  type SubcellHeatmapController
} from './heatmap-demo-core.js';
import '@keneth80/k-chart-maplibre/style.css';
import 'maplibre-gl/dist/maplibre-gl.css';

/** Published-package entry used by the standalone and StackBlitz example. */
export function createSubcellHeatmapDemo(
  container: string | HTMLElement,
  options: HeatmapOptions = {}
): Promise<SubcellHeatmapController> {
  return createSubcellHeatmapDemoWithAdapter(
    container,
    (configuration) => createMapLibreFlatMap<KChartMapLibrePlace>(configuration),
    options
  );
}

export type {HeatmapOptions, SubcellHeatmapController};
