import {area as d3Area, curveMonotoneX, line as d3Line} from 'd3-shape';
import type {
    KChartAreaSeriesConfiguration,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {resolveScalePosition} from './support/scale';

export const createAreaSeries = <T = any>(
    configuration: KChartAreaSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color ?? configuration.fill ?? configuration.stroke,
    downsample: configuration.downsample,
    render({group, data, xScale, yScale, color, plotSize, animation}) {
        if (!xScale || !yScale) {
            return;
        }

        const resolveX = (point: T): number =>
            resolveScalePosition(xScale, point[configuration.xField]);
        const resolveY = (point: T): number =>
            resolveScalePosition(yScale, point[configuration.yField]);
        const baselineValue = configuration.baseline ?? 0;
        const baseline = Number.isFinite(yScale.scale(baselineValue))
            ? yScale.scale(baselineValue)
            : plotSize.height;
        const visibleCount = animation.enabled
            ? Math.max(1, Math.ceil(data.length * animation.progress))
            : data.length;
        const renderData = visibleCount < data.length ? data.slice(0, visibleCount) : data;
        const area = d3Area<T>()
            .defined((point: T) =>
                point[configuration.xField] !== undefined &&
                point[configuration.yField] !== undefined
            )
            .x(resolveX)
            .y0(baseline)
            .y1(resolveY);
        const line = d3Line<T>()
            .defined((point: T) =>
                point[configuration.xField] !== undefined &&
                point[configuration.yField] !== undefined
            )
            .x(resolveX)
            .y(resolveY);

        if (configuration.curve) {
            area.curve(curveMonotoneX);
            line.curve(curveMonotoneX);
        }

        group.selectAll<SVGPathElement, T[]>(`path.${configuration.selector}`)
            .data([renderData])
            .join('path')
            .attr('class', configuration.selector)
            .attr('d', area)
            .style('fill', configuration.fill ?? configuration.color ?? color)
            .style('fill-opacity', configuration.fillOpacity ?? 0.26)
            .style('stroke', 'none');

        group.selectAll<SVGPathElement, T[]>(`path.${configuration.selector}-line`)
            .data([renderData])
            .join('path')
            .attr('class', `${configuration.selector}-line`)
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', configuration.stroke ?? configuration.color ?? color)
            .style('stroke-width', configuration.strokeWidth ?? 2)
            .style('stroke-linecap', 'round')
            .style('stroke-linejoin', 'round');
    }
});
