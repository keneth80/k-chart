# KChart Refactor Plan

## Current Structure

```txt
src/
 ├─ index.ts       public export surface
 ├─ kchart.ts      class-free chart runtime
 ├─ main.ts        playground demo
 ├─ style.css      playground and chart theme
 └─ types/         local asset/type declarations
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
} from 'kchart';
```

`src/index.ts` exports only `src/kchart.ts`, so package consumers do not receive the old class-based API.

## Completed Migration

1. Added `src/kchart.ts` as the functional runtime.
2. Replaced the public package surface with KChart-only exports.
3. Replaced legacy playground entry with KChart examples.
4. Removed legacy class-based chart source from `src/component`.
5. Reduced package `files` so published tarballs include only KChart runtime output.
6. Reduced runtime dependencies to the D3 modules used by `src/kchart.ts`.
7. Added built-in Canvas 2D line and point renderer factories.
8. Added built-in WebGL point renderer factory.
9. Added title, grid, legend, and axis title display options.
10. Added basic nearest-point tooltip support.

## Remaining Roadmap

1. Add zoom/pan behavior as a runtime plugin.
2. Add richer tooltip modes, fixed tooltip positioning, and crosshair support.
3. Add built-in WebGL line renderer.
4. Add focused tests for scale resolution, resize, SVG line render, Canvas/WebGL renderers, tooltip, and custom renderer context.
