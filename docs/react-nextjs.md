# React And Next.js Guide

KChart core package(`@keneth80/k-chart`)는 framework-agnostic 함수형 chart runtime입니다. 현재 npm으로 배포된 라이브러리 안에는 공식 React plugin package가 포함되어 있지 않습니다.

현재 React wrapper는 `kchart-next-playground` 저장소의 `packages/react/src`에 로컬 예제로 들어 있습니다. 이 문서는 React/Next.js 프로젝트에서 core API를 직접 쓰는 방법과, wrapper 컴포넌트를 만들어 재사용하는 방법을 설명합니다.

복사해서 사용할 수 있는 wrapper 예제 파일도 제공합니다: [examples/react-wrapper.tsx](../examples/react-wrapper.tsx)

## Client Component에서 사용

KChart는 DOM element, SVG, Canvas, WebGL layer를 직접 만들기 때문에 Next.js App Router에서는 반드시 Client Component 안에서 mount 이후 생성해야 합니다.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import {
    createKChart,
    createLineSeries,
    type KChartController
} from '@keneth80/k-chart';

type TrafficPoint = {
    time: string;
    value: number;
};

export function TrafficChart({ data }: { data: TrafficPoint[] }) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<KChartController<TrafficPoint> | null>(null);

    useEffect(() => {
        if (!rootRef.current) {
            return;
        }

        const chart = createKChart<TrafficPoint>({
            selector: rootRef.current,
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
                    curve: true
                })
            ],
            grid: { visible: true, y: true },
            legend: { visible: true, placement: 'top' },
            tooltip: { visible: true }
        }).render();

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

## 재사용 가능한 React Wrapper

여러 화면에서 같은 방식으로 차트를 쓴다면 wrapper 컴포넌트를 만들어두는 편이 좋습니다.

전체 파일 예제: [examples/react-wrapper.tsx](../examples/react-wrapper.tsx)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import {
    createKChart,
    type KChartAxis,
    type KChartConfiguration,
    type KChartController,
    type KChartOption,
    type KChartSeries,
    type KChartTooltipConfiguration
} from '@keneth80/k-chart';

export type KChartReactProps<T = any> = {
    data: T[];
    axes: KChartAxis<T>[];
    series: KChartSeries<T>[];
    options?: KChartOption[];
    width?: number;
    height?: number;
    margin?: KChartConfiguration<T>['margin'];
    title?: KChartConfiguration<T>['title'];
    grid?: KChartConfiguration<T>['grid'];
    legend?: KChartConfiguration<T>['legend'];
    tooltip?: KChartTooltipConfiguration<T>;
    className?: string;
};

export function KChart<T = any>(props: KChartReactProps<T>) {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const chartRef = useRef<KChartController<T> | null>(null);

    useEffect(() => {
        if (!rootRef.current) {
            return;
        }

        chartRef.current?.destroy();
        chartRef.current = createKChart<T>({
            selector: rootRef.current,
            data: props.data,
            axes: props.axes,
            series: props.series,
            options: props.options,
            width: props.width ?? rootRef.current.clientWidth,
            height: props.height ?? rootRef.current.clientHeight,
            margin: props.margin,
            title: props.title,
            grid: props.grid,
            legend: props.legend,
            tooltip: props.tooltip,
            className: props.className
        }).render();

        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [props]);

    useEffect(() => {
        if (!rootRef.current || !chartRef.current || typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (!rect) {
                return;
            }

            chartRef.current?.resize({
                width: Math.max(rect.width, 320),
                height: Math.max(rect.height, 260)
            });
        });

        observer.observe(rootRef.current);

        return () => observer.disconnect();
    }, []);

    return <div ref={rootRef} className="kchart-react-root" />;
}
```

## Wrapper 사용 예

```tsx
'use client';

import { useMemo } from 'react';
import { createLineSeries } from '@keneth80/k-chart';
import { KChart } from './KChart';

type Point = {
    x: number;
    value: number;
    volume: number;
};

export function DashboardChart({ data }: { data: Point[] }) {
    const series = useMemo(() => [
        createLineSeries<Point>({
            selector: 'value',
            displayName: 'Value',
            xField: 'x',
            yField: 'value',
            color: '#5db8ff',
            curve: true
        }),
        createLineSeries<Point>({
            selector: 'volume',
            displayName: 'Volume',
            xField: 'x',
            yField: 'volume',
            color: '#56d08f',
            curve: true
        })
    ], []);

    return (
        <KChart<Point>
            data={data}
            axes={[
                { field: 'x', type: 'number', placement: 'bottom', title: 'Index' },
                { field: 'value', type: 'number', placement: 'left', title: 'Value' }
            ]}
            series={series}
            grid={{ visible: true, y: true }}
            legend={{ visible: true, placement: 'top', selectable: true }}
            tooltip={{ visible: true }}
        />
    );
}
```

## Next.js 설정

Next.js 프로젝트에서 패키지 transpile이 필요하면 `next.config.mjs`에 추가합니다.

```js
const nextConfig = {
    transpilePackages: ['@keneth80/k-chart']
};

export default nextConfig;
```

## OffscreenCanvas Worker 사용

`asyncRender`를 쓰는 경우 worker 파일은 client bundle에서 생성해야 합니다.

```ts
// kchart-render.worker.ts
import { startKChartRenderWorker } from '@keneth80/k-chart';

startKChartRenderWorker();
```

```tsx
createWebglLineSeries<Point>({
    selector: 'trace',
    xField: 'x',
    yField: 'value',
    asyncRender: {
        enabled: true,
        workerFactory: () => new Worker(
            new URL('./kchart-render.worker.ts', import.meta.url),
            { type: 'module' }
        )
    }
});
```

OffscreenCanvas나 Worker를 지원하지 않는 브라우저에서는 기존 main-thread renderer로 fallback됩니다.
