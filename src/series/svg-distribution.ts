import {select} from 'd3-selection';
import type {
    KChartBoxPlotSeriesConfiguration,
    KChartHistogramSeriesConfiguration,
    KChartLayerContext,
    KChartResolvedScale,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {resolveScalePosition} from './support/scale';

const isInsideRect = (
    mouseX: number,
    mouseY: number,
    x: number,
    y: number,
    width: number,
    height: number
): boolean => mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;

const resolveBandSize = <T = any>(
    scale: KChartResolvedScale<T>,
    fallback: number
): number => typeof scale.scale.bandwidth === 'function'
    ? scale.scale.bandwidth()
    : fallback;

const resolveValue = <T = any>(point: T, field: keyof T & string): number => {
    const value = Number(point[field]);
    return Number.isFinite(value) ? value : 0;
};

const resolveArray = (value: any): number[] => Array.isArray(value)
    ? value.map(Number).filter(Number.isFinite)
    : [];

export const createBoxPlotSeries = <T = any>(
    configuration: KChartBoxPlotSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.medianField,
    color: configuration.color,
    render({group, data, xScale, yScale, plotSize, color, animation}) {
        if (!xScale || !yScale) {
            return;
        }

        const fallbackBand = plotSize.width / Math.max(data.length, 1);
        const band = resolveBandSize(xScale, fallbackBand);
        const boxWidth = Math.max(
            configuration.minBoxWidth ?? 16,
            Math.min(configuration.maxBoxWidth ?? 46, band * (configuration.boxWidthRatio ?? 0.48))
        );
        const visibleCount = animation.enabled
            ? Math.max(1, Math.ceil(data.length * animation.progress))
            : data.length;
        const renderData = visibleCount < data.length ? data.slice(0, visibleCount) : data;
        const stroke = configuration.color ?? color;

        const itemGroup = group.selectAll<SVGGElement, T>(`g.${configuration.selector}`)
            .data(renderData)
            .join('g')
            .attr('class', configuration.selector);

        itemGroup.each(function(point, index) {
            const item = select<SVGGElement, T>(this);
            const centerX = resolveScalePosition(xScale, point[configuration.xField]);
            const minY = resolveScalePosition(yScale, point[configuration.minField]);
            const q1Y = resolveScalePosition(yScale, point[configuration.q1Field]);
            const medianY = resolveScalePosition(yScale, point[configuration.medianField]);
            const q3Y = resolveScalePosition(yScale, point[configuration.q3Field]);
            const maxY = resolveScalePosition(yScale, point[configuration.maxField]);
            const boxTop = Math.min(q1Y, q3Y);
            const boxHeight = Math.max(1, Math.abs(q3Y - q1Y));
            const x = centerX - boxWidth / 2;
            const whiskerWidth = boxWidth * 0.58;
            const fill = typeof configuration.fill === 'function'
                ? configuration.fill(point, index)
                : configuration.fill ?? configuration.color ?? color;

            item.selectAll('line,rect,circle').remove();
            item.append('line')
                .attr('class', 'kchart-boxplot-whisker')
                .attr('x1', centerX)
                .attr('x2', centerX)
                .attr('y1', minY)
                .attr('y2', maxY);
            item.append('line')
                .attr('class', 'kchart-boxplot-cap')
                .attr('x1', centerX - whiskerWidth / 2)
                .attr('x2', centerX + whiskerWidth / 2)
                .attr('y1', minY)
                .attr('y2', minY);
            item.append('line')
                .attr('class', 'kchart-boxplot-cap')
                .attr('x1', centerX - whiskerWidth / 2)
                .attr('x2', centerX + whiskerWidth / 2)
                .attr('y1', maxY)
                .attr('y2', maxY);
            item.append('rect')
                .attr('class', 'kchart-boxplot-box')
                .attr('x', x)
                .attr('y', boxTop)
                .attr('width', boxWidth)
                .attr('height', boxHeight)
                .style('fill', fill)
                .style('fill-opacity', configuration.opacity ?? 0.34);
            item.append('line')
                .attr('class', 'kchart-boxplot-median')
                .attr('x1', x)
                .attr('x2', x + boxWidth)
                .attr('y1', medianY)
                .attr('y2', medianY);

            if (configuration.outliersField) {
                const outliers = resolveArray(point[configuration.outliersField]);
                item.selectAll<SVGCircleElement, number>('circle.kchart-boxplot-outlier')
                    .data(outliers)
                    .join('circle')
                    .attr('class', 'kchart-boxplot-outlier')
                    .attr('cx', centerX)
                    .attr('cy', (value) => resolveScalePosition(yScale, value))
                    .attr('r', 3)
                    .style('fill', stroke)
                    .style('fill-opacity', 0.85);
            }
        });

        group.selectAll<SVGLineElement, T>(`g.${configuration.selector} line`)
            .style('stroke', stroke)
            .style('stroke-width', configuration.strokeWidth ?? 1.8)
            .style('stroke-linecap', 'round');
        group.selectAll<SVGRectElement, T>(`g.${configuration.selector} rect`)
            .style('stroke', stroke)
            .style('stroke-width', configuration.strokeWidth ?? 1.8);
    },
    tooltip({data, scales, plotSize, seriesGroup, mouseX, mouseY}) {
        const xScale = scales.find((scale) => scale.field === configuration.xField);
        const yScale = scales.find((scale) => scale.field === configuration.medianField);
        if (!xScale || !yScale) {
            return undefined;
        }

        seriesGroup.selectAll<SVGRectElement, T>(`g.${configuration.selector} rect.kchart-boxplot-box`)
            .style('stroke-width', configuration.strokeWidth ?? 1.8);

        const fallbackBand = plotSize.width / Math.max(data.length, 1);
        const band = resolveBandSize(xScale, fallbackBand);
        const boxWidth = Math.max(
            configuration.minBoxWidth ?? 16,
            Math.min(configuration.maxBoxWidth ?? 46, band * (configuration.boxWidthRatio ?? 0.48))
        );

        for (let index = 0; index < data.length; index += 1) {
            const point = data[index];
            const centerX = resolveScalePosition(xScale, point[configuration.xField]);
            const q1Y = resolveScalePosition(yScale, point[configuration.q1Field]);
            const q3Y = resolveScalePosition(yScale, point[configuration.q3Field]);
            const boxTop = Math.min(q1Y, q3Y);
            const boxHeight = Math.max(1, Math.abs(q3Y - q1Y));
            const x = centerX - boxWidth / 2;
            if (!isInsideRect(mouseX, mouseY, x - 8, boxTop - 8, boxWidth + 16, boxHeight + 16)) {
                continue;
            }

            seriesGroup.selectAll<SVGRectElement, T>(`g.${configuration.selector} rect.kchart-boxplot-box`)
                .filter((item) => item === point)
                .style('stroke-width', Math.max(2.8, configuration.strokeWidth ?? 1.8));

            return {
                data: point,
                x: centerX,
                y: boxTop,
                distance: 0,
                color: configuration.color,
                html: [
                    `<strong>${String(point[configuration.xField])}</strong>`,
                    `min: ${String(point[configuration.minField])}`,
                    `q1: ${String(point[configuration.q1Field])}`,
                    `median: ${String(point[configuration.medianField])}`,
                    `q3: ${String(point[configuration.q3Field])}`,
                    `max: ${String(point[configuration.maxField])}`
                ].join('<br/>')
            };
        }

        return undefined;
    },
    clearTooltip({seriesGroup}: KChartLayerContext) {
        seriesGroup.selectAll<SVGRectElement, T>(`g.${configuration.selector} rect.kchart-boxplot-box`)
            .style('stroke-width', configuration.strokeWidth ?? 1.8);
    }
});

export const createHistogramSeries = <T = any>(
    configuration: KChartHistogramSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.binStartField,
    yField: configuration.valueField,
    color: configuration.color,
    render({group, data, xScale, yScale, plotSize, color, animation}) {
        if (!xScale || !yScale) {
            return;
        }

        const baselineValue = configuration.baseline ?? 0;
        const baselineY = Number.isFinite(yScale.scale(baselineValue))
            ? yScale.scale(baselineValue)
            : plotSize.height;
        const visibleCount = animation.enabled
            ? Math.max(1, Math.ceil(data.length * animation.progress))
            : data.length;
        const renderData = visibleCount < data.length ? data.slice(0, visibleCount) : data;
        const gap = configuration.gap ?? 2;

        group.selectAll<SVGRectElement, T>(`rect.${configuration.selector}`)
            .data(renderData)
            .join('rect')
            .attr('class', configuration.selector)
            .attr('x', (point) => xScale.scale(resolveValue(point, configuration.binStartField)) + gap / 2)
            .attr('y', (point) => Math.min(baselineY, resolveScalePosition(yScale, point[configuration.valueField])))
            .attr('width', (point) => Math.max(
                1,
                xScale.scale(resolveValue(point, configuration.binEndField))
                    - xScale.scale(resolveValue(point, configuration.binStartField))
                    - gap
            ))
            .attr('height', (point) => Math.abs(resolveScalePosition(yScale, point[configuration.valueField]) - baselineY))
            .attr('rx', configuration.radius ?? 3)
            .style('fill', (point, index) => typeof configuration.fill === 'function'
                ? configuration.fill(point, index)
                : configuration.fill ?? configuration.color ?? color)
            .style('fill-opacity', configuration.opacity ?? 0.84)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);
    },
    tooltip({data, scales, plotSize, seriesGroup, mouseX, mouseY}) {
        const xScale = scales.find((scale) => scale.field === configuration.binStartField);
        const yScale = scales.find((scale) => scale.field === configuration.valueField);
        if (!xScale || !yScale) {
            return undefined;
        }

        seriesGroup.selectAll<SVGRectElement, T>(`rect.${configuration.selector}`)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);

        const baselineValue = configuration.baseline ?? 0;
        const baselineY = Number.isFinite(yScale.scale(baselineValue))
            ? yScale.scale(baselineValue)
            : plotSize.height;
        const gap = configuration.gap ?? 2;

        for (const point of data) {
            const start = resolveValue(point, configuration.binStartField);
            const end = resolveValue(point, configuration.binEndField);
            const x = xScale.scale(start) + gap / 2;
            const width = Math.max(1, xScale.scale(end) - xScale.scale(start) - gap);
            const valueY = resolveScalePosition(yScale, point[configuration.valueField]);
            const y = Math.min(baselineY, valueY);
            const height = Math.abs(valueY - baselineY);
            if (!isInsideRect(mouseX, mouseY, x, y, width, height)) {
                continue;
            }

            seriesGroup.selectAll<SVGRectElement, T>(`rect.${configuration.selector}`)
                .filter((item) => item === point)
                .style('stroke', '#f8fbff')
                .style('stroke-width', 2);

            return {
                data: point,
                x: x + width / 2,
                y,
                distance: 0,
                color: configuration.color,
                html: `<strong>${start} - ${end}</strong><br/>${String(configuration.valueField)}: ${String(point[configuration.valueField])}`
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
