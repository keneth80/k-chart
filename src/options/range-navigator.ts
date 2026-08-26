import {brushX} from 'd3-brush';
import {scaleLinear, scaleTime} from 'd3-scale';
import {area, line} from 'd3-shape';
import type {
    KChartAxis,
    KChartConfiguration,
    KChartRangeNavigatorConfiguration,
    KChartRangeNavigatorOption,
    KChartRangeNavigatorRange,
    KChartRangeNavigatorValue,
    KChartScaleType,
    KChartSeries,
    KChartState
} from '../core/contracts';

export interface KChartRangeNavigatorPoint {
    x: KChartRangeNavigatorValue;
    y: number;
}

export interface KChartRangeNavigatorRenderContext<T = any> {
    fullDomain: KChartRangeNavigatorRange;
    selectedRange: KChartRangeNavigatorRange;
    onRangeChange: (range: KChartRangeNavigatorRange) => void;
    xAxis?: KChartAxis<T>;
}

export const DEFAULT_RANGE_NAVIGATOR_HEIGHT = 52;
export const DEFAULT_RANGE_NAVIGATOR_GAP = 14;
export const RANGE_NAVIGATOR_MINIMUM_AXIS_FOOTER = 28;
const rangeNavigatorDestroyers = new WeakMap<object, () => void>();

const valueOf = (value: KChartRangeNavigatorValue): number => value instanceof Date
    ? value.getTime()
    : Number(value);

const fromValue = (
    value: number,
    type: Extract<KChartScaleType, 'number' | 'time'>
): KChartRangeNavigatorValue => type === 'time' ? new Date(value) : value;

const isFiniteRangeValue = (value: KChartRangeNavigatorValue): boolean => Number.isFinite(valueOf(value));

export const createRangeNavigatorOption = <T = any>(
    config: KChartRangeNavigatorConfiguration<T> = {}
): KChartRangeNavigatorOption<T> => ({
    type: 'range-navigator',
    visible: config.visible ?? true,
    config
});

export const resolveRangeNavigatorLayout = <T = any>(
    config?: KChartRangeNavigatorConfiguration<T>
): {height: number; gap: number; reservedSpace: number} => {
    const configuredHeight = Number(config?.height ?? DEFAULT_RANGE_NAVIGATOR_HEIGHT);
    const configuredGap = Number(config?.gap ?? DEFAULT_RANGE_NAVIGATOR_GAP);
    const height = Number.isFinite(configuredHeight)
        ? Math.max(24, configuredHeight)
        : DEFAULT_RANGE_NAVIGATOR_HEIGHT;
    const gap = Number.isFinite(configuredGap)
        ? Math.max(0, configuredGap)
        : DEFAULT_RANGE_NAVIGATOR_GAP;

    return {height, gap, reservedSpace: height + gap};
};

export const resolveRangeNavigatorConfiguration = <T = any>(
    config: KChartConfiguration<T>
): KChartRangeNavigatorConfiguration<T> | undefined => {
    const option = config.options?.find(
        (item): item is KChartRangeNavigatorOption<T> =>
            item.type === 'range-navigator'
    );
    if (option) {
        return {
            ...option.config,
            visible: option.visible ?? option.config?.visible ?? true
        };
    }

    return config.rangeNavigator
        ? {
            ...config.rangeNavigator,
            visible: config.rangeNavigator.visible ?? true
        }
        : undefined;
};

export const resolveRangeNavigatorAxis = <T = any>(
    axes: KChartAxis<T>[],
    xField?: keyof T & string
): KChartAxis<T> | undefined => axes.find((axis) =>
    (axis.type === 'number' || axis.type === 'time')
    && (axis.placement === 'bottom' || axis.placement === 'top')
    && (!xField || axis.field === xField)
);

export const resolveRangeNavigatorYField = <T = any>(
    series: KChartSeries<T>[],
    configuredField?: keyof T & string
): (keyof T & string) | undefined => configuredField
    ?? series.find((item) => item.yField)?.yField;

export const resolveRangeNavigatorDataDomain = <T = any>(
    data: T[],
    field: keyof T & string,
    type: Extract<KChartScaleType, 'number' | 'time'>
): KChartRangeNavigatorRange | undefined => {
    let min = Infinity;
    let max = -Infinity;

    data.forEach((item) => {
        const rawValue = (item as any)?.[field];
        const value = type === 'time'
            ? new Date(rawValue).getTime()
            : Number(rawValue);
        if (!Number.isFinite(value)) {
            return;
        }
        min = Math.min(min, value);
        max = Math.max(max, value);
    });

    return Number.isFinite(min) && Number.isFinite(max)
        ? [fromValue(min, type), fromValue(max, type)]
        : undefined;
};

export const normalizeRangeNavigatorRange = (
    range: KChartRangeNavigatorRange,
    fullDomain: KChartRangeNavigatorRange,
    type: Extract<KChartScaleType, 'number' | 'time'>
): KChartRangeNavigatorRange => {
    const rawDomainStart = valueOf(fullDomain[0]);
    const rawDomainEnd = valueOf(fullDomain[1]);
    const domainStart = Math.min(rawDomainStart, rawDomainEnd);
    const domainEnd = Math.max(rawDomainStart, rawDomainEnd);
    const rangeStart = Math.min(valueOf(range[0]), valueOf(range[1]));
    const rangeEnd = Math.max(valueOf(range[0]), valueOf(range[1]));
    if (!Number.isFinite(rangeStart) || !Number.isFinite(rangeEnd)) {
        return [fromValue(rawDomainStart, type), fromValue(rawDomainEnd, type)];
    }
    const start = Math.max(domainStart, Math.min(domainEnd, rangeStart));
    const end = Math.max(start, Math.min(domainEnd, rangeEnd));

    return rawDomainStart <= rawDomainEnd
        ? [fromValue(start, type), fromValue(end, type)]
        : [fromValue(end, type), fromValue(start, type)];
};

export const reconcileRangeNavigatorRange = (
    range: KChartRangeNavigatorRange,
    fullDomain: KChartRangeNavigatorRange,
    type: Extract<KChartScaleType, 'number' | 'time'>
): KChartRangeNavigatorRange => {
    const domainLow = Math.min(valueOf(fullDomain[0]), valueOf(fullDomain[1]));
    const domainHigh = Math.max(valueOf(fullDomain[0]), valueOf(fullDomain[1]));
    const rangeLow = Math.min(valueOf(range[0]), valueOf(range[1]));
    const rangeHigh = Math.max(valueOf(range[0]), valueOf(range[1]));
    const overlapLow = Math.max(domainLow, rangeLow);
    const overlapHigh = Math.min(domainHigh, rangeHigh);

    return overlapHigh > overlapLow
        ? normalizeRangeNavigatorRange(range, fullDomain, type)
        : [fromValue(valueOf(fullDomain[0]), type), fromValue(valueOf(fullDomain[1]), type)];
};

export const rangeNavigatorRangeToPixels = (
    range: KChartRangeNavigatorRange,
    fullDomain: KChartRangeNavigatorRange,
    width: number,
    type: Extract<KChartScaleType, 'number' | 'time'>
): [number, number] => {
    const normalized = normalizeRangeNavigatorRange(range, fullDomain, type);
    const domainStart = valueOf(fullDomain[0]);
    const domainEnd = valueOf(fullDomain[1]);
    const span = domainEnd - domainStart;
    if (!Number.isFinite(span) || span === 0 || width <= 0) {
        return [0, Math.max(0, width)];
    }

    const pixels = normalized.map((value) => (
        (valueOf(value) - domainStart) / span
    ) * width) as [number, number];

    return [Math.min(pixels[0], pixels[1]), Math.max(pixels[0], pixels[1])];
};

export const rangeNavigatorPixelsToRange = (
    selection: [number, number],
    fullDomain: KChartRangeNavigatorRange,
    width: number,
    type: Extract<KChartScaleType, 'number' | 'time'>
): KChartRangeNavigatorRange => {
    const domainStart = valueOf(fullDomain[0]);
    const domainEnd = valueOf(fullDomain[1]);
    if (!Number.isFinite(domainStart) || !Number.isFinite(domainEnd) || width <= 0) {
        return [fromValue(domainStart, type), fromValue(domainEnd, type)];
    }
    const safeWidth = Math.max(1, width);
    const selectionStart = Math.min(selection[0], selection[1]);
    const selectionEnd = Math.max(selection[0], selection[1]);
    const start = domainStart + Math.max(0, Math.min(width, selectionStart)) / safeWidth
        * (domainEnd - domainStart);
    const end = domainStart + Math.max(0, Math.min(width, selectionEnd)) / safeWidth
        * (domainEnd - domainStart);

    return normalizeRangeNavigatorRange(
        [fromValue(start, type), fromValue(end, type)],
        fullDomain,
        type
    );
};

export const resolveRangeNavigatorTopOffset = <T = any>(
    marginBottom: number,
    config?: KChartRangeNavigatorConfiguration<T>
): number => {
    const {gap, reservedSpace} = resolveRangeNavigatorLayout(config);
    const axisFooter = Math.max(
        RANGE_NAVIGATOR_MINIMUM_AXIS_FOOTER,
        marginBottom - reservedSpace
    );
    return axisFooter + gap;
};

export const resolveRangeNavigatorOverview = <T = any>(
    data: T[],
    xField: keyof T & string,
    yField: keyof T & string,
    type: Extract<KChartScaleType, 'number' | 'time'>
): KChartRangeNavigatorPoint[] => data
    .map((item): KChartRangeNavigatorPoint | undefined => {
        const rawX = (item as any)?.[xField];
        const x = type === 'time' ? new Date(rawX) : Number(rawX);
        const y = Number((item as any)?.[yField]);
        if (!isFiniteRangeValue(x) || !Number.isFinite(y)) {
            return undefined;
        }
        return {x, y};
    })
    .filter((point): point is KChartRangeNavigatorPoint => Boolean(point))
    .sort((left, right) => valueOf(left.x) - valueOf(right.x));

export const destroyRangeNavigator = <T = any>(
    state: Pick<KChartState<T>, 'layers'>
): void => {
    rangeNavigatorDestroyers.get(state as object)?.();
    rangeNavigatorDestroyers.delete(state as object);
    state.layers.rootGroup
        .selectAll<SVGGElement, unknown>('g.kchart-range-navigator')
        .remove();
};

export const renderRangeNavigator = <T = any>(
    state: KChartState<T>,
    context: KChartRangeNavigatorRenderContext<T>
): void => {
    destroyRangeNavigator(state);

    const config = resolveRangeNavigatorConfiguration(state.config);
    if (!config || config.visible === false) {
        return;
    }

    const xAxis = context.xAxis ?? resolveRangeNavigatorAxis(
        state.initialAxes,
        config.xField
    );
    if (!xAxis || (xAxis.type !== 'number' && xAxis.type !== 'time')) {
        return;
    }
    const axisType = xAxis.type;

    const fullDomain = context.fullDomain;
    if (!fullDomain.every(isFiniteRangeValue)) {
        return;
    }

    const width = Math.max(0, state.plotSize.width);
    const {height} = resolveRangeNavigatorLayout(config);
    if (width === 0) {
        return;
    }

    const group = state.layers.rootGroup
        .append('g')
        .attr('class', 'kchart-range-navigator')
        .attr('transform', `translate(${state.margin.left}, ${Math.max(
            0,
            state.margin.top
                + state.plotSize.height
                + resolveRangeNavigatorTopOffset(state.margin.bottom, config)
        )})`);

    group.append('rect')
        .attr('class', 'kchart-range-navigator-background')
        .attr('width', width)
        .attr('height', height)
        .attr('rx', 4)
        .style('fill', 'rgba(10, 14, 20, 0.05)')
        .style('stroke', 'rgba(93, 112, 126, 0.26)');

    const yField = resolveRangeNavigatorYField(state.series, config.yField);
    const points = yField
        ? resolveRangeNavigatorOverview(state.data, xAxis.field, yField, axisType)
        : [];
    if (points.length) {
        const xScale = axisType === 'time'
            ? scaleTime<number>().domain(fullDomain.map((value) => new Date(valueOf(value))) as [Date, Date]).range([0, width])
            : scaleLinear().domain(fullDomain.map(valueOf) as [number, number]).range([0, width]);
        let yMin = Infinity;
        let yMax = -Infinity;
        points.forEach((point) => {
            yMin = Math.min(yMin, point.y);
            yMax = Math.max(yMax, point.y);
        });
        if (yMin === yMax) {
            const padding = Math.abs(yMin) * 0.01 || 1;
            yMin -= padding;
            yMax += padding;
        }
        const yScale = scaleLinear()
            .domain([yMin, yMax])
            .range([height - 5, 5]);
        const xPosition = (point: KChartRangeNavigatorPoint): number => xScale(
            axisType === 'time' ? new Date(valueOf(point.x)) : valueOf(point.x)
        ) as number;

        group.append('path')
            .datum(points)
            .attr('class', 'kchart-range-navigator-area')
            .attr('d', area<KChartRangeNavigatorPoint>()
                .x(xPosition)
                .y0(height - 4)
                .y1((point) => yScale(point.y)))
            .style('fill', config.fill ?? 'rgba(69, 137, 255, 0.18)')
            .style('pointer-events', 'none');

        group.append('path')
            .datum(points)
            .attr('class', 'kchart-range-navigator-line')
            .attr('d', line<KChartRangeNavigatorPoint>()
                .x(xPosition)
                .y((point) => yScale(point.y)))
            .style('fill', 'none')
            .style('stroke', config.stroke ?? '#4589ff')
            .style('stroke-width', 1.25)
            .style('pointer-events', 'none');
    }

    const brush = brushX<unknown>()
        .extent([[0, 0], [width, height]])
        .on('end.kchart-range-navigator', (event: any) => {
            if (!event.sourceEvent) {
                return;
            }
            const selection = (event.selection ?? [0, width]) as [number, number];
            context.onRangeChange(
                rangeNavigatorPixelsToRange(selection, fullDomain, width, axisType)
            );
        });
    const brushGroup = group.append('g')
        .attr('class', 'kchart-range-navigator-brush');
    brushGroup.call(brush as any);
    brushGroup.call(
        brush.move as any,
        rangeNavigatorRangeToPixels(
            context.selectedRange,
            fullDomain,
            width,
            axisType
        )
    );
    brushGroup.selectAll<SVGRectElement, unknown>('.overlay')
        .style('cursor', 'crosshair');
    brushGroup.selectAll<SVGRectElement, unknown>('.selection')
        .style('fill', config.selectionFill ?? 'rgba(69, 137, 255, 0.16)')
        .style('stroke', config.stroke ?? '#4589ff');
    brushGroup.selectAll<SVGRectElement, unknown>('.handle')
        .style('fill', config.handleFill ?? '#edf3f8')
        .style('stroke', config.stroke ?? '#4589ff');

    const cleanup = (): void => {
        brush.on('.kchart-range-navigator', null);
        group.remove();
    };
    rangeNavigatorDestroyers.set(state as object, cleanup);
};
