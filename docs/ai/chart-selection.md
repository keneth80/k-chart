# Chart and renderer selection

Use intent and data shape before visual style. The capability ids below are stable identifiers for AI plans; import names remain available in `ai/catalog.json`.

## Intent to capability

| User intent | Preferred capability | Notes |
| --- | --- | --- |
| Ordered trend | `preset.line` or `series.line.svg` | Use a time or numeric x-axis |
| Large trend | `series.line.canvas` | Supports LTTB and worker rendering |
| Very large trend | `series.line.webgl` | Prefer explicit domains and LTTB |
| Category comparison | `preset.column` or `series.bar.svg` | Keep categories scannable |
| Multi-field comparison | `series.column.grouped.svg` | Avoid too many segments |
| Part-to-whole | `preset.pie`, `preset.doughnut` | Prefer at most seven slices |
| Numeric distribution | `series.histogram.svg` | Input must already be binned |
| Summary and outliers | `series.box-plot.svg` | Requires five-number summary |
| Correlation | `series.scatter.svg` | Use Canvas/WebGL points for dense data |
| Financial OHLC | `series.candlestick.canvas` | Supports previous-close coloring |
| Running contribution | `series.waterfall.svg` | Mark totals explicitly |
| Hierarchy | `series.tree.svg`, `series.treemap.svg` | Tree for structure, treemap for magnitude |
| Relationship network | `series.graph.svg` | Source, target, and edge value |
| Weighted flow | `series.sankey.svg` | Source, target, and flow value |
| KPI against range | `series.gauge.svg` | One current value |
| Country or region comparison | `series.geo-region-map.svg` | Requires trusted geographic data |
| Global locations | `series.globe.svg` | Latitude and longitude in degrees |
| Domain-specific marks | `series.custom` | Application owns the render function |

## Renderer selection

### SVG

Choose SVG when the visible mark count is modest and individual elements need rich interaction, labels, accessibility hooks, or inspection in the DOM.

### Canvas

Choose Canvas for large or frequently updating line and point datasets. Canvas line can move rendering to an OffscreenCanvas worker when a worker factory is supplied. Await the render completion signal before taking screenshots or benchmark timestamps.

### WebGL

Choose WebGL for very large line and point data. KChart uses GPU buffers for these first-class series. Tooltip hit testing and custom interaction can require separate CPU-side logic.

## Axis and zoom rules

- Use `time` only for Date values or values deterministically converted to Date.
- Use `number` for continuous quantitative axes.
- Use `string` or `point` for categories.
- Do not recommend numeric zoom for a categorical x-axis unless the consuming application defines categorical paging.
- Explicit `axis.min` and `axis.max` avoid unnecessary domain discovery for known large-data domains.

## Realtime rules

- Keep a fixed duration or maximum point count.
- Reuse the controller's update methods instead of recreating the chart.
- Destroy intervals, workers, observers, and the controller on unmount.
- Use update animation with reduced-motion support.
- Separate data arrival frequency from visual frame frequency when events arrive faster than the display can update.

## Honest fallback

If no capability satisfies the request, return a warning and either:

1. select `series.custom` with a human-readable implementation requirement, or
2. decline to generate a chart.

Do not invent a factory or claim a recipe is a first-class series.
