# React And Next.js Guide

KChart core package(`@keneth80/k-chart`)는 framework-agnostic 함수형 chart runtime입니다. React 프로젝트에서는 별도 저장소와 npm package로 배포되는 공식 wrapper인 `@keneth80/k-chart-react`를 사용하는 것이 가장 빠른 경로입니다.

- npm: [@keneth80/k-chart-react](https://www.npmjs.com/package/@keneth80/k-chart-react)
- GitHub: [keneth80/k-chart-react](https://github.com/keneth80/k-chart-react)

공식 wrapper가 맞지 않는 경우에는 core API를 Client Component에서 직접 사용하거나 자체 wrapper를 만들 수 있습니다. 이 저장소의 대안 예제는 [examples/react-wrapper.tsx](../examples/react-wrapper.tsx)에 있습니다.

## 가장 빠른 방법: 공식 React Wrapper

core package와 React wrapper를 함께 설치합니다. `react`와 `react-dom`은 wrapper의 peer dependency입니다.

```bash
npm install @keneth80/k-chart @keneth80/k-chart-react
```

Next.js App Router에서는 Client Component에서 사용합니다.

```tsx
'use client';

import { useMemo } from 'react';
import { createLineSeries } from '@keneth80/k-chart';
import { KChart } from '@keneth80/k-chart-react';

type Point = {
    x: number;
    value: number;
};

export function DashboardChart({ data }: { data: Point[] }) {
    const series = useMemo(() => [
        createLineSeries<Point>({
            selector: 'value',
            displayName: 'Value',
            xField: 'x',
            yField: 'value',
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
            tooltip={{ visible: true }}
            style={{ width: '100%', height: 420 }}
        />
    );
}
```

wrapper의 전체 props와 지원 범위는 [package README](https://github.com/keneth80/k-chart-react#readme)를 기준으로 확인하세요.

## Core API를 직접 Client Component에서 사용

KChart는 DOM element, SVG, Canvas, WebGL layer를 직접 만들기 때문에 core API를 직접 쓸 때는 Next.js App Router의 Client Component 안에서 mount 이후 생성해야 합니다.

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

## 자체 React Wrapper 만들기

공식 wrapper 대신 lifecycle이나 props contract를 직접 관리해야 한다면 자체 wrapper 컴포넌트를 만들 수 있습니다.

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
    transpilePackages: ['@keneth80/k-chart', '@keneth80/k-chart-react']
};

export default nextConfig;
```

core API만 직접 사용하는 프로젝트라면 `@keneth80/k-chart-react` 항목은 제외합니다.

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
