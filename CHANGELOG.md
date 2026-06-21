# Changelog

## Unreleased

### Added

- Added `drilldown.transition` with `warp`, `cloud`, and `none` modes.
- Added a Canvas cloud-cover transition that waits for asynchronous external-map loading before revealing the destination.
- Added reverse cloud cover when returning from a flat map to the globe.

### Changed

- Slowed the recommended cloud transition to 2.6 seconds and delayed the opaque cover until the clouds have visibly gathered.

## 1.7.1 - 2026-06-19

### Fixed

- Fixed automatic globe drilldown selecting a city such as Seoul while opening the flat map at a stale viewport coordinate in another region.
- Preserved the selected marker's latitude and longitude when wheel or button zoom crosses the automatic map threshold.
- Restored the globe automatically when MapLibre style or tile initialization fails instead of leaving an empty external-map view.
- Allowed local webpack HMR connections from both `localhost` and `127.0.0.1` without `Invalid Host/Origin header` errors.

### Packages

- Published `@keneth80/k-chart@1.7.1`.
- Published `@keneth80/k-chart-maplibre@0.1.1`.

## 1.7.0 - 2026-06-19

### Added

- Added `createTooltipNoteOption()` for pinning hover tooltip snapshots as editable chart annotations.
- Added draggable tooltip note headers, chart-bound position constraints, delete controls, memo textareas, and `onChange` synchronization.
- Added a Three.js custom-series example that renders the Aries constellation with glowing stars and linked nodes.
- Added reusable MapLibre place parsing and city-based place resolver utilities.
- Added public package entry points for `core`, `series`, `options`, `utils`, and `worker`.

### Changed

- Split the chart runtime into dedicated core, series, option, worker, and utility modules while preserving the root package API.
- Kept pinned annotations independent from normal hover tooltips so chart inspection continues while notes remain visible.
- Updated the playground, README, functional API guide, and handoff documentation for the modular imports and tooltip note workflow.

### Fixed

- Constrained manually positioned tooltip notes to the chart bounds after dragging or resizing.
- Prevented note delete and textarea interactions from being interpreted as header dragging.

## 1.6.0 - 2026-06-18

### Added

- Added optional globe marker drilldown with `mode: 'zoom'` for same-globe coordinate focus and `mode: 'map'` for focused Mercator map mode, both with a lightweight warp overlay and return control.
- Added separate Globe Zoom and Globe Map demo entries so zoom focus and flat-map drilldown can be tested independently.
- Added `mode: 'external-map'` for integrating a real tile map after the globe warp transition.
- Added the optional `@keneth80/k-chart-maplibre` adapter package with MapLibre place markers, address popups, map navigation, and a return-to-globe bridge.
- Added automatic map transition thresholds that use the globe's settled center coordinate after dragging.

### Changed

- Smoothed the globe-to-map transition into camera focus, centered warp, and delayed map reveal stages.
- Automatic zoom drilldown now preserves the coordinate being viewed instead of recentering on a nearby marker.
- Reused MapLibre maps are positioned at the next destination before becoming visible.
- Marker activation now occurs on stationary pointer release and is cancelled after more than 5px of movement.

### Fixed

- Fixed incorrect city selection when wheel zooming near a marker.
- Fixed low-zoom marker input being captured by globe dragging.
- Fixed unsafe globe zoom restoration when returning from the flat map.
- Fixed previous city content briefly appearing during a subsequent map transition.

## 1.5.0 - 2026-06-14

### Added

- Added `createSvgGlobeSeries` for draggable SVG orthographic globe maps with latitude/longitude markers and marker click callbacks.
- Added a default World Atlas 110m land layer for globe maps, with `landVisible` and `landGeoJson` controls.
- Added feature-level `landFill`, `landStroke`, and `landOpacity` styling callbacks for globe map land/country layers.
- Added optional globe wheel, pinch, and in-chart button zoom controls through `createSvgGlobeSeries({ zoom })`.
- Changed the default globe land rendering to a smooth World Atlas land layer with country borders as a mesh; country fills remain available through `landMode: 'countries'`.

## 1.4.0 - 2026-06-13

### Added

- Added `createCanvasCandlestickSeries` for Canvas OHLC candlestick charts.
- Added axis `domainFields` support so one axis can derive its domain from multiple fields such as `low` and `high`.
- Added `zoom.wheelZoom` and `zoom.gestureZoom` options to separate PC wheel/trackpad zoom from mobile touch gesture zoom.
- Added candlestick `colorMode: 'previous-close'` and `previousCloseField` support for previous-close based stock coloring.

## 1.3.0

### Added

- Added chart-level `zoom` configuration for number and time axes.
- Added `zoom.mode` support for `wheel`, `select`, and `both`.
- Added wheel/trackpad zoom, drag pan, double-click reset, and drag-selection zoom interactions.
- Added zoom callback context with visible x/y domains and active transform state.
- Enabled zoom examples for Canvas BigData and WebGL BigData demos.
- Added `d3-zoom` as a runtime dependency and direct `@types/d3-zoom` typing support.

### Changed

- Updated the functional API guide and README with zoom usage examples.
- Preserved initial axes separately from active zoom axes so reset returns to the original domain.

## 1.2.0

### Added

- Added `startKChartRenderWorker` for OffscreenCanvas worker rendering.
- Added optional `asyncRender` support for Canvas and WebGL line series.
- Added automatic main-thread fallback when OffscreenCanvas or a worker factory is unavailable.
- Optimized WebGL point rendering with an interleaved position/size buffer.
- Reduced WebGL line renderer array conversion overhead by building typed arrays directly.

## 1.1.0

### Added

- Added exported `downsampleLTTB` utility for generic TypeScript data arrays.
- Added optional LTTB `downsample` support for SVG, Canvas, and WebGL line series.

## 1.0.0

### Added

- Published KChart as a class-free functional TypeScript chart runtime.
- Added SVG, Canvas, and WebGL series renderer factories.
- Added `createCustomSeries` for custom SVG, Canvas, and WebGL visualizations.
- Added chart options for spec areas, guide lines, cursor lines, legends, and tooltips.
- Added optional `crossFilter` support for large numeric/time zoom-in ranges.
- Added dark/light demo styling and chart style options.

### Changed

- Refactored chart creation toward functional APIs.
- Exposed `KChartController` for UI-friendly integration and lifecycle control.
- Migrated build tooling to modern Babel, Webpack, and TypeScript versions.

### Migration Notes

- Use imports from `@keneth80/k-chart`.
- Use `createKChart(...)` and series factory functions instead of class-based chart construction.
