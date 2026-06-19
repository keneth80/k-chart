import {curveMonotoneX, line as d3Line} from 'd3-shape';
import type {
    KChartLineSeriesConfiguration,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {resolveScalePosition} from './support/scale';

export const createLineSeries = <T = any>(
    configuration: KChartLineSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    downsample: configuration.downsample,
    render({group, data, xScale, yScale, color}) {
        if (!xScale || !yScale) {
            return;
        }

        const resolveX = (point: T): number =>
            resolveScalePosition(xScale, point[configuration.xField]);
        const resolveY = (point: T): number =>
            resolveScalePosition(yScale, point[configuration.yField]);
        const line = d3Line<T>()
            .defined((point: T) =>
                point[configuration.xField] !== undefined &&
                point[configuration.yField] !== undefined
            )
            .x(resolveX)
            .y(resolveY);

        if (configuration.curve) {
            line.curve(curveMonotoneX);
        }

        group.selectAll<SVGPathElement, T[]>(`.${configuration.selector}`)
            .data([data])
            .join('path')
            .attr('class', configuration.selector)
            .attr('d', line)
            .style('fill', 'none')
            .style('stroke', configuration.color ?? color)
            .style('stroke-width', configuration.strokeWidth ?? 2)
            .style('stroke-linecap', 'round')
            .style('stroke-linejoin', 'round');

        if (!configuration.dot) {
            group.selectAll(`.${configuration.selector}-dot`).remove();
            return;
        }

        const dotOption = typeof configuration.dot === 'object'
            ? configuration.dot
            : {};
        group.selectAll<SVGCircleElement, T>(`.${configuration.selector}-dot`)
            .data(data)
            .join('circle')
            .attr('class', `${configuration.selector}-dot`)
            .attr('cx', resolveX)
            .attr('cy', resolveY)
            .attr('r', dotOption.radius ?? 3)
            .style('fill', dotOption.fill ?? configuration.color ?? color)
            .style('stroke', dotOption.stroke ?? '#ffffff')
            .style('stroke-width', 1);
    }
});
