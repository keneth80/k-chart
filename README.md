# KChart

KChart는 TypeScript 기반 D3 하이브리드 차트 엔진입니다.

축, scale, layout은 차트 코어가 계산하고, 실제 시각 표현은 series renderer 함수가 담당합니다. Renderer는 같은 scale 정보를 받아 SVG, Canvas, WebGL 레이어 중 원하는 방식으로 그릴 수 있습니다. 새 저장소 기준 public API는 class-free 함수형 런타임입니다.

## Core Concept

```txt
createKChart(config)
 ├─ axes -> scales
 ├─ svg/canvas/webgl layers
 └─ series[]
      ├─ createLineSeries(...)
      ├─ createCanvasLineSeries(...)
      ├─ createCanvasPointSeries(...)
      ├─ createCanvasCandlestickSeries(...)
      ├─ createWebglLineSeries(...)
      ├─ createWebglPointSeries(...)
      └─ createCustomSeries({ render(context) })
```

- `createKChart(...)`는 class 없이 plain runtime state와 controller를 만듭니다.
- `createLineSeries(...)`는 SVG line renderer를 함수형 series로 생성합니다.
- `createCanvasLineSeries(...)`, `createCanvasPointSeries(...)`는 Canvas 2D renderer를 함수형 series로 생성합니다.
- `createCanvasCandlestickSeries(...)`는 OHLC 데이터를 Canvas 2D 캔들차트로 렌더링합니다.
- `createWebglLineSeries(...)`는 대용량 line renderer를 WebGL `LINE_STRIP` 기반 함수형 series로 생성합니다.
- `createWebglPointSeries(...)`는 WebGL point renderer를 함수형 series로 생성합니다.
- `createCustomSeries(...)`는 renderer 함수를 그대로 series로 사용합니다.
- `render(context)`는 `group`, `data`, `scales`, `xScale`, `yScale`, `plotSize`, `color`, `getCanvas`, `getWebglCanvas`를 받습니다.
- Canvas/WebGL 시각화도 renderer 안에서 필요한 layer를 받아 직접 그릴 수 있습니다.

## Install

```bash
npm install @keneth80/k-chart
```

## Playground

- Local playground URL: `http://127.0.0.1:9011`

The playground demonstrates the React wrapper, chart examples, configuration editor, and AI Builder flow.

## Local Development

```bash
npm install
npm run build
```

Demo:

```bash
npm run dev
```

Then open `http://127.0.0.1:9003/`.

## Guides

- [Functional API Guide](docs/functional-api.md)
- [Code Graph Handoff](docs/code-graph-handoff.md)
- [React And Next.js Guide](docs/react-nextjs.md)
- [Release Guide](docs/release.md)
- [React Wrapper Example](examples/react-wrapper.tsx)
- [Canvas Candlestick Example](examples/canvas-candlestick-series.ts)
- [SVG Globe Map Example](examples/svg-globe-map-series.ts)

## Quick Start

```ts
import {
    createKChart,
    createLineSeries,
    KChartController
} from '@keneth80/k-chart';

interface TrafficPoint {
    time: string;
    value: number;
}

const data: TrafficPoint[] = [
    { time: '00:00', value: 12 },
    { time: '01:00', value: 18 },
    { time: '02:00', value: 21 }
];

const chart: KChartController<TrafficPoint> = createKChart<TrafficPoint>({
    selector: '#chart',
    data,
    axes: [
        { field: 'time', type: 'string', placement: 'bottom' },
        { field: 'value', type: 'number', placement: 'left' }
    ],
    series: [
        createLineSeries({
            selector: 'traffic-line',
            displayName: 'Traffic',
            xField: 'time',
            yField: 'value',
            curve: true,
            dot: true
        })
    ]
});

chart.render();
```

## Custom Series

아래 예제는 차트 코어가 계산한 x/y scale을 받아 SVG 원을 그립니다. Class 상속이나 interface 구현 없이 renderer 함수만 넘깁니다.

```ts
import {
    createKChart,
    createCustomSeries
} from '@keneth80/k-chart';

interface CirclePoint {
    x: number;
    y: number;
    radius: number;
}

const circleSeries = createCustomSeries<CirclePoint>({
    selector: 'custom-circle',
    displayName: 'Custom Circle',
    xField: 'x',
    yField: 'y',
    render({ group, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        group.selectAll('.custom-circle')
            .data(data)
            .join('circle')
            .attr('class', 'custom-circle')
            .attr('cx', (point) => xScale.scale(point.x))
            .attr('cy', (point) => yScale.scale(point.y))
            .attr('r', (point) => point.radius)
            .style('fill', color)
            .style('fill-opacity', 0.6);
    }
});

createKChart<CirclePoint>({
    selector: '#chart',
    data: [
        { x: 1, y: 12, radius: 8 },
        { x: 2, y: 18, radius: 12 },
        { x: 3, y: 9, radius: 6 }
    ],
    axes: [
        { field: 'x', type: 'number', placement: 'bottom', min: 0, max: 4 },
        { field: 'y', type: 'number', placement: 'left', min: 0, max: 24 }
    ],
    series: [
        circleSeries
    ]
}).render();
```

Full example: [examples/custom-circle-series.ts](examples/custom-circle-series.ts)

## Canvas Or WebGL Renderer

기본 Canvas/WebGL renderer는 factory로 바로 사용할 수 있습니다.

```ts
import {
    createCanvasLineSeries,
    createCanvasPointSeries,
    createWebglLineSeries,
    createWebglPointSeries
} from '@keneth80/k-chart';

const canvasLine = createCanvasLineSeries<Point>({
    selector: 'canvas-line',
    xField: 'x',
    yField: 'y',
    color: '#56d08f',
    lineWidth: 3
});

const canvasPoints = createCanvasPointSeries<Point>({
    selector: 'canvas-points',
    xField: 'x',
    yField: 'y',
    radius: 4,
    color: '#5db8ff'
});

const webglPoints = createWebglPointSeries<Point>({
    selector: 'webgl-points',
    xField: 'x',
    yField: 'y',
    pointSize: 8,
    color: '#f3b45b'
});

const webglLine = createWebglLineSeries<Point>({
    selector: 'webgl-large-line',
    displayName: '120k WebGL Line',
    xField: 'x',
    yField: 'y',
    color: '#5db8ff',
    lineWidth: 1,
    downsample: {
        enabled: true,
        threshold: ({ plotSize }) => Math.floor(plotSize.width)
    }
});
```

## Candlestick Chart

Canvas candlestick series renders OHLC stock data. Set the y-axis `field` to the value you want tooltips and cursor guides to use, usually `close`, and set `domainFields` to `['low', 'high']` so the axis covers the full candle range.

```ts
import {
    createCanvasCandlestickSeries,
    createKChart
} from '@keneth80/k-chart';

interface StockPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    previousClose: number;
}

const data: StockPoint[] = [
    { date: '2026-06-01', open: 101, high: 108, low: 98, close: 106, previousClose: 100 },
    { date: '2026-06-02', open: 106, high: 110, low: 102, close: 103, previousClose: 106 },
    { date: '2026-06-03', open: 103, high: 112, low: 101, close: 111, previousClose: 103 }
];

createKChart<StockPoint>({
    selector: '#chart',
    data,
    axes: [
        { field: 'date', type: 'time', placement: 'bottom', tickCount: 5, domain: ['2026-05-31', '2026-06-04'] },
        {
            field: 'close',
            type: 'number',
            placement: 'left',
            title: 'Price',
            domainFields: ['low', 'high']
        }
    ],
    tooltip: { visible: true },
    series: [
        createCanvasCandlestickSeries({
            selector: 'price',
            displayName: 'Price',
            xField: 'date',
            openField: 'open',
            highField: 'high',
            lowField: 'low',
            closeField: 'close',
            colorMode: 'previous-close',
            previousCloseField: 'previousClose',
            upColor: '#22c55e',
            downColor: '#ef4444'
        })
    ]
}).render();
```

`colorMode` 기본값은 `'open-close'`이며 `close`와 `open`을 비교합니다. 한국 주식 화면처럼 전일 종가 대비 상승/하락 색상을 쓰려면 `colorMode: 'previous-close'`를 지정합니다. `previousCloseField`를 넘기면 해당 필드를 기준으로 비교하고, 생략하면 현재 데이터 배열에서 바로 앞 캔들의 `closeField` 값을 사용합니다.

## Globe Map

SVG globe series renders latitude/longitude markers on a draggable orthographic globe. Marker coordinates use ordinary geographic values: `lat` for latitude and `lon` for longitude. Click handlers receive the original data item, projected screen position, and the original browser event. A World Atlas 110m land layer is rendered by default with country borders as a separate mesh; set `landVisible: false` to hide it, or pass `landGeoJson` to use your own GeoJSON land/country data. `landMode: 'countries'` switches the fill layer to country features so `landFill`, `landStroke`, and `landOpacity` callbacks can style countries per feature. Set `zoom: { enabled: true }` to enable wheel zoom on desktop and pinch zoom on touch devices. Add `controls: true` to show in-chart zoom controls when page scrolling makes wheel zoom awkward.

```ts
import {
    createKChart,
    createSvgGlobeSeries
} from '@keneth80/k-chart';

interface CityPoint {
    name: string;
    lat: number;
    lon: number;
    url: string;
}

const cities: CityPoint[] = [
    { name: 'Seoul', lat: 37.5665, lon: 126.9780, url: 'https://en.wikipedia.org/wiki/Seoul' },
    { name: 'New York', lat: 40.7128, lon: -74.0060, url: 'https://en.wikipedia.org/wiki/New_York_City' }
];

createKChart<CityPoint>({
    selector: '#chart',
    data: cities,
    grid: { visible: false },
    legend: { visible: false },
    tooltip: { visible: false },
    axes: [],
    series: [
        createSvgGlobeSeries({
            selector: 'cities',
            latField: 'lat',
            lonField: 'lon',
            labelField: 'name',
            initialRotate: [-120, -18, 0],
            zoom: { enabled: true, min: 0.65, max: 3, controls: { visible: true, x: 6, y: 6 } },
            landFill: '#22c55e',
            landStroke: 'rgba(236, 253, 245, 0.72)',
            landOpacity: 0.58,
            countryBordersStroke: 'rgba(236, 253, 245, 0.28)',
            onMarkerClick: ({ data }) => {
                window.open(data.url, '_blank', 'noopener,noreferrer');
            }
        })
    ]
}).render();
```

Country-level styling is available when the land layer uses country features:

```ts
createSvgGlobeSeries({
    selector: 'country-colors',
    latField: 'lat',
    lonField: 'lon',
    landMode: 'countries',
    landFill: (feature, index) => {
        const name = feature.properties?.name;
        if (name === 'South Korea') return '#60a5fa';
        return ['#22c55e', '#14b8a6', '#f59e0b'][index % 3];
    }
});
```

대용량 line 예제에서는 축 tick 수를 줄여 라벨 겹침을 피할 수 있습니다.

```ts
const largeData = Array.from({ length: 120000 }, (_, index) => ({
    x: index,
    y: 52 + Math.sin(index / 120) * 22 + Math.cos(index / 43) * 8
}));

createKChart({
    selector: '#chart',
    data: largeData,
    axes: [
        {
            field: 'x',
            type: 'number',
            placement: 'bottom',
            min: 0,
            max: 119999,
            tickCount: 6,
            tickFormat: (value: number) => Math.round(value / 1000) + 'k'
        },
        { field: 'y', type: 'number', placement: 'left', min: 0, max: 100, tickCount: 5 }
    ],
    series: [webglLine]
}).render();
```

## Zoom

`zoom` 옵션을 켜면 number/time 축의 domain을 런타임에 갱신하면서 SVG, Canvas, WebGL series를 다시 렌더링합니다. 기본적으로 wheel/trackpad 확대, 드래그 pan, 더블클릭 reset을 지원합니다.

```ts
createKChart({
    selector: '#chart',
    data: largeData,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom', min: 0, max: 119999 },
        { field: 'y', type: 'number', placement: 'left', min: 0, max: 100 }
    ],
    series: [webglLine],
    zoom: {
        enabled: true,
        mode: 'both',
        direction: 'x',
        scaleExtent: [1, 80],
        wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
        gestureZoom: { enabled: true, devices: 'mobile', minTouches: 1 },
        resetOnDoubleClick: true,
        onZoom: ({ xDomain }) => {
            console.log('visible x domain', xDomain);
        }
    }
}).render();
```

- `direction`: `'x'`, `'y'`, `'xy'` 중 하나입니다. 대용량 line 차트는 보통 `'x'`가 가장 자연스럽습니다.
- `mode`: `'wheel'`은 wheel/trackpad zoom과 drag pan, `'select'`는 드래그 영역 선택 zoom, `'both'`는 wheel/trackpad zoom과 드래그 영역 선택 zoom을 함께 사용합니다.
- `scaleExtent`: 최소/최대 확대 배율입니다.
- `wheelZoom`: PC wheel/trackpad 입력을 제어합니다. `devices`는 기본값이 `'pc'`이며, 필요하면 `'all'`로 바꿀 수 있습니다. `sensitivity`로 확대 민감도를 조절합니다.
- `gestureZoom`: 모바일 touch gesture 입력을 제어합니다. `devices`는 기본값이 `'mobile'`이며, `minTouches: 1`이면 한 손가락 pan과 두 손가락 pinch를 함께 허용합니다.
- `resetOnDoubleClick`: `false`로 지정하면 더블클릭 reset을 끌 수 있습니다.

## LTTB Downsampling

Line 계열 series는 `downsample` 옵션으로 LTTB(Largest Triangle Three Buckets) 다운샘플링을 사용할 수 있습니다. 원본 `data`와 축 domain은 그대로 유지하고, SVG/Canvas/WebGL renderer에 넘기는 series 데이터만 그리기 직전에 줄입니다.

```ts
createCanvasLineSeries<Point>({
    selector: 'canvas-large-line',
    xField: 'x',
    yField: 'y',
    downsample: true
});
```

`downsample: true`는 기본 threshold를 현재 plot width 픽셀 수로 잡습니다. 더 세밀하게 제어하려면 threshold나 accessor를 직접 지정할 수 있습니다.

```ts
createWebglLineSeries<Point>({
    selector: 'webgl-large-line',
    xField: 'time',
    yField: 'signal',
    downsample: {
        enabled: true,
        threshold: ({ plotSize }) => Math.max(400, Math.floor(plotSize.width * 1.5)),
        xAccessor: (point) => point.time.getTime(),
        yAccessor: (point) => point.signal
    }
});
```

필요하면 알고리즘만 직접 사용할 수도 있습니다.

```ts
import { downsampleLTTB } from '@keneth80/k-chart';

const sampled = downsampleLTTB(data, 1200, (point) => point.x, (point) => point.y);
```

## OffscreenCanvas Worker Rendering

Canvas/WebGL line series는 `asyncRender` 옵션으로 OffscreenCanvas + Web Worker 렌더링을 사용할 수 있습니다. SVG, axis, legend, tooltip DOM은 메인 스레드에 남고, Canvas/WebGL line draw 호출만 worker에서 실행됩니다. 미지원 환경이거나 `workerFactory`가 없으면 기존 메인 스레드 렌더러로 동작합니다.

Worker 파일을 하나 만듭니다.

```ts
// kchart-render.worker.ts
import { startKChartRenderWorker } from '@keneth80/k-chart';

startKChartRenderWorker();
```

series에서는 worker를 생성하는 factory를 넘깁니다.

```ts
createWebglLineSeries<Point>({
    selector: 'webgl-large-line',
    xField: 'x',
    yField: 'signal',
    downsample: {
        enabled: true,
        threshold: ({ plotSize }) => Math.floor(plotSize.width)
    },
    asyncRender: {
        enabled: true,
        workerFactory: () => new Worker(
            new URL('./kchart-render.worker.ts', import.meta.url),
            { type: 'module' }
        )
    }
});
```

같은 옵션은 `createCanvasLineSeries`에서도 사용할 수 있습니다.

직접 제어가 필요하면 `render(context)` 안에서 Canvas/WebGL layer를 받을 수도 있습니다.

```ts
const customCanvasSeries = createCustomSeries<Point>({
    selector: 'custom-canvas-points',
    xField: 'x',
    yField: 'y',
    render({ getCanvas, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getCanvas('points');
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = color;
        data.forEach((point) => {
            context.beginPath();
            context.arc(xScale.scale(point.x), yScale.scale(point.y), 3, 0, Math.PI * 2);
            context.fill();
        });
    }
});
```

## Controller API

`createKChart(...)` returns `KChartController<T>`.

| Method | Description |
| --- | --- |
| `render()` | Render the chart. |
| `updateData(data)` | Replace data and render again. |
| `updateAxes(axes)` | Replace axes and render again. |
| `updateSeries(series)` | Replace series and render again. |
| `resize(size?)` | Recalculate size and render again. |
| `destroy()` | Remove SVG/Canvas resources. |
| `getState()` | Read current runtime state. |

## Chart Options

`createKChart(...)` supports layout and display options for common playground-style charts.

```ts
createKChart({
    selector: '#chart',
    data,
    margin: { top: 28, right: 52, bottom: 44, left: 52 },
    title: {
        text: 'Hybrid Revenue And Volume',
        align: 'left'
    },
    grid: {
        visible: true,
        x: false,
        y: true,
        dasharray: '2 6'
    },
    legend: {
        visible: true,
        placement: 'top',
        selectable: true
    },
    tooltip: {
        visible: true
    },
    axes: [
        { field: 'x', type: 'number', placement: 'bottom', title: 'Month Index' },
        { field: 'value', type: 'number', placement: 'left', title: 'Value' },
        { field: 'volume', type: 'number', placement: 'right', title: 'Volume' }
    ],
    series: [
        createLineSeries({ selector: 'value', xField: 'x', yField: 'value' }),
        createCanvasPointSeries({ selector: 'volume', xField: 'x', yField: 'volume' })
    ]
});
```

Legend item은 기본적으로 선택 가능합니다. 여러 series를 넣으면 legend checkbox를 클릭해 SVG, Canvas, WebGL series를 개별적으로 숨기거나 다시 표시할 수 있습니다. `selectable: false`를 주면 표시 전용 legend로 동작합니다.

```ts
series: [
    createLineSeries({ selector: 'value-line', displayName: 'Value', xField: 'x', yField: 'value' }),
    createLineSeries({ selector: 'volume-line', displayName: 'Volume', xField: 'x', yField: 'volume' }),
    createLineSeries({ selector: 'extra-line', displayName: 'Extra', xField: 'x', yField: 'extra' })
]
```

## Spec Areas, Fixed Guide Lines, And Cursor Guide

대용량 trace/WebGL 차트처럼 공정 단계나 관심 구간을 표시해야 할 때 `specAreas`를 사용할 수 있습니다.

옵션 기능은 series처럼 `options` 배열로 지정합니다. `createSpecAreaOption`, `createGuideLineOption`, `createCursorLineOption`을 조합하면 x/y 기준선, 영역, 마우스 추적선을 필요한 만큼 붙일 수 있습니다.

```ts
import {
    createCursorLineOption,
    createGuideLineOption,
    createKChart,
    createSpecAreaOption,
    createWebglLineSeries
} from '@keneth80/k-chart';

createKChart({
    selector: '#chart',
    data,
    options: [
        createSpecAreaOption([
            { start: 18000, end: 36000, label: 'STEP 02', color: 'rgba(216, 118, 255, 0.16)' },
            { start: 62000, end: 78000, label: 'STEP 05', color: 'rgba(93, 184, 255, 0.13)' }
        ]),
        createGuideLineOption({
            x: [
                { value: 1200, label: '1' },
                { value: 6200, label: '2' },
                { value: 24000, label: '3' },
                { value: 64000, label: '4' }
            ],
            y: [
                { value: 80, label: 'upper', color: 'rgba(255, 107, 138, 0.55)' }
            ]
        }),
        createCursorLineOption({
            xFormat: (value: number) => `${Math.round(value / 1000)}k`,
            valueFormat: (value: number) => Number(value).toFixed(1)
        })
    ],
    series: [
        createWebglLineSeries({ selector: 'trace-1', displayName: 'Trace 1', xField: 'x', yField: 'signal0' }),
        createWebglLineSeries({ selector: 'trace-2', displayName: 'Trace 2', xField: 'x', yField: 'signal1' })
    ]
}).render();
```

`createCursorLineOption`은 마우스 위치를 따라 가장 가까운 x 위치의 series 값을 읽어 보여주는 inspect overlay입니다. 기존 `specAreas`, `guideLines`, `cursorGuide`, `guideLine` 직접 필드는 호환을 위해 남아 있지만, 새 코드에서는 `options` 배열을 권장합니다.

`tooltip.formatter` can be used when the default series/x/y text is not enough.

```ts
tooltip: {
    visible: true,
    formatter: ({ data, series }) => `${series.displayName}: ${data.value}`
}
```

Custom renderer가 한 series 안에서 여러 SVG/Canvas/WebGL 요소를 그리는 경우에는 series 단위 `tooltip(context)` hook을 사용할 수 있습니다. 예를 들어 stacked column, range bar, box plot처럼 하나의 datum에서 여러 시각 요소가 나올 때 core tooltip overlay는 이 hook이 돌려준 위치와 HTML을 그대로 사용합니다.

```ts
const stackedSeries = createCustomSeries<Point>({
    selector: 'stacked-column',
    displayName: 'Stacked Column',
    xField: 'x',
    yField: 'value',
    render({ group, data, xScale, yScale }) {
        // draw stacked rects with the chart scales
    },
    tooltip({ data, scales, mouseX, mouseY }) {
        const xScale = scales.find((scale) => scale.field === 'x');
        const yScale = scales.find((scale) => scale.field === 'value');
        if (!xScale || !yScale) {
            return undefined;
        }

        const hit = data.find((point) => {
            const x = xScale.scale(point.x);
            return Math.abs(mouseX - x) < 12;
        });
        if (!hit) {
            return undefined;
        }

        return {
            data: hit,
            x: xScale.scale(hit.x),
            y: yScale.scale(hit.value),
            distance: 0,
            html: `<strong>${hit.label}</strong><br/>A: ${hit.a}<br/>B: ${hit.b}`
        };
    }
});
```

## React / Next.js

KChart touches the DOM, so create it in a Client Component after mount.

See the full guide: [React And Next.js Guide](docs/react-nextjs.md).

Note: the current `@keneth80/k-chart` package does not include an official React plugin package yet. The Next playground has a local wrapper example under `packages/react/src`.

## Migration Status

The public runtime is `src/kchart.ts`.

The legacy class-based chart source has been removed from the new runtime source tree. New code should use:

- `createKChart`
- `createLineSeries`
- `createCanvasLineSeries`
- `createCanvasPointSeries`
- `createWebglPointSeries`
- `createCustomSeries`
- `createSpecAreaOption`
- `createGuideLineOption`
- `createCursorLineOption`
- `KChartController`

The next migration target is adding zoom/pan and richer tooltip interaction on top of this class-free runtime.

## Docs

- [Functional API](docs/functional-api.md)
- [Refactor Plan](docs/refactor-plan.md)
