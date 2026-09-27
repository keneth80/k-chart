import type {
  CanvasSource,
  GeoJSONSource,
  Map as MapLibreMap,
  MapMouseEvent
} from 'maplibre-gl';
import type {FeatureCollection, LineString, Point, Polygon} from 'geojson';
import {
  type Bounds,
  type FieldFrame,
  type SubcellField,
  contains,
  mixFrames,
  sampleFrame,
  unionBounds,
  validateFrame
} from './model';
import {paintRaster} from './raster';
import {makeFrame, PROBES, SELECTED_CELL_ID} from './synthetic';

export interface HeatmapPick {
  longitude: number;
  latitude: number;
  value: number | null;
  cellId: string | null;
}

export interface HeatmapOptions {
  showGrid?: boolean;
  showSamples?: boolean;
  showCellOutline?: boolean;
  /** Keep low values opaque, or fade their alpha from zero to the high-value maximum. */
  showLowValueBackground?: boolean;
  style?: string;
  /** Cancels adapter initialization when a host switches examples mid-load. */
  signal?: AbortSignal;
  /** Example-local callback, not a KChart adapter configuration field. */
  onPick?: (pick: HeatmapPick) => void;
  onFrame?: (frame: FieldFrame) => void;
  onError?: (error: Error) => void;
}

export interface FlatMapControllerLike {
  show(options: {lat: number; lon: number; zoom?: number}): Promise<void>;
  resize(): void;
  destroy(): void;
  /** MapLibre major versions have incompatible nominal types; validate after this boundary. */
  getMap(): unknown;
}

export type FlatMapFactory = (configuration: {
  container: string | HTMLElement;
  style: string;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  renderWorldCopies?: boolean;
  maxBounds?: [[number, number], [number, number]];
  toolbar?: {visible?: boolean};
  cluster?: boolean;
}) => FlatMapControllerLike;

export interface SubcellHeatmapController {
  setFrame(frame: FieldFrame, animate?: boolean): void;
  setGridVisible(visible: boolean): void;
  setSamplesVisible(visible: boolean): void;
  setCellOutlineVisible(visible: boolean): void;
  setLowValueBackgroundVisible(visible: boolean): void;
  focus(mode: 'world' | 'region' | 'cell'): void;
  getState(): {
    frame: FieldFrame;
    selectedId: string;
    showGrid: boolean;
    showSamples: boolean;
    showCellOutline: boolean;
    showLowValueBackground: boolean;
  };
  getMap(): MapLibreMap;
  destroy(): void;
}

let nextId = 0;

function abortError(): Error {
  const error = new Error('Subcell heatmap initialization was cancelled.');
  error.name = 'AbortError';
  return error;
}

function ring(bounds: Bounds): number[][] {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.south],
    [bounds.east, bounds.north],
    [bounds.west, bounds.north],
    [bounds.west, bounds.south]
  ];
}

function selectionGeo(cell: SubcellField): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {id: cell.id},
      geometry: {type: 'Polygon', coordinates: [ring(cell.bounds)]}
    }]
  };
}

function gridGeo(bounds: Bounds): FeatureCollection<LineString> {
  const features: FeatureCollection<LineString>['features'] = [];
  for (let longitude = bounds.west; longitude <= bounds.east + 1e-9; longitude += 0.5) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[longitude, bounds.south], [longitude, bounds.north]]
      }
    });
  }
  for (let latitude = bounds.south; latitude <= bounds.north + 1e-9; latitude += 0.5) {
    features.push({
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[bounds.west, latitude], [bounds.east, latitude]]
      }
    });
  }
  return {type: 'FeatureCollection', features};
}

function samplesGeo(cell: SubcellField): FeatureCollection<Point> {
  const features: FeatureCollection<Point>['features'] = [];
  // All 2,601 nodes feed the field; only a representative subset is drawn as points.
  for (let row = 0; row < cell.rows; row += 5) {
    for (let column = 0; column < cell.columns; column += 5) {
      features.push({
        type: 'Feature',
        properties: {value: cell.values[row * cell.columns + column]},
        geometry: {
          type: 'Point',
          coordinates: [
            cell.bounds.west + column / (cell.columns - 1) * 0.5,
            cell.bounds.north - row / (cell.rows - 1) * 0.5
          ]
        }
      });
    }
  }
  return {type: 'FeatureCollection', features};
}

/**
 * Example renderer built on an injected, real KChart MapLibre adapter factory.
 * The injection lets the repository demo exercise local adapter source while
 * the standalone example exercises the published adapter package.
 */
export async function createSubcellHeatmapDemoWithAdapter(
  container: string | HTMLElement,
  createFlatMap: FlatMapFactory,
  options: HeatmapOptions = {}
): Promise<SubcellHeatmapController> {
  let current = makeFrame(0);
  let selectedId = SELECTED_CELL_ID;
  const bounds = unionBounds(current.cells);
  const prefix = `kchart-subcell-${++nextId}`;
  const id = (suffix: string): string => `${prefix}-${suffix}`;
  let destroyed = false;
  let raf = 0;
  let animationEpoch = 0;
  let pauseTimer = 0;
  let lowValueBackgroundVisible = options.showLowValueBackground ?? true;

  const canvas = document.createElement('canvas');
  // MapLibre 5 renders 64 * 2^n square CanvasSources black (maplibre-gl-js#6607).
  canvas.width = 511;
  canvas.height = 511;
  canvas.id = prefix;
  // Keep a drawable layout box for MapLibre 5 while placing the source canvas off-screen.
  canvas.style.position = 'fixed';
  canvas.style.left = '-10000px';
  canvas.style.top = '-10000px';
  canvas.style.pointerEvents = 'none';
  canvas.dataset.subcellHeatmap = prefix;
  let controller: FlatMapControllerLike | undefined;
  let rejectAbort: ((error: Error) => void) | undefined;
  let initializationCleaned = false;
  const cleanupInitialization = (): void => {
    if (initializationCleaned) return;
    initializationCleaned = true;
    controller?.destroy();
    canvas.remove();
  };
  const onInitializationAbort = (): void => {
    destroyed = true;
    cleanupInitialization();
    rejectAbort?.(abortError());
  };
  try {
    if (options.signal?.aborted) throw abortError();
    options.signal?.addEventListener('abort', onInitializationAbort, {once: true});
    document.body.appendChild(canvas);
    paintRaster(canvas, current, bounds, lowValueBackgroundVisible);
    controller = createFlatMap({
      container,
      style: options.style ?? 'https://tiles.openfreemap.org/styles/liberty',
      initialZoom: 9,
      minZoom: 1,
      maxZoom: 15,
      renderWorldCopies: false,
      toolbar: {visible: false},
      cluster: false
    });
    const show = controller.show({lat: 37.75, lon: 126.75, zoom: 9});
    if (options.signal) {
      const aborted = new Promise<never>((_resolve, reject) => {
        rejectAbort = reject;
      });
      await Promise.race([show, aborted]);
    } else {
      await show;
    }
  } catch (error) {
    options.signal?.removeEventListener('abort', onInitializationAbort);
    cleanupInitialization();
    throw error;
  }
  options.signal?.removeEventListener('abort', onInitializationAbort);
  if (!controller) {
    cleanupInitialization();
    throw new Error('KChart adapter was not created.');
  }

  const maybeMap = controller.getMap();
  if (!maybeMap) {
    controller.destroy();
    canvas.remove();
    throw new Error('KChart adapter returned no MapLibre instance.');
  }
  const map = maybeMap as MapLibreMap;
  const onMapError = (event: unknown): void => {
    const cause = (event as {error?: unknown}).error;
    options.onError?.(cause instanceof Error ? cause : new Error(String(cause ?? 'MapLibre runtime error')));
  };
  map.on('error', onMapError);
  const selected = (): SubcellField => current.cells.find((cell) => cell.id === selectedId)!;
  let gridVisible = options.showGrid ?? false;
  let samplesVisible = options.showSamples ?? false;
  let cellOutlineVisible = options.showCellOutline ?? false;

  const addGeo = (name: string, data: FeatureCollection): void => {
    map.addSource(id(name), {type: 'geojson', data});
  };
  const pauseCanvas = (): void => {
    if (!destroyed) {
      (map.getSource(id('raster')) as CanvasSource | undefined)?.pause();
    }
  };
  const refreshCanvas = (): void => {
    (map.getSource(id('raster')) as CanvasSource).play();
    map.triggerRepaint();
    window.clearTimeout(pauseTimer);
    // Keep the source active long enough for MapLibre 5 to allocate its source tile.
    pauseTimer = window.setTimeout(pauseCanvas, 500);
  };

  try {
    map.addSource(id('raster'), {
      type: 'canvas',
      canvas: canvas.id,
      animate: false,
      coordinates: [
        [bounds.west, bounds.north],
        [bounds.east, bounds.north],
        [bounds.east, bounds.south],
        [bounds.west, bounds.south]
      ]
    });
    // Scalars are interpolated before color mapping. Nearest avoids filling missing gaps.
    map.addLayer({
      id: id('field'),
      type: 'raster',
      source: id('raster'),
      paint: {'raster-opacity': 1, 'raster-fade-duration': 0, 'raster-resampling': 'nearest'}
    });
    addGeo('grid', gridGeo(bounds));
    map.addLayer({
      id: id('grid-lines'),
      type: 'line',
      source: id('grid'),
      layout: {visibility: gridVisible ? 'visible' : 'none'},
      paint: {'line-color': '#d8eef2', 'line-width': 0.65, 'line-opacity': 0.26}
    });
    addGeo('selection', selectionGeo(selected()));
    map.addLayer({
      id: id('selected-line'),
      type: 'line',
      source: id('selection'),
      layout: {visibility: cellOutlineVisible ? 'visible' : 'none'},
      paint: {'line-color': '#73cfc3', 'line-width': 1, 'line-opacity': 0.55}
    });
    addGeo('samples', samplesGeo(selected()));
    map.addLayer({
      id: id('sample-points'),
      type: 'circle',
      source: id('samples'),
      minzoom: 7,
      layout: {visibility: samplesVisible ? 'visible' : 'none'},
      paint: {
        'circle-radius': 2,
        'circle-color': '#0d2637',
        'circle-stroke-width': 0.5,
        'circle-stroke-color': '#ffffff'
      }
    });
    addGeo('probes', {
      type: 'FeatureCollection',
      features: PROBES.map((probe) => ({
        type: 'Feature',
        properties: {name: probe.name},
        geometry: {type: 'Point', coordinates: [probe.longitude, probe.latitude]}
      }))
    });
    map.addLayer({
      id: id('probe-points'),
      type: 'circle',
      source: id('probes'),
      minzoom: 6,
      paint: {
        'circle-radius': 6,
        'circle-color': '#ffffff',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#153c58'
      }
    });
    addGeo('locator', {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: {type: 'Point', coordinates: [126.75, 37.75]}
      }]
    });
    map.addLayer({
      id: id('world-location'),
      type: 'circle',
      source: id('locator'),
      maxzoom: 6,
      paint: {
        'circle-radius': 7,
        'circle-color': '#ed7353',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2
      }
    });
    // MapLibre 5 does not upload an idle CanvasSource until it is explicitly played once.
    refreshCanvas();
  } catch (error) {
    map.off('error', onMapError);
    controller.destroy();
    canvas.remove();
    throw error;
  }

  const updateSelection = (): void => {
    (map.getSource(id('selection')) as GeoJSONSource).setData(selectionGeo(selected()));
    (map.getSource(id('samples')) as GeoJSONSource).setData(samplesGeo(selected()));
  };
  const focus = (mode: 'world' | 'region' | 'cell'): void => {
    if (destroyed) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (mode === 'world') {
      map.flyTo({center: [25, 20], zoom: 1.5, duration: reduced ? 0 : 700});
      return;
    }
    const target = mode === 'cell' ? selected().bounds : bounds;
    map.fitBounds(
      [[target.west, target.south], [target.east, target.north]],
      {padding: 55, duration: reduced ? 0 : 600, maxZoom: 12}
    );
  };
  const onClick = (event: MapMouseEvent): void => {
    if (destroyed) return;
    if (map.getZoom() < 6) {
      const hits = map.queryRenderedFeatures(event.point, {layers: [id('world-location')]});
      if (hits.length) {
        focus('cell');
        return;
      }
    }
    const longitude = event.lngLat.lng;
    const latitude = event.lngLat.lat;
    const cell = current.cells.find((candidate) => contains(candidate.bounds, longitude, latitude));
    if (cell) {
      selectedId = cell.id;
      updateSelection();
    }
    options.onPick?.({
      longitude,
      latitude,
      value: sampleFrame(current, longitude, latitude),
      cellId: cell?.id ?? null
    });
  };
  map.on('click', onClick);

  const host = typeof container === 'string'
    ? document.querySelector<HTMLElement>(container)
    : container;
  const observer = new ResizeObserver(() => {
    if (!destroyed) controller.resize();
  });
  if (host) observer.observe(host);

  const apply = (frame: FieldFrame): void => {
    current = frame;
    paintRaster(canvas, current, bounds, lowValueBackgroundVisible);
    refreshCanvas();
    updateSelection();
    options.onFrame?.(current);
  };
  const setFrame = (next: FieldFrame, animate = true): void => {
    if (destroyed) throw new Error('Demo has been destroyed.');
    validateFrame(next);
    // Validate compatibility before interrupting an active transition.
    mixFrames(current, next, 0);
    cancelAnimationFrame(raf);
    const epoch = ++animationEpoch;
    const previous = current;
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      apply(next);
      return;
    }
    const started = performance.now();
    let lastPaint = -Infinity;
    const tick = (now: number): void => {
      if (destroyed || epoch !== animationEpoch) return;
      const progress = Math.min(1, (now - started) / 700);
      // Repaint at roughly 10 Hz; the idle canvas has no permanent animation loop.
      if (now - lastPaint >= 100 || progress === 1) {
        apply(mixFrames(previous, next, progress));
        lastPaint = now;
      }
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  };

  focus('cell');
  options.onFrame?.(current);

  return {
    setFrame,
    setGridVisible(visible) {
      if (destroyed) return;
      gridVisible = visible;
      // Grid visibility never mutates the raster, probes, or selected cell layers.
      map.setLayoutProperty(id('grid-lines'), 'visibility', visible ? 'visible' : 'none');
    },
    setSamplesVisible(visible) {
      if (destroyed) return;
      samplesVisible = visible;
      map.setLayoutProperty(id('sample-points'), 'visibility', visible ? 'visible' : 'none');
    },
    setCellOutlineVisible(visible) {
      if (destroyed) return;
      cellOutlineVisible = visible;
      map.setLayoutProperty(id('selected-line'), 'visibility', visible ? 'visible' : 'none');
    },
    setLowValueBackgroundVisible(visible) {
      if (destroyed) return;
      lowValueBackgroundVisible = visible;
      paintRaster(canvas, current, bounds, lowValueBackgroundVisible);
      refreshCanvas();
    },
    focus,
    getState: () => ({
      frame: current,
      selectedId,
      showGrid: gridVisible,
      showSamples: samplesVisible,
      showCellOutline: cellOutlineVisible,
      showLowValueBackground: lowValueBackgroundVisible
    }),
    getMap: () => map,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      animationEpoch += 1;
      cancelAnimationFrame(raf);
      window.clearTimeout(pauseTimer);
      observer.disconnect();
      map.off('click', onClick);
      map.off('error', onMapError);
      (map.getSource(id('raster')) as CanvasSource | undefined)?.pause();
      // The adapter owns the map and releases every custom source/layer with it.
      controller.destroy();
      canvas.remove();
    }
  };
}
