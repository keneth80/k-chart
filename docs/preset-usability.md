# Preset API Notes

## Series Options

`chartConfig(data)` supports `line`, `column`, `area`, `scatter`, `bubble`,
`bar`, `candlestick`, `pie`, and `doughnut`. Cartesian methods bind the current `x(...)` and `y(...)`
fields and require both axes first. For 1.x compatibility, `line`, `column`, `pie`,
and `doughnut` retain deprecated overloads accepting their former whole-chart
option types. Chart/axis fields passed to these series methods remain ignored:
`.line({width: 400})` does not set chart width, and `x`, `y`, or `data` do not
replace the builder axes or data. Use fluent methods or `build(overrides)` for
chart settings and `x(...)` / `y(...)` for axes. The new series helpers retain
their existing series-only options and validation.

Opt into validation with `chartConfig(data, {strictOptions: true})` or with
`strictOptions: true` in an existing standalone preset's options. Strict mode
reports unsupported keys and incompatible line renderer options; default mode
continues ignoring previously ignored keys. The deprecated broad builder
overloads remain available even with strict validation: this is a runtime check,
not a distinct compile-time builder type. Standalone line/column/pie/doughnut
strict validation checks top-level option names; it is not a nested schema validator.

`lineWidth` is an SVG alias for `strokeWidth`; SVG prefers `strokeWidth` when both
are supplied. Canvas/WebGL prefer `lineWidth` and accept `strokeWidth` as a
fallback. In default mode Canvas/WebGL ignore all `dot`/`curve` values (including
`false`), SVG ignores `canvasName`, and unknown renderer strings supplied by
JavaScript retain the former SVG fallback. Strict mode rejects those combinations
and unknown renderer strings. TypeScript continues to list the supported renderer
strings only.

Standalone `createAreaChart`, `createScatterChart`, and `createBubbleChart` use
the existing series factories. Area defaults to a point x axis; scatter/bubble
default to numeric x/y axes. Builder axis types remain controlled by `x`/`y`.
Standalone `createBarChart` defaults to numeric x and point y, delegating to
`createBarSeries`. Builder `bar()` keeps the axis types, fields, placements,
domains, and `domainFields` supplied by `x(...)` and `y(...)`. Its options use
the existing factory names (`barHeight`, `radius`, `baseline`, etc.). The bar
factory clamps an implicit baseline to zero or the nearest current domain
boundary, consistently for rendering and tooltip hits. Explicit baselines remain
literal. This does not change automatic axis domains.

Standalone `createCandlestickChart` uses `createCanvasCandlestickSeries`, with
required `openField`, `highField`, `lowField`, and `closeField`. Its x axis defaults
to point; y defaults to numeric `closeField`. An optional y configuration and
builder `y(...)` must bind numeric `closeField`, otherwise a clear error is thrown.
Absent `domainFields` are inferred from all four OHLC fields without reading data;
multiple candles sharing the axis union their inferred fields, while explicit
`domainFields` remain unchanged. Replacing a builder axis resets its inference.
explicit `domainFields`, `domain`, `min`, and `max` are preserved. Builder methods
keep the existing axis placements and do not rewrite the input data. Canvas name,
width callback, colors, and remaining factory options are forwarded unchanged.

All standalone presets forward `autoResize`, `accessibility`, `theme`, and
`status`, in addition to their existing chart options. Root exports are provided
by the existing `src/index.ts` wildcard export.

## Columns

Column presets leave automatic numeric domains unchanged. No data-derived
`min`, `max`, or `domain` is injected at build time, so streaming `updateData`
calls retain automatic scaling when values grow or change sign. User `min`,
`max`, and `domain` remain authoritative, including one-sided bounds.
At render time the default baseline is zero if the resolved domain contains zero;
otherwise it is the nearest boundary, including reversed domains. An explicit
baseline is literal, even outside the resolved domain. Point scales use the
plot-width fallback rather than their zero bandwidth.

No automatic include-zero domain policy is introduced. Callers wanting zero
in the domain can supply explicit axis bounds; these are intentionally fixed.
An explicit baseline does not expand the domain.

## Ownership And Selectors

Each `build()` detaches configuration records and outer axes/series/options
arrays from the draft and other builds. These are editable snapshots, not frozen
objects. `data` and its datum objects retain caller identity without cloning or
traversal for snapshots. `build({data})` retains that exact replacement reference.
Renderer objects retain identity across builds, including custom/stateful series;
their callback closures and opaque DOM/renderer instances are not cloned.
Callers continue to own mutations to data and renderer instances.

Preset-owned nested style options are captured when adding a series. Generated
class tokens preserve legacy simple names and deterministically encode unsafe
names, including spaces, percent signs, dots, and leading digits. Original field
access and display names are unchanged. Repeated generated selectors in one
builder receive unique suffixes. Custom series selectors remain caller-owned.

## Verification And Deferred Scope

Run `npm run build:lib`, then `node --test tests/preset-usability.test.cjs`.
The dedicated suite checks exports, defaults, literal/truncated/animated column
baselines, authoritative bounds, sign-changing data with unchanged automatic
axes, point-scale widths, invalid options, renderer
compatibility, selector safety, snapshot/data/renderer identity, a guarded
five-million-length data array, nested styles, area/scatter/bubble rendering,
bar geometry/style/tooltips, candlestick Canvas calls and OHLC domains,
base configuration forwarding, pie/doughnut behavior, and public TypeScript types.
Standalone controller delegation is tested with a stub; browser screenshots and
actual WebGL drawing are outside this dedicated suite.

No new rendering logic, core domain policy, or changes to contracts, core runtime,
or package metadata are introduced by these presets. Browser visual verification
and actual WebGL drawing remain outside this dedicated suite.
