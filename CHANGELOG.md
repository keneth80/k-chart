# Changelog

## 1.12.0 - 2026-07-03

### Added

- Added `zoom` support to `createGeoRegionMapSeries()` for wheel zoom, drag pan, and in-chart zoom controls.

### Changed

- Updated the Korea Region Map example to use centroid labels and choropleth colors instead of dense callout guide lines.
- Documented region map zoom options in the functional API guide and configuration reference.

### Packages

- Published `@keneth80/k-chart@1.12.0`.

## 1.11.0 - 2026-07-02

### Added

- Added `createGeoRegionMapSeries()` for SVG choropleth/region maps backed by user-provided GeoJSON.
- Added `createWorldCountryMapSeries()` with built-in `world-atlas` country geometry for country-level color maps.
- Added region map hover highlight, click callbacks, tooltip formatting, centroid labels, and callout labels.
- Added Korea Region Map and World Country Map StackBlitz examples.

### Changed

- Documented region map usage and linked the new map examples from README and the functional API guide.

### Packages

- Published `@keneth80/k-chart@1.11.0`.

## 1.10.0 - 2026-07-02

### Added

- Added a beginner-friendly preset API with `createLineChart()`, `createColumnChart()`, `createPieChart()`, and `createDoughnutChart()`.
- Added the chainable `chartConfig(data)` builder for composing common charts before dropping down to the full functional API.
- Added a `@keneth80/k-chart/presets` export path for lightweight beginner imports.
- Added a Simple API StackBlitz example for quick browser-based experimentation.
- Added chart animation configuration for series enter/update rendering, including SVG line, Canvas line, WebGL line, column, stacked column, plot, pie, doughnut, and radial examples.

### Changed

- Updated README and functional API docs with beginner quick starts, builder examples, and animation usage.

### Fixed

- Added segment-level hover and tooltip behavior for preset pie and doughnut charts.

### Packages

- Published `@keneth80/k-chart@1.10.0`.

## 1.9.0 - 2026-06-28

### Added

- Added the optional `@keneth80/k-chart-three` package for integrating Three.js scenes as KChart custom series.
- Added `createKThreeScene()` for reusable Three.js renderer, camera, lights, resize, pointer, and OrbitControls lifecycle management.
- Added `createThreeWaferSeries()` and `createWaferMonitorObject()` for semiconductor wafer monitoring with instanced die rendering, status colors, hover highlighting, and die click callbacks.
- Added `createWaferDies()` mock data generation for wafer demos and examples.
- Added a Three.js Wafer Monitor demo and usage snippet to the KChart playground.

### Fixed

- Ensured Three.js wafer canvases receive drag and wheel events by restoring canvas `pointer-events`, `touch-action`, cursor, and interaction z-index after KChart canvas layer updates.

### Packages

- Published `@keneth80/k-chart@1.9.0`.
- Published `@keneth80/k-chart-three@0.1.0`.

## 1.8.2 - 2026-06-26

### Added

- Added `realisticAtmosphere.disableLightingInFlatModes` to `@keneth80/k-chart-cesium` so applications can choose whether Cesium lighting remains active in 2D and Columbus View flat-map modes.

### Fixed

- Disabled Cesium globe lighting, ground atmosphere, and sky atmosphere automatically in flat-map modes by default, preventing the 3D day/night shadow from covering flat maps.

### Packages

- Published `@keneth80/k-chart-cesium@0.1.5`.
- Published `@keneth80/k-chart@1.8.2`.

## 1.8.1 - 2026-06-26

### Added

- Added `initialView` to `@keneth80/k-chart-cesium` so applications can set the first Cesium camera longitude, latitude, height, heading, pitch, and roll.
- Documented practical Cesium route setup guidance for dashboard panels, including camera height recommendations, `flyToOnAdd`, Natural Earth imagery, and provider/license cautions.

### Changed

- Updated the Cesium route demo to start from a stable Asia-Pacific camera view instead of relying on Cesium's default home camera.
- Reduced the demo atmosphere intensity so the Natural Earth texture remains visible instead of reading as a plain blue globe.

### Fixed

- Fixed the Cesium route demo appearing too low or too zoomed-in when timeline and animation controls were visible.

### Packages

- Published `@keneth80/k-chart-cesium@0.1.4`.
- Published `@keneth80/k-chart@1.8.1`.

## 1.8.0 - 2026-06-25

### Added

- Added `drilldown.transition` with `warp`, `cloud`, and `none` modes.
- Added a Canvas cloud-cover transition that waits for asynchronous external-map loading before revealing the destination.
- Added reverse cloud cover when returning from a flat map to the globe.
- Added the optional `@keneth80/k-chart-cesium` package for CesiumJS globes, static routes, timestamped movement playback, camera tracking, live route samples, and GeoJSON `LineString` input.
- Added a lazy-loaded Cesium route demo and Webpack asset deployment for Cesium Workers, ThirdParty, Assets, and Widgets.
- Added provider-neutral Cesium imagery, terrain, ion token, and attribution injection so applications own their map-data licensing choices.
- Added `realisticAtmosphere` for Cesium globe base color, sun lighting, ground atmosphere, and sky atmosphere tuning.
- Added a more natural SVG globe ocean gradient, atmosphere glow, land palette, and marker styling.

### Changed

- Slowed the recommended cloud transition to five seconds and delayed the opaque cover until the clouds have visibly gathered.
- Added separate `coverDuration` and `revealDuration` controls plus `respectReducedMotion` for preserving exact transition timing.
- Updated the Cesium demo to use the bundled Natural Earth II texture provider instead of road-map tiles, making the globe read more like Earth while keeping provider selection explicit.
- Documented CesiumJS, Cesium ion, and third-party provider licensing boundaries and clarified that KChart does not bundle map, terrain, satellite, or 3D Tiles data.

### Packages

- Published `@keneth80/k-chart@1.8.0`.
- Published `@keneth80/k-chart-cesium@0.1.0`.

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
