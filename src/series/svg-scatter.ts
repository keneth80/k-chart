import type {
    KChartBubbleSeriesConfiguration,
    KChartLayerContext,
    KChartScatterSeriesConfiguration,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {resolveScalePosition} from './support/scale';

const resolveRadiusDomain = <T = any>(
    data: T[],
    radiusField?: keyof T & string
): [number, number] => {
    if (!radiusField) {
        return [0, 1];
    }
    const values = data
        .map((point) => Number(point[radiusField]))
        .filter(Number.isFinite);
    if (values.length === 0) {
        return [0, 1];
    }
    return [Math.min(...values), Math.max(...values)];
};

const createPointSeries = <T = any>(
    configuration: KChartScatterSeriesConfiguration<T> | KChartBubbleSeriesConfiguration<T>,
    bubble = false
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    render({group, data, xScale, yScale, color, animation}) {
        if (!xScale || !yScale) {
            return;
        }

        const bubbleConfiguration = configuration as KChartBubbleSeriesConfiguration<T>;
        const [minValue, maxValue] = resolveRadiusDomain(data, bubble ? bubbleConfiguration.radiusField : undefined);
        const minRadius = bubbleConfiguration.minRadius ?? 4;
        const maxRadius = bubbleConfiguration.maxRadius ?? 18;
        const radiusRange = Math.max(1, maxValue - minValue);
        const resolveRadius = (point: T, index: number): number => {
            if (bubble && bubbleConfiguration.radiusField) {
                const value = Number(point[bubbleConfiguration.radiusField]);
                if (!Number.isFinite(value)) {
                    return minRadius;
                }
                return minRadius + ((value - minValue) / radiusRange) * (maxRadius - minRadius);
            }
            if (typeof configuration.radius === 'function') {
                return configuration.radius(point, index);
            }
            return configuration.radius ?? 5;
        };

        group.selectAll<SVGCircleElement, T>(`circle.${configuration.selector}`)
            .data(data)
            .join('circle')
            .attr('class', configuration.selector)
            .attr('cx', (point) => resolveScalePosition(xScale, point[configuration.xField]))
            .attr('cy', (point) => resolveScalePosition(yScale, point[configuration.yField]))
            .attr('r', (point, index) => resolveRadius(point, index) * (animation.enabled ? animation.progress : 1))
            .style('fill', (point, index) => typeof configuration.fill === 'function'
                ? configuration.fill(point, index)
                : configuration.fill ?? configuration.color ?? color)
            .style('fill-opacity', configuration.opacity ?? (bubble ? 0.55 : 0.9))
            .style('stroke', configuration.stroke ?? 'rgba(248, 251, 255, 0.78)')
            .style('stroke-width', configuration.strokeWidth ?? 1.4);
    },
    tooltip({data, scales, seriesGroup, mouseX, mouseY}) {
        const xScale = scales.find((scale) => scale.field === configuration.xField);
        const yScale = scales.find((scale) => scale.field === configuration.yField);
        if (!xScale || !yScale) {
            return undefined;
        }

        seriesGroup.selectAll<SVGCircleElement, T>(`circle.${configuration.selector}`)
            .style('stroke-width', configuration.strokeWidth ?? 1.4);

        let active: T | undefined;
        let activeDistance = Number.POSITIVE_INFINITY;
        data.forEach((point) => {
            const x = resolveScalePosition(xScale, point[configuration.xField]);
            const y = resolveScalePosition(yScale, point[configuration.yField]);
            const distance = Math.hypot(mouseX - x, mouseY - y);
            if (distance < activeDistance && distance <= 18) {
                active = point;
                activeDistance = distance;
            }
        });

        if (!active) {
            return undefined;
        }

        seriesGroup.selectAll<SVGCircleElement, T>(`circle.${configuration.selector}`)
            .filter((point) => point === active)
            .style('stroke-width', Math.max(2.4, configuration.strokeWidth ?? 1.4));

        const x = resolveScalePosition(xScale, active[configuration.xField]);
        const y = resolveScalePosition(yScale, active[configuration.yField]);
        const bubbleConfiguration = configuration as KChartBubbleSeriesConfiguration<T>;
        const radiusText = bubble && bubbleConfiguration.radiusField
            ? `<br/>${String(bubbleConfiguration.radiusField)}: ${String(active[bubbleConfiguration.radiusField])}`
            : '';

        return {
            data: active,
            x,
            y,
            distance: activeDistance,
            color: configuration.color,
            html: `<strong>${String(active[configuration.xField])}</strong><br/>${String(configuration.yField)}: ${String(active[configuration.yField])}${radiusText}`
        };
    },
    clearTooltip({seriesGroup}: KChartLayerContext) {
        seriesGroup.selectAll<SVGCircleElement, T>(`circle.${configuration.selector}`)
            .style('stroke-width', configuration.strokeWidth ?? 1.4);
    }
});

export const createScatterSeries = <T = any>(
    configuration: KChartScatterSeriesConfiguration<T>
): KChartSeries<T> => createPointSeries(configuration, false);

export const createBubbleSeries = <T = any>(
    configuration: KChartBubbleSeriesConfiguration<T>
): KChartSeries<T> => createPointSeries(configuration, true);
