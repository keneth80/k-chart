# KChart

KChart는 TypeScript 기반 D3 하이브리드 차트 엔진입니다.

이 라이브러리는 축, scale, layout, zoom, tooltip, legend, lifecycle을 차트 코어가 관리하고, 실제 시각 표현은 독립적인 series가 담당합니다. Series는 같은 scale 정보를 주입받아 SVG, Canvas, WebGL 또는 커스텀 renderer로 그릴 수 있으므로, 하나의 차트 안에서 여러 렌더링 방식을 섞거나 기존 시리즈 외의 시각화를 직접 확장할 수 있습니다.

기존 class API는 유지하면서, React/Vue/Svelte/Next.js 같은 다른 UI에서 가져다 쓰기 쉬운 functional API도 제공합니다.

## 핵심 컨셉

```txt
Chart Core
 ├─ data
 ├─ axes
 ├─ scales
 ├─ layout
 ├─ zoom / tooltip / legend / lifecycle
 └─ series[]
      ├─ SVG series
      ├─ Canvas series
      ├─ WebGL series
      └─ Custom series
```

- 축과 series를 분리합니다. 축/scale 계산은 차트 코어가 담당하고, series는 scale을 받아 표현만 담당합니다.
- 외부 사용자는 `create*Chart(...)`, `create*Series(...)`, `createCustomSeries(...)` 함수로 차트와 series를 구성합니다.
- SVG, Canvas, WebGL series를 같은 차트 시스템 안에서 사용할 수 있습니다.
- 커스텀 series는 `createCustomSeries(...)`의 `render(context)` 함수에서 렌더링 대상 group, data, scale, geometry, option을 받아 직접 그립니다.
- 기본 line/bar/area/trace 시리즈 외에도 topology, scatter, bubble, annotation, heatmap 같은 독자적인 시각화를 확장할 수 있습니다.

## 설치와 실행

```bash
npm install
npm run build
```

데모 화면을 실행하려면 다음 명령을 사용합니다.

```bash
npm run dev
```

브라우저에서 `http://127.0.0.1:8083/`을 열면 예제 차트를 확인할 수 있습니다.

## 오픈소스 개발 환경

공개 저장소에 올린 뒤에는 다음 흐름을 권장합니다.

```bash
npm ci
npm run typecheck
npm run build:lib
npm run build-demo
```

- `npm run build:lib`: npm 소비자가 import할 수 있는 CommonJS 라이브러리 산출물을 `lib/`에 생성합니다.
- `npm run build-demo`: 데모 페이지용 Webpack 번들을 `dist/`에 생성합니다.
- `npm run build`: 라이브러리와 데모를 모두 빌드합니다.
- `npm run build-prod`: 프로덕션 데모 번들을 생성합니다.

공개 저장소 기본 파일로 `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, `.gitignore`, `.npmignore`, GitHub Actions CI 설정을 포함합니다.

패키지로 사용할 때는 다음처럼 가져옵니다.

```ts
import {
    createSvgTraceChart,
    ChartController
} from 'kchart';
```

## Functional API Quick Start

새 UI에서는 `new BasicChart(...)`보다 `create*Chart(...)` 함수와 `ChartController`를 사용하는 것을 권장합니다. `ChartController`는 차트 인스턴스를 직접 노출하지 않고, UI에서 자주 필요한 명령만 체인 가능한 함수로 제공합니다.

```ts
import {
    createSvgTraceChart,
    ChartController,
    ChartItemEvent,
    ChartMouseEvent,
    TooltipData
} from 'kchart';
import { Subscription } from 'rxjs';

interface TrafficPoint {
    time: string;
    value: number;
}

const data: TrafficPoint[] = [
    { time: '00:00', value: 12 },
    { time: '01:00', value: 18 }
];

const chart: ChartController<TrafficPoint> = createSvgTraceChart(
    {
        selector: '#chart',
        data,
        axes: [
            { field: 'time', type: 'string', placement: 'bottom' },
            { field: 'value', type: 'number', placement: 'left' }
        ],
        title: {
            placement: 'top',
            content: 'Traffic'
        },
        tooltip: {
            visible: true,
            tooltipTextParser: (point: TooltipData) => `${point[0]}, ${point[1]}`
        },
        legend: {
            placement: 'right'
        }
    },
    [
        {
            selector: 'traffic',
            displayName: 'Traffic'
        }
    ]
);

const subscriptions: Subscription[] = [
    chart.onMouse((event: ChartMouseEvent) => {
        console.log(event.type, event.position);
    }),
    chart.onItem((event: ChartItemEvent) => {
        console.log(event.type, event.data);
    })
];

chart.draw();

chart.updateData([
    { time: '02:00', value: 21 },
    { time: '03:00', value: 17 }
]);

subscriptions.forEach((subscription) => subscription.unsubscribe());
chart.destroy();
```

전체 예제는 [examples/functional-ui-usage.ts](examples/functional-ui-usage.ts)를 참고하세요.

## Custom Series 예제

이미 제공되는 시리즈가 아니어도 `createCustomSeries(...)`에 renderer 함수를 넘기면 원하는 시각화를 직접 만들 수 있습니다. 아래 예제는 차트 코어가 계산한 x/y scale을 받아 SVG 원을 그리는 간단한 커스텀 series입니다.

```ts
import {
    createChart,
    createCustomSeries
} from 'kchart';

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
    shape: 'circle',
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

createChart<CirclePoint>({
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
}).draw();
```

전체 파일 예제는 [examples/custom-circle-series.ts](examples/custom-circle-series.ts)를 참고하세요.

## 차트 생성 함수

데이터와 축 설정을 넘기면 각 함수가 `ChartController<T>`를 반환합니다.

| 함수 | 용도 |
| --- | --- |
| `createChart(configuration)` | 기존 `BasicChart`를 functional controller로 감싼 기본 생성 함수 |
| `createSvgTraceChart(configuration, series, options?)` | SVG line/trace 계열 차트 |
| `createSvgAreaChart(configuration, series, options?)` | SVG area 차트 |
| `createCanvasTraceChart(configuration, series, options?)` | Canvas trace 차트 |
| `createWebglTraceChart(configuration, series, options?)` | WebGL trace 차트 |
| `createSvgGroupedBarChart(configuration, series, options?, direction?)` | grouped bar 차트 |
| `createSvgStackedBarChart(configuration, series, options?, direction?)` | stacked bar 차트 |
| `createSvgMultiSeriesChart(configuration, series, options?)` | 여러 series 타입을 섞는 차트 |
| `createSvgTopologyChart(configuration)` | topology 차트 |
| `createCustomSeries(configuration)` | renderer 함수로 만드는 커스텀 시리즈 |

차트 생성 함수보다 더 세밀하게 series를 조합하고 싶으면 다음 factory를 사용할 수 있습니다.

```ts
import {
    createSvgLineSeries,
    createSvgAreaSeries,
    createCanvasTraceSeries,
    createWebglTraceSeries,
    createCustomSeries,
    createSeriesByType
} from 'kchart';
```

## 기본 설정 구조

가장 중요한 설정은 `selector`, `data`, `axes`, `series`입니다.

```ts
const configuration = {
    selector: '#chart',
    data,
    axes: [
        { field: 'time', type: 'string', placement: 'bottom' },
        { field: 'value', type: 'number', placement: 'left' }
    ],
    title: {
        placement: 'top',
        content: 'Traffic'
    },
    tooltip: {
        visible: true,
        isMultiple: true
    },
    crossFilter: {
        enabled: true
    },
    legend: {
        placement: 'right'
    }
};
```

`selector`는 차트가 들어갈 DOM selector입니다. UI 프레임워크에서는 mount 이후 실제 DOM이 생긴 뒤 차트를 생성하세요.

`data`는 제네릭 타입 `T[]`로 전달합니다. `ChartController<T>`를 사용하면 `updateData(data: T[])`, `appendData(data: T)`도 같은 타입을 유지합니다.

`axes`의 `field`는 데이터 객체의 key와 맞춰야 합니다. `placement`는 `bottom`, `top`, `left`, `right` 위치를 의미합니다.

## Crossfilter 옵션

`crossFilter`는 대용량 데이터에서 zoom-in 구간의 렌더링 데이터를 먼저 줄이고 싶을 때 사용합니다. 기본값은 꺼짐입니다.

```ts
const configuration = {
    selector: '#chart',
    data,
    crossFilter: true,
    axes: [
        { field: 'x', type: 'number', placement: 'bottom' },
        { field: 'y', type: 'number', placement: 'left' }
    ]
};
```

객체 형태로도 지정할 수 있습니다.

```ts
const configuration = {
    selector: '#chart',
    data,
    crossFilter: {
        enabled: true
    }
};
```

동작 방식:

- `crossFilter`가 꺼져 있으면 기존처럼 원본 배열과 일반 `Array.filter` 경로를 사용합니다.
- `crossFilter`가 켜져 있으면 chart 초기화 시 `crossfilter2` 인덱스를 만들고, zoom-in 시 현재 x/y axis 범위에 맞는 데이터만 `allFiltered()`로 가져와 series, option, function 렌더링에 전달합니다.
- `data(nextData)` 또는 controller의 `updateData(nextData)`로 데이터가 교체되면 crossfilter 인덱스도 새 데이터 기준으로 갱신됩니다.
- 현재 적용 범위는 숫자/시간 축의 zoom-in 필터링입니다. category/string 축은 기존 배열 기반 렌더링을 유지하는 쪽이 안전합니다.

## Controller API

`ChartController<T>`는 다음 메서드를 제공합니다.

| 메서드 | 설명 |
| --- | --- |
| `draw()` | 차트를 최초 렌더링합니다. |
| `updateData(data)` | 전체 데이터를 교체하고 다시 그립니다. |
| `appendData(data, seriesSelector?)` | realtime/streaming 용도로 데이터를 추가합니다. |
| `updateSeries(series)` | series 구성을 교체합니다. |
| `updateAxes(axes)` | 축 구성을 교체합니다. |
| `setTitle(title)` | 차트 제목을 변경합니다. |
| `setRealtime(isRealtime, duration?, term?)` | realtime 업데이트를 켜거나 끕니다. |
| `showTooltipBySeries(selector)` | 특정 series tooltip을 표시합니다. |
| `hideTooltipBySeries(selector)` | 특정 series tooltip을 숨깁니다. |
| `onMouse(handler)` | mouse move/out/over 이벤트를 구독합니다. |
| `onZoom(handler)` | zoom 이벤트를 구독합니다. |
| `onTooltip(handler)` | tooltip 이벤트를 구독합니다. |
| `onItem(handler)` | chart item click 이벤트를 구독합니다. |
| `onLifecycle(handler)` | draw/destroy 등 lifecycle 이벤트를 구독합니다. |
| `destroy()` | SVG/Canvas/구독 등 차트 리소스를 정리합니다. |
| `getInstance()` | 필요할 때 기존 class API 인스턴스에 접근합니다. |

대부분의 메서드는 controller를 다시 반환하므로 다음처럼 체인할 수 있습니다.

```ts
chart
    .draw()
    .setTitle('Updated Traffic')
    .updateData(nextData);
```

## 이벤트 구독

이벤트 구독은 RxJS `Subscription`을 반환합니다. UI가 unmount될 때 반드시 `unsubscribe()`를 호출하세요.

```ts
const subscriptions = [
    chart.onMouse((event) => {
        console.log(event.type, event.position);
    }),
    chart.onZoom((event) => {
        console.log(event.transform);
    }),
    chart.onTooltip((event) => {
        console.log(event);
    }),
    chart.onItem((event) => {
        console.log(event.data);
    })
];

function cleanup() {
    subscriptions.forEach((subscription) => subscription.unsubscribe());
    chart.destroy();
}
```

## React에서 사용하기

```tsx
import { useEffect, useRef } from 'react';
import { createSvgTraceChart, ChartController } from 'kchart';

export function TrafficChart({ data }) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<ChartController | null>(null);

    useEffect(() => {
        if (!rootRef.current) {
            return;
        }

        const chart = createSvgTraceChart({
            selector: '#traffic-chart',
            data,
            axes: [
                { field: 'time', type: 'string', placement: 'bottom' },
                { field: 'value', type: 'number', placement: 'left' }
            ],
            tooltip: { visible: true },
            legend: { placement: 'right' }
        });

        chart.draw();
        chartRef.current = chart;

        return () => {
            chart.destroy();
            chartRef.current = null;
        };
    }, []);

    useEffect(() => {
        chartRef.current?.updateData(data);
    }, [data]);

    return <div id="traffic-chart" ref={rootRef} style={{ width: '100%', height: 420 }} />;
}
```

## Vue/Svelte에서 사용하기

핵심은 동일합니다.

1. DOM mount 이후 `create*Chart(...)`를 호출합니다.
2. 데이터 변경 시 `chart.updateData(nextData)`를 호출합니다.
3. 컴포넌트 destroy/unmount 시 이벤트 구독을 해제하고 `chart.destroy()`를 호출합니다.

## 스타일링

차트가 들어가는 컨테이너의 크기는 외부 UI가 책임지는 것을 권장합니다.

```html
<div id="chart" class="chart-panel"></div>
```

```css
.chart-panel {
    position: relative;
    width: 100%;
    height: 420px;
}
```

데모 화면은 [src/style.css](src/style.css)에 다크 메탈릭 스타일을 적용해두었습니다. 실제 제품 UI에서는 동일한 API를 유지한 채 컨테이너, 버튼, tooltip, SVG text/axis 스타일만 원하는 디자인 시스템에 맞춰 바꾸면 됩니다.

데모의 차트 배경 그리드는 기본적으로 꺼져 있습니다. 실제 축 grid line과 겹치면 화면이 지저분해질 수 있기 때문입니다. 장식용 배경 그리드가 필요할 때만 컨테이너에 `has-background-grid` 클래스를 추가하세요.

```html
<div id="chart" class="chart-panel has-background-grid"></div>
```

데모 폰트는 외부 웹폰트 없이 `Pretendard`, `Avenir Next`, `Inter`, system font 순서로 적용됩니다. SVG series line은 기본적으로 `stroke-linecap: round`, `stroke-linejoin: round`가 적용되고, Canvas line 계열도 context의 `lineCap`, `lineJoin`을 `round`로 설정합니다.

## 호환성

기존 class 기반 API는 계속 사용할 수 있습니다.

```ts
import { BasicChart } from 'kchart';

const chart = new BasicChart(configuration);
chart.draw();
```

다만 새 UI 통합에서는 functional API를 우선 사용하고, 특수 기능이 필요한 경우에만 `chart.getInstance()`로 class 인스턴스에 접근하는 방식을 추천합니다.

## Docs

- [Refactor Plan](docs/refactor-plan.md)
- [Functional API](docs/functional-api.md)
