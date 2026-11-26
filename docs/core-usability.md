# Core UI Configuration

```ts
const chart = createKChart({
    selector: '#chart',
    data,
    axes,
    series,
    autoResize: true,
    accessibility: {
        label: 'Monthly revenue',
        description: 'Revenue totals by month in USD.'
    },
    tooltip: {visible: true}
}).render();
```

`autoResize` defaults to `true`. Container changes are coalesced per animation
frame. Explicit `width` and `height` remain fixed; omit a dimension to measure
it. Positive measured sizes are preserved, even below 320 by 240 pixels. Zero
or invalid measurements fall back to 320 by 240 for the affected dimension.
`destroy()` disconnects the observer and cancels pending resize work.
Measurements exclude container padding and borders. Intrinsic/auto height is
kept at its initial size to avoid content-driven resize feedback; automatic
height changes require a definite CSS height (or an explicit `height` option).
On browsers without CSS Typed OM, an inline CSS height identifies that intent.

Axes without `tickCount` receive a responsive display-only tick budget. An
explicit `tickCount` remains authoritative. Scale domains are never sampled.

Selectable legend items are keyboard-focusable buttons. Enter and Space toggle
visibility; `aria-pressed` is true when the series is visible. Long labels are
truncated to the available width and retain their full text in `<title>` and
their accessible name. Top and bottom legends reserve space for every row.

For XY series, focus the plot to inspect the first visible series. Left/Right
arrows move through visible data, Home/End select the endpoints, and Escape
dismisses the tooltip. Mouse and touch use the existing series hit testing.
Tooltips flip and clamp at chart edges; oversized content wraps or scrolls.

## Theme

The chart inherits these CSS custom properties with dark-theme fallbacks:

```css
#chart {
    --kchart-text: #18212b;
    --kchart-muted: #52616b;
    --kchart-grid: rgba(40, 60, 70, 0.18);
}
```

Alternatively pass `theme: {text: '#18212b', muted: '#52616b', grid: '#dce2e8'}`.
Explicit `title.color` and `grid.color` take precedence over theme defaults.

## Explicit Status

```ts
createKChart({selector: '#chart', data: [], axes, series,
    status: {state: 'loading', message: 'Loading revenue...'}
}).render();
```

Status is opt-in, with `ready`, `loading`, `empty`, and `error` states. `ready`
and omitted status render no message. Messages are plain text, not HTML.
Loading sets `aria-busy`; errors use an alert role. Core does not fetch data,
infer status from empty arrays, or manage requests. Applications can create
the next chart configuration after their own request completes.
