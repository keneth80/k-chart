# KChart Subcell Heat Field

This standalone example uses the real `@keneth80/k-chart-maplibre` adapter and
adds a bounded MapLibre `CanvasSource` to the returned map. It is a separate
example and does not replace any existing single-color grid or choropleth map.

Each 0.5-degree cell contains 51 x 51 scalar node samples. The renderer samples
the values in geographic space with bilinear interpolation and applies one fixed
0-100 color scale across cells, frames, and zoom levels. It does not interpret
MapLibre point-density values as probabilities or percentages.

## Run

```bash
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

The map style and tiles come from OpenFreeMap, so runtime verification requires
network access and a working WebGL context.

## Behavior

- `showGrid` controls only the 0.5-degree grid-line layer.
- `showCellOutline` independently controls the selected-cell border and defaults
  to off, so the field remains the primary visual signal.
- `showLowValueBackground: false` removes the large low-value rectangle by
  scaling pixel alpha from zero to the high-value maximum. Values remain
  queryable even when their visual alpha is zero.
- The scalar raster, selected cell, probes, frame, and map position remain when
  grid lines are hidden.
- Numeric zero is a valid low value; `null` remains transparent, reveals the
  basemap as a rectangular no-data patch, and is never filled with zero.
- Coordinate clicks report the interpolated value at display time.
- The three frames are synthetic and are not disaster probabilities, damage
  ratios, or observed public-safety data.
- World view shows a small region locator instead of allocating a global
  high-resolution field.
- Antimeridian-crossing cells must be split before use, and input latitude is
  restricted to the Web Mercator range used by the example.
- The source canvas is intentionally 511 x 511. MapLibre 5 has a known black
  CanvasSource bug for square sizes shaped like `64 * 2^n` (including 512).

`createSubcellHeatmapDemo`, `mountSubcellHeatmapApp`, and their controller methods
are example-local APIs. They are not new KChart core or MapLibre adapter APIs.
