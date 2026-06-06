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
