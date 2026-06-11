# Changelog

## Unreleased

### Added

- Added `createCanvasCandlestickSeries` for Canvas OHLC candlestick charts.
- Added axis `domainFields` support so one axis can derive its domain from multiple fields such as `low` and `high`.

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
