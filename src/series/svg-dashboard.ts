import type {
    KChartGaugeSeriesConfiguration,
    KChartLayerContext,
    KChartSeries,
    KChartTreemapSeriesConfiguration,
    KChartWaterfallSeriesConfiguration
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {resolveScalePosition} from './support/scale';

type TreemapTile<T> = {
    point: T;
    x: number;
    y: number;
    width: number;
    height: number;
    value: number;
};

type WaterfallItem<T> = {
    point: T;
    index: number;
    start: number;
    end: number;
    delta: number;
    total: boolean;
    value: number;
};

const toNumber = (value: any, fallback = 0): number => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const isInsideRect = (
    mouseX: number,
    mouseY: number,
    x: number,
    y: number,
    width: number,
    height: number
): boolean => mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height;

const resolvePaletteColor = (index: number): string => [
    '#5db8ff',
    '#56d08f',
    '#f3b45b',
    '#d876ff',
    '#ff6b8a',
    '#72e4ff',
    '#a8d95f'
][index % 7];

const layoutTreemap = <T = any>(
    data: T[],
    valueField: keyof T & string,
    width: number,
    height: number,
    gap: number,
    sort = true
): Array<TreemapTile<T>> => {
    const values = data
        .map((point, index) => ({point, index, value: Math.max(0, toNumber(point[valueField]))}))
        .filter((item) => item.value > 0);
    const items = sort
        ? values.slice().sort((a, b) => b.value - a.value)
        : values;
    const tiles: Array<TreemapTile<T>> = [];

    const visit = (
        nodes: typeof items,
        x: number,
        y: number,
        tileWidth: number,
        tileHeight: number,
        vertical: boolean
    ) => {
        if (nodes.length === 0) {
            return;
        }
        if (nodes.length === 1) {
            tiles.push({
                point: nodes[0].point,
                x: x + gap / 2,
                y: y + gap / 2,
                width: Math.max(1, tileWidth - gap),
                height: Math.max(1, tileHeight - gap),
                value: nodes[0].value
            });
            return;
        }

        const total = nodes.reduce((sum, item) => sum + item.value, 0);
        let running = 0;
        let splitIndex = 0;
        const half = total / 2;
        for (; splitIndex < nodes.length - 1; splitIndex += 1) {
            running += nodes[splitIndex].value;
            if (running >= half) {
                splitIndex += 1;
                break;
            }
        }

        const left = nodes.slice(0, splitIndex);
        const right = nodes.slice(splitIndex);
        const leftTotal = left.reduce((sum, item) => sum + item.value, 0);
        const ratio = total > 0 ? leftTotal / total : 0.5;

        if (vertical) {
            const leftWidth = tileWidth * ratio;
            visit(left, x, y, leftWidth, tileHeight, false);
            visit(right, x + leftWidth, y, tileWidth - leftWidth, tileHeight, false);
        } else {
            const topHeight = tileHeight * ratio;
            visit(left, x, y, tileWidth, topHeight, true);
            visit(right, x, y + topHeight, tileWidth, tileHeight - topHeight, true);
        }
    };

    visit(items, 0, 0, width, height, width >= height);
    return tiles;
};

const polar = (cx: number, cy: number, radius: number, angle: number): [number, number] => {
    const radian = (angle - 90) * Math.PI / 180;
    return [cx + radius * Math.cos(radian), cy + radius * Math.sin(radian)];
};

const arcPath = (
    cx: number,
    cy: number,
    radius: number,
    startAngle: number,
    endAngle: number
): string => {
    const [startX, startY] = polar(cx, cy, radius, endAngle);
    const [endX, endY] = polar(cx, cy, radius, startAngle);
    const largeArc = Math.abs(endAngle - startAngle) <= 180 ? 0 : 1;
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 0 ${endX} ${endY}`;
};

const buildWaterfall = <T = any>(
    data: T[],
    valueField: keyof T & string,
    totalField?: keyof T & string,
    baseline = 0
): Array<WaterfallItem<T>> => {
    let current = baseline;
    return data.map((point, index) => {
        const total = totalField ? Boolean(point[totalField]) : false;
        const value = toNumber(point[valueField]);
        const start = total ? baseline : current;
        const end = total ? value : current + value;
        current = end;
        return {
            point,
            index,
            start,
            end,
            delta: total ? value - baseline : value,
            total,
            value
        };
    });
};

const resolveWaterfallLabel = <T = any>(
    configuration: KChartWaterfallSeriesConfiguration<T>,
    item: WaterfallItem<T>
): string => {
    const labelConfiguration = typeof configuration.labels === 'object'
        ? configuration.labels
        : {};
    if (labelConfiguration.formatter) {
        return labelConfiguration.formatter(item);
    }
    return `${item.value}`;
};

export const createTreemapSeries = <T = any>(
    configuration: KChartTreemapSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    color: configuration.color,
    render({group, data, plotSize, color, animation}) {
        const tiles = layoutTreemap(
            data,
            configuration.valueField,
            plotSize.width,
            plotSize.height,
            configuration.gap ?? 6,
            configuration.sort ?? true
        );
        const visibleCount = animation.enabled
            ? Math.max(1, Math.ceil(tiles.length * animation.progress))
            : tiles.length;
        const renderTiles = visibleCount < tiles.length ? tiles.slice(0, visibleCount) : tiles;

        const tileGroup = group.selectAll<SVGGElement, TreemapTile<T>>(`g.${configuration.selector}`)
            .data(renderTiles)
            .join('g')
            .attr('class', configuration.selector)
            .attr('transform', (tile) => `translate(${tile.x}, ${tile.y})`);

        tileGroup.selectAll<SVGRectElement, TreemapTile<T>>('rect')
            .data((tile) => [tile])
            .join('rect')
            .attr('width', (tile) => tile.width)
            .attr('height', (tile) => tile.height)
            .attr('rx', configuration.radius ?? 6)
            .style('fill', (tile, index) => {
                if (typeof configuration.fill === 'function') {
                    return configuration.fill(tile.point, index);
                }
                if (configuration.colorField) {
                    return String(tile.point[configuration.colorField]);
                }
                return configuration.fill ?? configuration.color ?? color ?? resolvePaletteColor(index);
            })
            .style('fill-opacity', configuration.opacity ?? 0.84)
            .style('stroke', 'rgba(248, 251, 255, 0.5)')
            .style('stroke-width', 1);

        tileGroup.selectAll<SVGTextElement, TreemapTile<T>>('text')
            .data((tile) => tile.width * tile.height >= (configuration.minLabelArea ?? 1800) ? [tile] : [])
            .join('text')
            .attr('x', 10)
            .attr('y', 20)
            .style('fill', '#f8fbff')
            .style('font-size', 12)
            .style('font-weight', 800)
            .style('pointer-events', 'none')
            .text((tile) => String(tile.point[configuration.labelField]));
    },
    tooltip({data, plotSize, seriesGroup, mouseX, mouseY}) {
        const tiles = layoutTreemap(
            data,
            configuration.valueField,
            plotSize.width,
            plotSize.height,
            configuration.gap ?? 6,
            configuration.sort ?? true
        );

        seriesGroup.selectAll<SVGRectElement, TreemapTile<T>>(`g.${configuration.selector} rect`)
            .style('stroke-width', 1);

        for (const tile of tiles) {
            if (!isInsideRect(mouseX, mouseY, tile.x, tile.y, tile.width, tile.height)) {
                continue;
            }

            seriesGroup.selectAll<SVGRectElement, TreemapTile<T>>(`g.${configuration.selector} rect`)
                .filter((item) => item.point === tile.point)
                .style('stroke-width', 2.6);

            return {
                data: tile.point,
                x: tile.x + tile.width / 2,
                y: tile.y,
                distance: 0,
                color: configuration.color,
                html: `<strong>${String(tile.point[configuration.labelField])}</strong><br/>${String(configuration.valueField)}: ${String(tile.point[configuration.valueField])}`
            };
        }

        return undefined;
    },
    clearTooltip({seriesGroup}: KChartLayerContext) {
        seriesGroup.selectAll<SVGRectElement, TreemapTile<T>>(`g.${configuration.selector} rect`)
            .style('stroke-width', 1);
    }
});

export const createGaugeSeries = <T = any>(
    configuration: KChartGaugeSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    color: configuration.color,
    render({group, data, plotSize, color, animation}) {
        const point = data[0];
        if (!point) {
            return;
        }

        const min = configuration.min ?? 0;
        const max = configuration.max ?? 100;
        const value = Math.max(min, Math.min(max, toNumber(point[configuration.valueField], min)));
        const progress = max === min ? 0 : (value - min) / (max - min);
        const animatedProgress = progress * (animation.enabled ? animation.progress : 1);
        const startAngle = configuration.startAngle ?? -130;
        const endAngle = configuration.endAngle ?? 130;
        const valueAngle = startAngle + (endAngle - startAngle) * animatedProgress;
        const radius = Math.max(40, Math.min(plotSize.width, plotSize.height * 1.55) / 2 - 16);
        const cx = plotSize.width / 2;
        const cy = Math.min(plotSize.height - 24, plotSize.height * 0.72);
        const thickness = configuration.thickness ?? 16;
        const valueText = configuration.valueFormat
            ? configuration.valueFormat(value, point)
            : `${Math.round(value)}`;
        const label = configuration.labelField
            ? String(point[configuration.labelField])
            : configuration.displayName ?? configuration.selector;

        group.selectAll('*').remove();
        group.append('path')
            .attr('class', `${configuration.selector}-track`)
            .attr('d', arcPath(cx, cy, radius, startAngle, endAngle))
            .style('fill', 'none')
            .style('stroke', configuration.trackColor ?? 'rgba(188, 206, 218, 0.2)')
            .style('stroke-width', thickness)
            .style('stroke-linecap', 'round');
        group.append('path')
            .attr('class', `${configuration.selector}-value`)
            .attr('d', arcPath(cx, cy, radius, startAngle, valueAngle))
            .style('fill', 'none')
            .style('stroke', configuration.color ?? color ?? '#5db8ff')
            .style('stroke-width', thickness)
            .style('stroke-linecap', 'round');

        if (configuration.showNeedle ?? true) {
            const [needleX, needleY] = polar(cx, cy, radius - thickness / 2, valueAngle);
            group.append('line')
                .attr('x1', cx)
                .attr('y1', cy)
                .attr('x2', needleX)
                .attr('y2', needleY)
                .style('stroke', configuration.needleColor ?? '#f8fbff')
                .style('stroke-width', 2.4)
                .style('stroke-linecap', 'round');
            group.append('circle')
                .attr('cx', cx)
                .attr('cy', cy)
                .attr('r', 5)
                .style('fill', configuration.needleColor ?? '#f8fbff');
        }

        group.append('text')
            .attr('x', cx)
            .attr('y', cy - 8)
            .attr('text-anchor', 'middle')
            .style('fill', '#f8fbff')
            .style('font-size', 32)
            .style('font-weight', 900)
            .text(valueText);
        group.append('text')
            .attr('x', cx)
            .attr('y', cy + 18)
            .attr('text-anchor', 'middle')
            .style('fill', 'rgba(237, 243, 248, 0.72)')
            .style('font-size', 12)
            .style('font-weight', 700)
            .text(label);
    }
});

export const createWaterfallSeries = <T = any>(
    configuration: KChartWaterfallSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.valueField,
    color: configuration.color,
    render({group, data, xScale, yScale, plotSize, animation}) {
        if (!xScale || !yScale) {
            return;
        }

        const baseline = configuration.baseline ?? 0;
        const items = buildWaterfall(data, configuration.valueField, configuration.totalField, baseline);
        const visibleCount = animation.enabled
            ? Math.max(1, Math.ceil(items.length * animation.progress))
            : items.length;
        const renderItems = visibleCount < items.length ? items.slice(0, visibleCount) : items;
        const band = typeof xScale.scale.bandwidth === 'function'
            ? xScale.scale.bandwidth()
            : plotSize.width / Math.max(items.length, 1);
        const barWidth = band * (configuration.barWidthRatio ?? 0.58);
        const radius = configuration.radius ?? 4;

        group.selectAll<SVGLineElement, WaterfallItem<T>>(`line.${configuration.selector}-connector`)
            .data(renderItems.slice(1))
            .join('line')
            .attr('class', `${configuration.selector}-connector`)
            .attr('x1', (item) => {
                const previous = items[item.index - 1];
                return resolveScalePosition(xScale, previous.point[configuration.xField]) + barWidth / 2;
            })
            .attr('x2', (item) => resolveScalePosition(xScale, item.point[configuration.xField]) - barWidth / 2)
            .attr('y1', (item) => resolveScalePosition(yScale, items[item.index - 1].end))
            .attr('y2', (item) => resolveScalePosition(yScale, items[item.index - 1].end))
            .style('stroke', configuration.connectorColor ?? 'rgba(188, 206, 218, 0.42)')
            .style('stroke-dasharray', configuration.connectorDasharray ?? '3 4')
            .style('stroke-width', configuration.connectorWidth ?? 1.2);

        group.selectAll<SVGRectElement, WaterfallItem<T>>(`rect.${configuration.selector}`)
            .data(renderItems)
            .join('rect')
            .attr('class', configuration.selector)
            .attr('x', (item) => resolveScalePosition(xScale, item.point[configuration.xField]) - barWidth / 2)
            .attr('y', (item) => Math.min(resolveScalePosition(yScale, item.start), resolveScalePosition(yScale, item.end)))
            .attr('width', barWidth)
            .attr('height', (item) => Math.max(1, Math.abs(resolveScalePosition(yScale, item.end) - resolveScalePosition(yScale, item.start))))
            .attr('rx', radius)
            .style('fill', (item) => {
                if (item.total) {
                    return configuration.totalColor ?? configuration.color ?? '#5db8ff';
                }
                return item.delta >= 0
                    ? configuration.positiveColor ?? '#56d08f'
                    : configuration.negativeColor ?? '#ff6b8a';
            })
            .style('fill-opacity', configuration.opacity ?? 0.88)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);

        const labelConfiguration = typeof configuration.labels === 'object'
            ? configuration.labels
            : {};
        const labelsVisible = typeof configuration.labels === 'boolean'
            ? configuration.labels
            : labelConfiguration.visible ?? false;
        const labelData = labelsVisible
            ? renderItems.filter((item) => labelConfiguration.showZero ?? item.value !== 0)
            : [];

        group.selectAll<SVGTextElement, WaterfallItem<T>>(`text.${configuration.selector}-label`)
            .data(labelData)
            .join('text')
            .attr('class', `${configuration.selector}-label`)
            .attr('x', (item) => resolveScalePosition(xScale, item.point[configuration.xField]))
            .attr('y', (item) => {
                const yStart = resolveScalePosition(yScale, item.start);
                const yEnd = resolveScalePosition(yScale, item.end);
                return Math.min(yStart, yEnd) - (labelConfiguration.offset ?? 6);
            })
            .attr('text-anchor', 'middle')
            .style('fill', labelConfiguration.color ?? 'rgba(237, 243, 248, 0.86)')
            .style('font-size', labelConfiguration.fontSize ?? 11)
            .style('font-weight', labelConfiguration.fontWeight ?? 800)
            .style('pointer-events', 'none')
            .text((item) => resolveWaterfallLabel(configuration, item));
    },
    tooltip({data, scales, plotSize, seriesGroup, mouseX, mouseY}) {
        const xScale = scales.find((scale) => scale.field === configuration.xField);
        const yScale = scales.find((scale) => scale.field === configuration.valueField);
        if (!xScale || !yScale) {
            return undefined;
        }

        seriesGroup.selectAll<SVGRectElement, WaterfallItem<T>>(`rect.${configuration.selector}`)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);

        const baseline = configuration.baseline ?? 0;
        const items = buildWaterfall(data, configuration.valueField, configuration.totalField, baseline);
        const band = typeof xScale.scale.bandwidth === 'function'
            ? xScale.scale.bandwidth()
            : plotSize.width / Math.max(items.length, 1);
        const barWidth = band * (configuration.barWidthRatio ?? 0.58);

        for (const item of items) {
            const x = resolveScalePosition(xScale, item.point[configuration.xField]) - barWidth / 2;
            const y = Math.min(resolveScalePosition(yScale, item.start), resolveScalePosition(yScale, item.end));
            const height = Math.max(1, Math.abs(resolveScalePosition(yScale, item.end) - resolveScalePosition(yScale, item.start)));
            if (!isInsideRect(mouseX, mouseY, x, y, barWidth, height)) {
                continue;
            }

            seriesGroup.selectAll<SVGRectElement, WaterfallItem<T>>(`rect.${configuration.selector}`)
                .filter((rectItem) => rectItem.point === item.point)
                .style('stroke', '#f8fbff')
                .style('stroke-width', 2);

            return {
                data: item.point,
                x: x + barWidth / 2,
                y,
                distance: 0,
                color: configuration.color,
                html: `<strong>${String(item.point[configuration.xField])}</strong><br/>delta: ${item.delta}<br/>end: ${item.end}`
            };
        }

        return undefined;
    },
    clearTooltip({seriesGroup}: KChartLayerContext) {
        seriesGroup.selectAll<SVGRectElement, WaterfallItem<T>>(`rect.${configuration.selector}`)
            .style('stroke', 'transparent')
            .style('stroke-width', 0);
    }
});
