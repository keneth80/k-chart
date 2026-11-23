# KChart Architecture Refactor Record

> Status: completed. This document records the class-free modularization that
> produced the current public runtime; it is not an active feature roadmap.

## Current Structure

```txt
src/
 ├─ index.ts       public export surface
 ├─ kchart.ts      compatibility barrel for functional imports
 ├─ core/          contracts, state, scales, layers, and lifecycle
 ├─ series/        SVG, Canvas, WebGL, and custom renderers
 ├─ options/       guide lines, spec areas, navigator, and notes
 ├─ presets/       simple chart factories and fluent builder
 ├─ worker/        OffscreenCanvas worker entry
 ├─ utils/         public renderer-independent algorithms
 ├─ internal/      runtime implementation helpers
 └─ ai/            chart planning schema and compiler
```

## Runtime Responsibility Split

```txt
createKChart(config)
 ├─ resolve container and size
 ├─ create SVG / Canvas / WebGL layers
 ├─ resolve axes into D3 scales
 ├─ render axes
 └─ call series renderers
      ├─ built-in renderer factory
      └─ custom renderer function
```

KChart keeps axis, scale, layout, and layer ownership in the runtime. Visual rendering belongs to series functions. A series receives prepared scale and layer context, so the same chart can host SVG, Canvas, and WebGL renderers without requiring class inheritance.

## Public API

```ts
import {
    createKChart,
    createLineSeries,
    createCustomSeries,
    KChartController,
    KChartSeries
} from '@keneth80/k-chart';
```

`src/index.ts` exports the supported functional root API. The `package.json`
exports map exposes documented category subpaths, while `src/kchart.ts`
preserves compatible functional imports. Legacy class implementations are not
part of the public package surface.

## Completed Migration

1. Replaced the legacy class implementation with `createKChart(...)` and
   `KChartController`.
2. Split runtime ownership into `core`, `series`, `options`, `presets`,
   `worker`, `utils`, and `internal` modules.
3. Added SVG, Canvas 2D, WebGL, and Custom Series renderers behind one series
   contract.
4. Added zoom/pan, tooltip and cursor modes, worker rendering, animation,
   range navigation, and focused regression tests.
5. Added simple preset factories while retaining direct composition for custom
   visualization.
6. Kept Three.js, Cesium, and MapLibre integrations in optional packages.

## Ongoing Compatibility Principles

- Preserve documented functional root and subpath imports across compatible
  releases.
- Keep renderer and optional-adapter dependencies isolated so consumers load
  only the capabilities they use.
- Add behavior in the module that owns it and cover public contracts with
  focused regression tests.
- Record future feature work in issues or release plans rather than in this
  completed migration record.
