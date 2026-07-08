import type {
    KChartBarSeriesConfiguration,
    KChartGroupedColumnSegment,
    KChartGroupedColumnSeriesConfiguration,
    KChartLayerContext,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {resolveScalePosition} from './support/scale';

const defaultGroupedPalette = [
    '#5db8ff',
    '#56d08f',
    '#f3b45b',
    '#d876ff',
    '#ff6b8a',
    '#72e4ff'
];

const isInsideRect = (
    mouseX: number,
    mouseY: number,
    x: number,
    y: number,
    width: number,
    height: number
): boolean => mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;

const resolveBandSize = <T = any>(
    scale: any,
    fallback: number
): number => typeof scale.bandwidth === 'function'
    ? scale.bandwidth()
    : fallback;

export const createBarSeries = <T = any>(
    configuration: KChartBarSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    render({group, data, xScale, yScale, plotSize, color, animation}) {
        if (!xScale || !yScale) {
            return;
        }

        const baselineValue = configuration.baseline ?? 0;
        const baselineX = Number.isFinite(xScale.scale(baselineValue))
            ? xScale.scale(baselineValue)
            : 0;
        const fallbackBand = plotSize.height / Math.max(data.length, 1);
        const band = resolveBandSize(yScale.scale, fallbackBand);
        const barHeight = Math.max(
            configuration.minBarHeight ?? 8,
            Math.min(configuration.maxBarHeight ?? 34, configuration.barHeight ?? band * 0.58)
        );
        const visibleCount = animation.enabled
            ? Math.max(1, Math.ceil(data.length * animation.progress))
            : data.length;
        const renderData = visibleCount < data.length ? data.slice(0, visibleCount) : data;

        group.selectAll<SVGRectElement, T>(`rect.${configuration.selector}`)
            .data(renderData)
            .join('rect')
            .attr('class', configuration.selector)
            .attr('x', (point) => Math.min(baselineX, resolveScalePosition(xScale, point[configuration.xField])))
            .attr('y', (point) => resolveScalePosition(yScale, point[configuration.yField]) - barHeight / 2)
            .attr('width', (point) => Math.abs(resolveScalePosition(xScale, point[configuration.xField]) - baselineX))
            .attr('height', barHeight)
            .attr('rx', configuration.radius ?? 5)
            .style('fill', (point, index) => typeof configuration.fill === 'function'
                ? configuration.fill(point, index)
                : configuration.fill ?? configuration.color ?? color)
            .style('fill-opacity', configuration.opacity ?? 0.88)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);
    },
    tooltip({data, scales, seriesGroup, mouseX, mouseY}) {
        const xScale = scales.find((scale) => scale.field === configuration.xField);
        const yScale = scales.find((scale) => scale.field === configuration.yField);
        if (!xScale || !yScale) {
            return undefined;
        }

        seriesGroup.selectAll<SVGRectElement, T>(`rect.${configuration.selector}`)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);

        const baselineValue = configuration.baseline ?? 0;
        const baselineX = Number.isFinite(xScale.scale(baselineValue))
            ? xScale.scale(baselineValue)
            : 0;
        const fallbackBand = 32;
        const band = resolveBandSize(yScale.scale, fallbackBand);
        const barHeight = Math.max(
            configuration.minBarHeight ?? 8,
            Math.min(configuration.maxBarHeight ?? 34, configuration.barHeight ?? band * 0.58)
        );

        for (const point of data) {
            const valueX = resolveScalePosition(xScale, point[configuration.xField]);
            const x = Math.min(baselineX, valueX);
            const y = resolveScalePosition(yScale, point[configuration.yField]) - barHeight / 2;
            const width = Math.abs(valueX - baselineX);
            if (!isInsideRect(mouseX, mouseY, x, y, width, barHeight)) {
                continue;
            }

            seriesGroup.selectAll<SVGRectElement, T>(`rect.${configuration.selector}`)
                .filter((item) => item === point)
                .style('stroke', '#f8fbff')
                .style('stroke-width', 2);

            return {
                data: point,
                x: valueX,
                y,
                distance: 0,
                color: configuration.color,
                html: `<strong>${String(point[configuration.yField])}</strong><br/>${String(configuration.xField)}: ${String(point[configuration.xField])}`
            };
        }

        return undefined;
    },
    clearTooltip({seriesGroup}: KChartLayerContext) {
        seriesGroup.selectAll<SVGRectElement, T>(`rect.${configuration.selector}`)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);
    }
});

export const createGroupedColumnSeries = <T = any>(
    configuration: KChartGroupedColumnSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.segments[0]?.field,
    color: configuration.segments[0]?.color,
    render({group, data, xScale, yScale, plotSize, animation}) {
        if (!xScale || !yScale || configuration.segments.length === 0) {
            return;
        }

        const baselineValue = configuration.baseline ?? 0;
        const baselineY = Number.isFinite(yScale.scale(baselineValue))
            ? yScale.scale(baselineValue)
            : plotSize.height;
        const fallbackBand = plotSize.width / Math.max(data.length, 1);
        const band = resolveBandSize(xScale.scale, fallbackBand);
        const groupWidth = band * (configuration.groupWidthRatio ?? 0.72);
        const gap = configuration.gap ?? 4;
        const barWidth = Math.max(2, (groupWidth - gap * (configuration.segments.length - 1)) / configuration.segments.length);
        const visibleCount = animation.enabled
            ? Math.max(1, Math.ceil(data.length * animation.progress))
            : data.length;
        const renderData = visibleCount < data.length ? data.slice(0, visibleCount) : data;
        const columns = renderData.flatMap((point) => configuration.segments.map((segment, segmentIndex) => ({
            point,
            segment,
            segmentIndex
        })));

        group.selectAll<SVGRectElement, {
            point: T;
            segment: KChartGroupedColumnSegment<T>;
            segmentIndex: number;
        }>(`rect.${configuration.selector}`)
            .data(columns)
            .join('rect')
            .attr('class', configuration.selector)
            .attr('x', ({point, segmentIndex}) => {
                const center = resolveScalePosition(xScale, point[configuration.xField]);
                return center - groupWidth / 2 + segmentIndex * (barWidth + gap);
            })
            .attr('y', ({point, segment}) => Math.min(baselineY, resolveScalePosition(yScale, point[segment.field])))
            .attr('width', barWidth)
            .attr('height', ({point, segment}) => Math.abs(resolveScalePosition(yScale, point[segment.field]) - baselineY))
            .attr('rx', configuration.radius ?? 4)
            .style('fill', ({segment, segmentIndex}) => segment.color ?? defaultGroupedPalette[segmentIndex % defaultGroupedPalette.length])
            .style('fill-opacity', configuration.opacity ?? 0.88)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);
    },
    tooltip({data, scales, plotSize, seriesGroup, mouseX, mouseY}) {
        const xScale = scales.find((scale) => scale.field === configuration.xField);
        const yScale = configuration.segments[0]
            ? scales.find((scale) => scale.field === configuration.segments[0].field)
            : undefined;
        if (!xScale || !yScale || configuration.segments.length === 0) {
            return undefined;
        }

        seriesGroup.selectAll<SVGRectElement, any>(`rect.${configuration.selector}`)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);

        const baselineValue = configuration.baseline ?? 0;
        const baselineY = Number.isFinite(yScale.scale(baselineValue))
            ? yScale.scale(baselineValue)
            : plotSize.height;
        const fallbackBand = plotSize.width / Math.max(data.length, 1);
        const band = resolveBandSize(xScale.scale, fallbackBand);
        const groupWidth = band * (configuration.groupWidthRatio ?? 0.72);
        const gap = configuration.gap ?? 4;
        const barWidth = Math.max(2, (groupWidth - gap * (configuration.segments.length - 1)) / configuration.segments.length);

        for (const point of data) {
            const center = resolveScalePosition(xScale, point[configuration.xField]);
            for (let segmentIndex = 0; segmentIndex < configuration.segments.length; segmentIndex += 1) {
                const segment = configuration.segments[segmentIndex];
                const valueY = resolveScalePosition(yScale, point[segment.field]);
                const x = center - groupWidth / 2 + segmentIndex * (barWidth + gap);
                const y = Math.min(baselineY, valueY);
                const height = Math.abs(valueY - baselineY);
                if (!isInsideRect(mouseX, mouseY, x, y, barWidth, height)) {
                    continue;
                }

                seriesGroup.selectAll<SVGRectElement, any>(`rect.${configuration.selector}`)
                    .filter((item) => item.point === point && item.segment.field === segment.field)
                    .style('stroke', '#f8fbff')
                    .style('stroke-width', 2);

                return {
                    data: point,
                    x: x + barWidth / 2,
                    y,
                    distance: 0,
                    color: segment.color,
                    html: `<strong>${segment.label ?? String(segment.field)}</strong><br/>${String(point[configuration.xField])}: ${String(point[segment.field])}`
                };
            }
        }

        return undefined;
    },
    clearTooltip({seriesGroup}: KChartLayerContext) {
        seriesGroup.selectAll<SVGRectElement, any>(`rect.${configuration.selector}`)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);
    }
});
