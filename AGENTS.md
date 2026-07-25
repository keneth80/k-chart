# KChart repository instructions

## Purpose

KChart is a functional TypeScript chart runtime. Axes and series are separate, and SVG, Canvas, WebGL, and optional 3D/map adapters can be composed without class inheritance.

## Read before changing chart APIs

- `docs/configuration-reference.md`
- `docs/functional-api.md`
- `docs/ai/index.md`
- `ai/catalog.json`

## Commands

```bash
npm run typecheck
npm run test:unit
npm run build
```

After changing AI metadata or schema:

```bash
npm run generate:ai
npm run test:unit
```

## Engineering rules

- Preserve the public functional API unless a versioned migration is intentional.
- Keep core, series, options, presets, and optional adapters in their existing ownership boundaries.
- Prefer public factories from package barrel exports.
- Treat `recipe.*` as documented compositions, not importable factory names.
- Do not allow model output to execute JavaScript or TypeScript.
- Validate `ChartPlan` before compiling configuration.
- Keep realtime buffers bounded and clean up timers, workers, observers, and controllers.
- Keep Cesium, MapLibre, and other provider tokens user-supplied.
- Add focused tests for public behavior and run existing unit tests.

## AI source of truth

`src/ai/catalog.ts` and `src/ai/schema.ts` are canonical. `ai/catalog.json` and `ai/chart-plan.schema.json` are generated artifacts and must not be edited by hand.
