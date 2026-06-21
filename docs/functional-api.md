# KChart Functional API

## Package Boundaries

The root package remains backward compatible. Internally, implementation is
separated into `core`, `series`, `options`, `worker`, and `utils` modules.

```ts
import {createKChart} from '@keneth80/k-chart/core';
import {
    createLineSeries,
    createCanvasLineSeries,
    createWebglLineSeries
} from '@keneth80/k-chart/series';
import {
    createSpecAreaOption,
    createGuideLineOption,
    createCursorLineOption,
    createTooltipNoteOption
} from '@keneth80/k-chart/options';
```

Series implementations depend on shared core contracts. The core runtime does
not contain concrete line, point, candlestick, WebGL, or globe series
implementations.

## Goal

KChart의 새 public API는 class adapter가 아니라 class-free runtime입니다. UI에서는 `new BasicChart(...)` 같은 인스턴스를 직접 만들지 않고 `createKChart(...)`로 controller를 생성합니다.

차트 코어는 축, scale, layout, SVG/Canvas/WebGL layer를 준비합니다. Series는 `render(context)` 함수만 제공하고, 같은 scale 정보를 받아 SVG, Canvas, WebGL 중 원하는 방식으로 그립니다.

## Import Surface

```ts
import {
    createKChart,
    createCursorLineOption,
    createGuideLineOption,
    createLineSeries,
    createCanvasCandlestickSeries,
    createCanvasLineSeries,
    createCanvasPointSeries,
    createSvgGlobeSeries,
    createSpecAreaOption,
    createTooltipNoteOption,
    createWebglPointSeries,
    createCustomSeries,
    KChartController,
    KChartSeries
} from '@keneth80/k-chart';
```

새 저장소 기준 root public export는 `src/index.ts`이며 `src/kchart.ts`는 기존
내부 import 호환성을 위한 barrel입니다. 기존 class 기반 구현은 패키지 API로
내보내지 않습니다.

## Controller

```ts
const chart = createKChart({
    selector: '#chart',
    data,
    axes,
    series
});

chart.render();
chart.updateData(nextData);
chart.updateAxes(nextAxes);
chart.updateSeries(nextSeries);
chart.resize({ width: 960, height: 420 });
chart.destroy();
```

### Controller Contract

```ts
type KChartController<T> = {
    render(): KChartController<T>;
    updateData(data: T[]): KChartController<T>;
    updateAxes(axes: KChartAxis<T>[]): KChartController<T>;
    updateSeries(series: KChartSeries<T>[]): KChartController<T>;
    resize(size?: Partial<KChartSize>): KChartController<T>;
    destroy(): void;
    getState(): KChartState<T>;
};
```

반환값이 다시 controller이기 때문에 `render().updateData(...)`처럼 chaining할 수 있습니다.

## Built-In Line Series

```ts
const chart = createKChart<TrafficPoint>({
    selector: '#chart',
    data,
    axes: [
        { field: 'time', type: 'string', placement: 'bottom' },
        { field: 'value', type: 'number', placement: 'left' }
    ],
    series: [
        createLineSeries({
            selector: 'traffic',
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

## Built-In Canvas Series

Canvas 2D line/point renderer는 별도 class 없이 factory로 생성합니다.

```ts
const chart = createKChart<Point>({
    selector: '#chart',
    data,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom' },
        { field: 'y', type: 'number', placement: 'left' }
    ],
    series: [
        createCanvasLineSeries({
            selector: 'canvas-line',
            xField: 'x',
            yField: 'y',
            color: '#56d08f',
            lineWidth: 3
        }),
        createCanvasPointSeries({
            selector: 'canvas-points',
            xField: 'x',
            yField: 'y',
            radius: 4,
            color: '#5db8ff'
        })
    ]
});
```

## Built-In Canvas Candlestick Series

OHLC 주식 데이터는 `createCanvasCandlestickSeries`로 렌더링합니다. Y축은 보통 `close`를 기본 field로 두고, `domainFields`에 `low`와 `high`를 넣어 전체 캔들 범위가 축 domain에 포함되게 합니다.

```ts
interface StockPoint {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    previousClose: number;
}

const chart = createKChart<StockPoint>({
    selector: '#chart',
    data: [
        { date: '2026-06-01', open: 101, high: 108, low: 98, close: 106, previousClose: 100 },
        { date: '2026-06-02', open: 106, high: 110, low: 102, close: 103, previousClose: 106 },
        { date: '2026-06-03', open: 103, high: 112, low: 101, close: 111, previousClose: 103 }
    ],
    axes: [
        { field: 'date', type: 'time', placement: 'bottom', tickCount: 5, domain: ['2026-05-31', '2026-06-04'] },
        {
            field: 'close',
            type: 'number',
            placement: 'left',
            domainFields: ['low', 'high'],
            title: 'Price'
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
});
```

캔들 색상은 기본적으로 `colorMode: 'open-close'`로 동작하며 `close`와 `open`을 비교합니다. `colorMode: 'previous-close'`를 사용하면 현재 `close`와 전일 종가를 비교합니다. `previousCloseField`가 있으면 그 필드를 우선 사용하고, 없으면 렌더링 데이터에서 바로 앞 항목의 `closeField` 값을 전일 종가로 사용합니다.

## Built-In SVG Globe Series

지도/지구본 데이터는 `createSvgGlobeSeries`로 렌더링합니다. 좌표는 일반 위도/경도 값을 그대로 사용하며, 내부에서는 `projection([lon, lat])`로 변환합니다. 마커 클릭 시 원본 데이터, 위도/경도, 화면 좌표, 브라우저 이벤트를 callback으로 받을 수 있습니다. 기본값으로 World Atlas 110m land layer와 국가 경계 mesh가 표시되며, `landVisible: false`로 끄거나 `landGeoJson`으로 더 정교한 GeoJSON을 교체할 수 있습니다. 나라별 색상 지정이 필요하면 `landMode: 'countries'`를 사용하고 `landFill`, `landStroke`, `landOpacity` callback을 feature 기준으로 지정합니다. `zoom: { enabled: true }`를 지정하면 데스크톱에서는 wheel zoom, 터치 장치에서는 pinch zoom을 사용할 수 있습니다. 페이지 스크롤 때문에 wheel zoom을 쓰기 어려우면 `controls: true`로 차트 오른쪽 상단의 zoom control을 표시할 수 있습니다. `drilldown.enabled`를 켜면 마커 클릭 시 전환 효과와 함께 해당 좌표를 포커싱합니다. `transition`은 `'warp'`, `'cloud'`, `'none'`을 지원합니다. `cloud`는 Canvas 구름이 화면을 덮은 뒤 목적 화면으로 교체하고, 비동기 `onEnter`가 완료될 때까지 덮인 상태를 유지한 다음 구름을 걷어냅니다. `mode: 'zoom'`은 기존 지구본을 유지한 채 좌표로 줌인하고, `mode: 'map'`은 해당 좌표 중심의 Mercator 평면 지도 모드로 전환합니다. `autoMapOnZoom: true`를 사용하면 `mapZoomThreshold` 이상의 확대에서 현재 지구본 정면 중심과 가장 가까운 등록 도시를 선택해 평면 지도로 자동 전환하고, `globeZoomThreshold` 이하로 축소하면 지구본으로 돌아옵니다.

```ts
interface CityPoint {
    name: string;
    lat: number;
    lon: number;
    url: string;
}

const chart = createKChart<CityPoint>({
    selector: '#chart',
    data: [
        { name: 'Seoul', lat: 37.5665, lon: 126.9780, url: 'https://en.wikipedia.org/wiki/Seoul' },
        { name: 'New York', lat: 40.7128, lon: -74.0060, url: 'https://en.wikipedia.org/wiki/New_York_City' },
        { name: 'London', lat: 51.5072, lon: -0.1276, url: 'https://en.wikipedia.org/wiki/London' }
    ],
    grid: { visible: false },
    legend: { visible: false },
    tooltip: { visible: false },
    axes: [],
    series: [
        createSvgGlobeSeries({
            selector: 'cities',
            displayName: 'Cities',
            latField: 'lat',
            lonField: 'lon',
            labelField: 'name',
            initialRotate: [-120, -18, 0],
            zoom: { enabled: true, min: 0.65, max: 3, controls: { visible: true, x: 6, y: 6 } },
            landFill: '#22c55e',
            landStroke: 'rgba(236, 253, 245, 0.72)',
            landOpacity: 0.58,
            countryBordersStroke: 'rgba(236, 253, 245, 0.28)',
            drilldown: {
                enabled: true,
                mode: 'map',
                autoMapOnZoom: true,
                mapZoomThreshold: 2.4,
                globeZoomThreshold: 1.8,
                focusZoom: 2.7,
                zoomScale: 7,
                duration: 1200,
                transition: {
                    type: 'cloud',
                    duration: 2600,
                    color: '#f5f7fa',
                    density: 0.86,
                    blur: 20
                },
                resetControl: true
            },
            markerColor: '#5db8ff',
            onMarkerClick: ({ data }) => {
                window.open(data.url, '_blank', 'noopener,noreferrer');
            }
        })
    ]
});
```

`draggable` 기본값은 `true`입니다. `zoom` 기본값은 비활성화이며, `zoom: true` 또는 `zoom: { enabled: true }`로 켤 수 있습니다. `min`과 `max`는 기본 globe scale에 곱해지는 배율입니다. `controls: true`를 지정하면 `+`, 현재 배율, `-` 버튼이 표시되고 현재 배율 버튼은 1x로 리셋합니다. `controls: { visible: true, x, y }`의 `x`, `y`는 차트 전체 SVG의 오른쪽/위쪽 edge 기준 offset입니다. `drilldown` 기본값은 비활성화이며, `drilldown: { enabled: true, mode: 'zoom', focusZoom: 2.7 }`로 켜면 선택 좌표가 중앙에 오도록 지구본을 회전하고 확대합니다. `transition` 기본값은 `'warp'`이고 `{ type: 'cloud', duration, color, density, blur }` 형태로 구름의 속도와 밀도를 조절할 수 있습니다. `prefers-reduced-motion` 환경에서는 전환을 최대 1.2초로 줄이되 구름 형태가 보일 시간은 유지합니다. 기존 평면 지도 전환이 필요하면 `mode: 'map'`과 `zoomScale`을 사용합니다. 자동 전환은 `autoMapOnZoom`, `mapZoomThreshold`, `globeZoomThreshold`로 제어합니다. 두 임계값을 다르게 두는 이유는 경계 배율에서 지구본과 지도가 반복 전환되는 현상을 막기 위한 hysteresis입니다. `resetControl`이 true이면 포커스 상태에서 `G` 버튼으로 이전 지구본 상태로 돌아갑니다. `landGeoJson`에 GeoJSON feature, feature collection, 또는 feature 배열을 넘기면 기본 land layer 대신 해당 path를 구면 위에 그립니다. `landMode: 'countries'`를 지정하면 기본 fill layer도 국가 feature 단위로 분리되어 나라별 색상 callback을 적용할 수 있습니다.

실제 도로·건물 타일 지도가 필요한 경우 `mode: 'external-map'`을 사용합니다. 이 모드에서는 KChart가 내부 SVG 평면도를 그리지 않고 `onEnter` 콜백에 `{ data, lat, lon, exit }`를 전달합니다. `@keneth80/k-chart-maplibre` 어댑터는 이 컨텍스트를 받아 MapLibre 지도를 표시하며, 어댑터의 `G` 버튼은 `exit()`을 호출해 지구본으로 복귀합니다. MapLibre는 지도 렌더러이므로 주소 변환과 맛집 검색은 Kakao Local API, Naver Maps, MapTiler Geocoding 등 별도 공급자에서 받아 장소 좌표 데이터로 전달해야 합니다.

외부 장소 API 응답은 `parseMapLibrePlaces()`로 `id`, `name`, `lat`, `lon`을
검증·변환할 수 있습니다. `createMapLibrePlaceResolver()`는 변환된 장소를 도시별로
한 번 인덱싱하고 `createMapLibreGlobeBridge()`에 바로 전달할 resolver를 반환합니다.
완전히 실행 가능한 예제와 import 목록은
[`packages/k-chart-maplibre/README.md`](../packages/k-chart-maplibre/README.md)에 있습니다.

## Built-In WebGL Series

```ts
const chart = createKChart<Point>({
    selector: '#chart',
    data,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom' },
        { field: 'y', type: 'number', placement: 'left' }
    ],
    series: [
        createWebglLineSeries({
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
        }),
        createWebglPointSeries({
            selector: 'webgl-points',
            xField: 'x',
            yField: 'y',
            pointSize: 8,
            color: '#f3b45b'
        })
    ]
});
```

### Downsampling

`createLineSeries`, `createCanvasLineSeries`, `createWebglLineSeries`는 `downsample` 옵션을 지원합니다. `true`를 넘기면 현재 plot width를 기준으로 LTTB가 적용되고, 객체를 넘기면 threshold와 x/y accessor를 직접 지정할 수 있습니다.

```ts
createWebglLineSeries<Point>({
    selector: 'trace',
    xField: 'x',
    yField: 'signal',
    downsample: {
        enabled: true,
        threshold: ({ plotSize }) => Math.floor(plotSize.width * 1.5)
    }
});
```

알고리즘 자체도 export됩니다.

```ts
import { downsampleLTTB } from '@keneth80/k-chart';

const sampled = downsampleLTTB(data, 1000, (point) => point.x, (point) => point.signal);
```

### Zoom

차트 레벨의 `zoom` 옵션은 number/time 축의 domain을 갱신하고 기존 렌더 파이프라인을 다시 실행합니다. 별도 series API 없이 SVG, Canvas, WebGL renderer가 같은 확대 상태를 공유합니다.

```ts
createKChart<Point>({
    selector: '#chart',
    data,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom' },
        { field: 'signal', type: 'number', placement: 'left' }
    ],
    series: [
        createWebglLineSeries({
            selector: 'trace',
            xField: 'x',
            yField: 'signal'
        })
    ],
    zoom: {
        enabled: true,
        mode: 'both',
        direction: 'x',
        scaleExtent: [1, 80],
        wheelZoom: { enabled: true, devices: 'pc', sensitivity: 0.85 },
        gestureZoom: { enabled: true, devices: 'mobile', minTouches: 1 },
        resetOnDoubleClick: true
    }
});
```

`mode`는 `'wheel'`, `'select'`, `'both'`를 지원합니다. `'wheel'`은 wheel/trackpad zoom과 drag pan, `'select'`는 드래그 영역 선택 zoom, `'both'`는 wheel/trackpad zoom과 드래그 영역 선택 zoom을 함께 사용합니다. `wheelZoom`은 PC wheel/trackpad 입력을, `gestureZoom`은 모바일 touch gesture 입력을 분리해서 제어합니다. `direction`은 `'x'`, `'y'`, `'xy'`를 지원합니다. string/point 축은 순서형 축이라 현재 zoom 대상에서 제외됩니다.

### OffscreenCanvas Worker Rendering

`createCanvasLineSeries`와 `createWebglLineSeries`는 `asyncRender` 옵션을 지원합니다. worker 파일에서는 `startKChartRenderWorker()`를 호출하고, series에는 worker를 만드는 factory를 넘깁니다.

```ts
// kchart-render.worker.ts
import { startKChartRenderWorker } from '@keneth80/k-chart';

startKChartRenderWorker();
```

```ts
createWebglLineSeries<Point>({
    selector: 'trace',
    xField: 'x',
    yField: 'signal',
    asyncRender: {
        enabled: true,
        workerFactory: () => new Worker(
            new URL('./kchart-render.worker.ts', import.meta.url),
            { type: 'module' }
        )
    }
});
```

OffscreenCanvas를 지원하지 않거나 worker 생성에 실패하면 기존 메인 스레드 렌더러로 fallback됩니다.

## Display Options

```ts
createKChart({
    selector: '#chart',
    data,
    title: { text: 'Hybrid Revenue And Volume', align: 'left' },
    grid: { visible: true, y: true, x: false, dasharray: '2 6' },
    legend: { visible: true, placement: 'top' },
    tooltip: { visible: true },
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

The default tooltip shows the active series name and nearest x/y values. Provide `tooltip.formatter` for custom HTML/text.

### Pinned Tooltip Notes

Tooltip notes are opt-in. `createTooltipNoteOption()` adds a pin action to the normal hover tooltip and renders each pinned snapshot as an editable annotation card over the chart. Drag a card header to move it without changing the original data coordinates. Pinned cards do not replace or block later hover tooltips.

```ts
createKChart<Point>({
    selector: '#chart',
    data,
    axes,
    tooltip: {visible: true},
    options: [
        createTooltipNoteOption<Point>({
            maxNotes: 8,
            pinButtonLabel: 'Pin',
            notePlaceholder: 'Add context...',
            onChange: (notes) => saveNotes(notes)
        })
    ],
    series
});
```

The `onChange` callback receives `KChartTooltipNote<T>[]` whenever a note is pinned, edited, or deleted. Note state is scoped to the chart controller and is cleared by `destroy()`.

## Option Factories

Series는 `series: [...]`로 받고, chart 부가 기능은 `options: [...]`로 받습니다.

```ts
createKChart({
    selector: '#chart',
    data,
    axes,
    series,
    options: [
        createSpecAreaOption([
            { start: 2, end: 3.5, label: 'STEP 02' }
        ]),
        createGuideLineOption({
            x: [{ value: 4, label: 'A' }],
            y: [{ value: 58, label: 'HIGH' }]
        }),
        createCursorLineOption({
            valueFormat: (value: number) => Number(value).toFixed(1)
        }),
        createTooltipNoteOption<Point>({
            maxNotes: 8,
            onChange: (notes) => console.info(notes)
        })
    ]
});
```

기존 `specAreas`, `guideLines`, `cursorGuide`, `guideLine` 직접 필드도 호환됩니다. 새 코드에서는 option factory 사용을 권장합니다.

## Custom Series

기본 series가 부족하면 `createCustomSeries(...)`에 renderer 함수를 넘깁니다. Class 상속이나 interface 구현 없이 같은 확장 지점을 사용할 수 있습니다.

Renderer context 주요 필드:

- `group`: 이 series 전용 SVG group
- `data`: 현재 차트 데이터
- `scales`, `xScale`, `yScale`: 코어가 계산한 scale
- `size`, `plotSize`, `margin`: 전체 크기와 plot 영역
- `color`: series 기본 색상
- `getCanvas(name)`: Canvas 2D layer
- `getWebglCanvas(name)`: WebGL canvas layer

### Three.js renderer 연결

Three.js 같은 외부 렌더링 엔진도 동일한 함수형 확장 지점을 사용합니다. KChart는
plot 영역 크기와 WebGL canvas를 제공하고, custom series가 Three.js scene, camera,
controls, raycaster를 소유합니다.

```ts
import * as THREE from 'three';
import { createCustomSeries } from '@keneth80/k-chart';

let renderer: THREE.WebGLRenderer | undefined;

const series = createCustomSeries<Node>({
    selector: 'three-network',
    render({ getWebglCanvas, plotSize }) {
        const canvas = getWebglCanvas('three-network');
        renderer ??= new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(plotSize.width, plotSize.height, false);
        // Build or update THREE.Scene objects from chart data.
    },
    destroy() {
        renderer?.dispose();
        renderer = undefined;
    }
});
```

렌더러를 매 render마다 새로 생성하지 않도록 factory closure에 상태를 보관해야 합니다.
animation frame, controls, geometry, material도 `destroy()`에서 정리합니다. 전체 양자리
별자리 예제는 `examples/three-constellation-series.ts`를 참고합니다.

```ts
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
            .style('fill', color);
    }
});
```

간단한 SVG 원 series 예제는 [examples/custom-circle-series.ts](../examples/custom-circle-series.ts)를 참고하세요.

## Canvas/WebGL Pattern

```ts
const canvasSeries = createCustomSeries<Point>({
    selector: 'canvas-points',
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

## React / Next.js Pattern

DOM을 직접 사용하므로 Client Component에서 mount 이후 생성합니다. 자세한 wrapper 예제와 Next.js 설정은 [React And Next.js Guide](react-nextjs.md)를 참고합니다.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { createKChart, createLineSeries, KChartController } from '@keneth80/k-chart';

export function TrafficChart({ data }) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<KChartController | null>(null);

    useEffect(() => {
        if (!rootRef.current) {
            return;
        }

        const chart = createKChart({
            selector: rootRef.current,
            data,
            axes: [
                { field: 'time', type: 'string', placement: 'bottom' },
                { field: 'value', type: 'number', placement: 'left' }
            ],
            series: [
                createLineSeries({
                    selector: 'traffic',
                    xField: 'time',
                    yField: 'value'
                })
            ]
        });

        chart.render();
        chartRef.current = chart;

        return () => {
            chart.destroy();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        chartRef.current?.updateData(data);
    }, [data]);

    return <div ref={rootRef} style={{ width: '100%', height: 420 }} />;
}
```

## Migration Checklist

1. `new BasicChart(...)` 호출을 `createKChart(...)`로 교체합니다.
2. class 상속 series를 `createCustomSeries({ render(context) { ... } })`로 옮깁니다.
3. 축/scale 계산은 runtime에 맡기고, renderer는 전달받은 `xScale`, `yScale`, `getCanvas`, `getWebglCanvas`만 사용합니다.
4. UI unmount 시 `chart.destroy()`를 호출합니다.
5. 새 패키지 public import는 `@keneth80/k-chart`의 함수형 API만 사용합니다.

## Refactor Status

완료:

- `src/kchart.ts` class-free runtime 추가
- SVG line series renderer 함수화
- Canvas line/point series renderer 함수화
- WebGL point series renderer 함수화
- title/grid/legend/axis title 옵션 추가
- 기본 nearest-point tooltip 옵션 추가
- Custom series renderer API 추가
- 새 public entry를 KChart runtime으로 축소

다음 단계:

- zoom을 runtime plugin 형태로 분리
- legacy demo를 새 runtime 예제로 교체
