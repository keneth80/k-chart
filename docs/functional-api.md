# KChart Functional API

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
    createCanvasLineSeries,
    createCanvasPointSeries,
    createSpecAreaOption,
    createWebglPointSeries,
    createCustomSeries,
    KChartController,
    KChartSeries
} from '@keneth80/k-chart';
```

새 저장소 기준 public export는 `src/kchart.ts`입니다. 기존 class 기반 구현은 마이그레이션 참고용 source로 남아 있어도 패키지 API로는 내보내지 않습니다.

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
