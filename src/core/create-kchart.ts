import { extent } from 'd3-array';
import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { scaleBand, scaleLinear, scalePoint, scaleTime } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { BaseType, pointer, select, Selection } from 'd3-selection';
import { D3ZoomEvent, zoom, zoomIdentity, ZoomTransform } from 'd3-zoom';
import {resolveCursorGuide} from '../options/cursor-line';
import {renderGuideLines} from '../options/guide-line';
import {renderSpecAreas, resolveSpecAreas} from '../options/spec-area';
import {
    destroyTooltipNotes,
    pinTooltipNote,
    renderTooltipNotes,
    resolveTooltipNoteConfiguration
} from '../options/tooltip-note';
import {isCanvasTransferred} from '../series/support/canvas';
import {resolveScalePosition} from '../series/support/scale';
import {downsampleLTTB} from '../utils/downsample-lttb';

export * from './contracts';
import type {
    KChartScaleType,
    KChartPlacement,
    KChartTextAlign,
    KChartLegendPlacement,
    KChartZoomDirection,
    KChartZoomMode,
    KChartZoomInputDevice,
    KChartCandlestickColorMode,
    KChartGlobeLandMode,
    KChartAxis,
    KChartMargin,
    KChartSize,
    KChartResolvedScale,
    KChartDownsampleContext,
    KChartDownsampleConfiguration,
    KChartAnimationConfiguration,
    KChartAnimationContext,
    KChartAnimationEasing,
    KChartLayerContext,
    KChartSeries,
    KChartTitleConfiguration,
    KChartGridConfiguration,
    KChartLegendConfiguration,
    KChartTooltipConfiguration,
    KChartZoomContext,
    KChartWheelZoomConfiguration,
    KChartGestureZoomConfiguration,
    KChartZoomConfiguration,
    KChartGuideLinesConfiguration,
    KChartConfiguration,
    KChartState,
    KChartController
} from './contracts';

const defaultMargin: KChartMargin = {
    top: 24,
    right: 24,
    bottom: 36,
    left: 44
};

const cloneAxisDomain = (domain?: Array<string | number | Date>): Array<string | number | Date> | undefined => domain
    ? domain.map((value) => value instanceof Date ? new Date(value) : value)
    : undefined;

const cloneAxes = <T = any>(axes: KChartAxis<T>[]): KChartAxis<T>[] => axes.map((axis) => ({
    ...axis,
    min: axis.min instanceof Date ? new Date(axis.min) : axis.min,
    max: axis.max instanceof Date ? new Date(axis.max) : axis.max,
    domain: cloneAxisDomain(axis.domain)
}));

const isZoomScaleSupported = <T = any>(axis: KChartAxis<T>): boolean => axis.type === 'number' || axis.type === 'time';

const isHorizontalAxis = <T = any>(axis: KChartAxis<T>): boolean => axis.placement === 'bottom' || axis.placement === 'top';

const isZoomEnabled = <T = any>(state: KChartState<T>): boolean => state.config.zoom?.enabled === true
    && state.axes.some((axis) => isZoomScaleSupported(axis));

const isTouchLikeZoomEvent = (event: any): boolean => event?.type?.startsWith?.('touch') === true
    || event?.pointerType === 'touch'
    || typeof event?.touches?.length === 'number';

const isMobileLikeInput = (): boolean => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(hover: none)').matches);

const matchesZoomInputDevice = (devices: KChartZoomInputDevice, event: any): boolean => {
    if (devices === 'all') {
        return true;
    }

    const touchLikeEvent = isTouchLikeZoomEvent(event);
    const mobileLikeInput = isMobileLikeInput();
    return devices === 'mobile'
        ? touchLikeEvent && mobileLikeInput
        : !touchLikeEvent && !mobileLikeInput;
};

const isZoomOptionEnabled = <TOption extends { enabled?: boolean }>(
    option: boolean | TOption | undefined,
    fallback: boolean
): boolean => {
    if (typeof option === 'boolean') {
        return option;
    }
    if (option?.enabled !== undefined) {
        return option.enabled;
    }
    return fallback;
};

const getZoomWheelSensitivity = <T = any>(config?: KChartZoomConfiguration<T>): number => {
    const option = config?.wheelZoom;
    return typeof option === 'object' && typeof option.sensitivity === 'number' && option.sensitivity > 0
        ? option.sensitivity
        : 1;
};

const getZoomWheelDevice = <T = any>(config?: KChartZoomConfiguration<T>): KChartZoomInputDevice => {
    const option = config?.wheelZoom;
    return typeof option === 'object' && option.devices ? option.devices : 'pc';
};

const getZoomGestureDevice = <T = any>(config?: KChartZoomConfiguration<T>): KChartZoomInputDevice => {
    const option = config?.gestureZoom;
    return typeof option === 'object' && option.devices ? option.devices : 'mobile';
};

const getZoomGestureMinTouches = <T = any>(config?: KChartZoomConfiguration<T>): number => {
    const option = config?.gestureZoom;
    return typeof option === 'object' && typeof option.minTouches === 'number'
        ? Math.max(1, option.minTouches)
        : 1;
};

const defaultAnimationContext: KChartAnimationContext = {
    enabled: false,
    progress: 1,
    elapsed: 0,
    duration: 0,
    easing: 'easeOutCubic',
    mode: 'enter',
    phase: 'enter'
};

const resolveAnimationConfiguration = <T = any>(
    config: KChartConfiguration<T>
): Required<KChartAnimationConfiguration> => {
    const option = config.animation;
    const configuration = typeof option === 'object' && option !== null
        ? option
        : {};

    return {
        enabled: option === true || configuration.enabled === true,
        duration: Math.max(0, configuration.duration ?? 720),
        easing: configuration.easing ?? 'easeOutCubic',
        mode: configuration.mode ?? 'enter',
        respectReducedMotion: configuration.respectReducedMotion ?? true
    };
};

const shouldReduceMotion = (): boolean => typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const applyAnimationEasing = (
    progress: number,
    easing: KChartAnimationEasing
): number => {
    const value = Math.max(0, Math.min(progress, 1));

    if (easing === 'linear') {
        return value;
    }
    if (easing === 'easeInOutCubic') {
        return value < 0.5
            ? 4 * value * value * value
            : 1 - Math.pow(-2 * value + 2, 3) / 2;
    }
    return 1 - Math.pow(1 - value, 3);
};

const cancelSeriesAnimation = <T = any>(state: KChartState<T>): void => {
    state.animationRenderId += 1;
    if (state.animationFrame !== undefined && typeof globalThis.cancelAnimationFrame === 'function') {
        globalThis.cancelAnimationFrame(state.animationFrame);
    }
    state.animationFrame = undefined;
};

const hasZoomInputOptions = <T = any>(config?: KChartZoomConfiguration<T>): boolean => config?.wheelZoom !== undefined
    || config?.gestureZoom !== undefined;

const getEventTouchCount = (event: any): number => {
    if (typeof event?.touches?.length === 'number') {
        return event.touches.length;
    }
    if (typeof event?.sourceEvent?.touches?.length === 'number') {
        return event.sourceEvent.touches.length;
    }
    return 0;
};

const hasTitleText = <T = any>(config: KChartConfiguration<T>): boolean => Boolean(config.title?.text?.trim());

const hasTopOptionLabels = <T = any>(config: KChartConfiguration<T>): boolean => {
    const hasSpecAreaLabels = Boolean(config.specAreas?.some((area) => area.visible !== false && area.label))
        || Boolean(config.options?.some((option) => option.type === 'spec-area'
            && option.visible !== false
            && option.areas.some((area) => area.visible !== false && area.label)));
    const hasGuideLineLabels = Boolean(config.guideLines?.x?.some((line) => line.visible !== false && line.label))
        || Boolean(config.options?.some((option) => option.type === 'guide-line'
            && option.visible !== false
            && option.x?.some((line) => line.visible !== false && line.label)));

    return hasSpecAreaLabels || hasGuideLineLabels;
};

const resolveEffectiveMargin = <T = any>(
    config: KChartConfiguration<T>,
    size: KChartSize,
    baseMargin: KChartMargin
): KChartMargin => {
    const legend = config.legend;
    const hasTopLegend = legend?.visible !== false && legend?.placement !== 'right' && legend?.placement !== 'bottom' && config.series.length > 0;
    const titleVisible = hasTitleText(config);
    const topOptionLabelsVisible = hasTopOptionLabels(config);

    if (!hasTopLegend && titleVisible) {
        return baseMargin;
    }

    const itemWidth = 148;
    const itemHeight = 22;
    const availableLegendWidth = Math.max(itemWidth, size.width - baseMargin.left - baseMargin.right);
    const legendColumns = Math.max(1, Math.floor(availableLegendWidth / itemWidth));
    const legendRows = hasTopLegend ? Math.ceil(config.series.length / legendColumns) : 0;
    const legendY = titleVisible
        ? topOptionLabelsVisible ? 58 : 54
        : 16;
    const legendHeight = legendRows > 0 ? legendRows * itemHeight : 0;
    const optionLabelLift = topOptionLabelsVisible ? 18 : 0;
    const gap = topOptionLabelsVisible ? 12 : 18;
    const requiredTop = Math.ceil(legendY + legendHeight + optionLabelLift + gap);

    if (!titleVisible || topOptionLabelsVisible) {
        return {
            ...baseMargin,
            top: Math.max(defaultMargin.top, requiredTop)
        };
    }

    return baseMargin;
};

const resolveContainer = (
    selector: string | HTMLElement
): Selection<HTMLElement, unknown, any, any> => {
    const container = typeof selector === 'string'
        ? select<HTMLElement, unknown>(selector)
        : select<HTMLElement, unknown>(selector);

    if (!container.node()) {
        throw new Error('KChart container not found.');
    }

    return container;
};

const resolveSize = <T = any>(
    container: Selection<HTMLElement, unknown, any, any>,
    config: KChartConfiguration<T>,
    margin: KChartMargin
): {size: KChartSize, plotSize: KChartSize, margin: KChartMargin} => {
    const rect = container.node().getBoundingClientRect();
    const size = {
        width: config.width ?? Math.max(rect.width, 320),
        height: config.height ?? Math.max(rect.height, 240)
    };
    const effectiveMargin = resolveEffectiveMargin(config, size, margin);

    return {
        size,
        plotSize: {
            width: Math.max(size.width - effectiveMargin.left - effectiveMargin.right, 0),
            height: Math.max(size.height - effectiveMargin.top - effectiveMargin.bottom, 0)
        },
        margin: effectiveMargin
    };
};

const createLayers = <T = any>(
    container: Selection<HTMLElement, unknown, any, any>,
    config: KChartConfiguration<T>,
    getSize: () => KChartSize,
    getMargin: () => KChartMargin
): KChartLayerContext => {
    container
        .classed('kchart', true)
        .style('position', 'relative');

    if (config.className) {
        container.classed(config.className, true);
    }

    const svg = container.selectAll<SVGSVGElement, unknown>('svg.kchart-svg')
        .data([undefined])
        .join('svg')
        .attr('class', 'kchart-svg')
        .style('position', 'relative')
        .style('z-index', 3)
        .style('pointer-events', 'all');

    const rootGroup = svg.selectAll<SVGGElement, unknown>('g.kchart-root')
        .data([undefined])
        .join('g')
        .attr('class', 'kchart-root');

    const plotGroup = rootGroup.selectAll<SVGGElement, unknown>('g.kchart-plot')
        .data([undefined])
        .join('g')
        .attr('class', 'kchart-plot');

    const seriesGroup = plotGroup.selectAll<SVGGElement, unknown>('g.kchart-series')
        .data([undefined])
        .join('g')
        .attr('class', 'kchart-series');

    const overlayGroup = plotGroup.selectAll<SVGGElement, unknown>('g.kchart-overlay')
        .data([undefined])
        .join('g')
        .attr('class', 'kchart-overlay');

    const getCanvas = (name = 'default') => ensureCanvas(container, name, getSize(), getMargin(), '2d');
    const getWebglCanvas = (name = 'webgl') => ensureCanvas(container, name, getSize(), getMargin(), 'webgl');

    return {
        svg,
        rootGroup,
        plotGroup,
        seriesGroup,
        overlayGroup,
        getCanvas,
        getWebglCanvas
    };
};

const ensureCanvas = (
    container: Selection<HTMLElement, unknown, any, any>,
    name: string,
    size: KChartSize,
    margin: KChartMargin,
    renderer: '2d' | 'webgl'
): HTMLCanvasElement => {
    const className = `kchart-${renderer}-canvas-${name}`;
    const width = Math.max(size.width - margin.left - margin.right, 0);
    const height = Math.max(size.height - margin.top - margin.bottom, 0);
    const canvas = container.selectAll<HTMLCanvasElement, unknown>(`canvas.${className}`)
        .data([undefined])
        .join('canvas')
        .attr('class', className)
        .style('position', 'absolute')
        .style('z-index', 1)
        .style('pointer-events', 'none')
        .style('left', `${margin.left}px`)
        .style('top', `${margin.top}px`)
        .style('width', `${width}px`)
        .style('height', `${height}px`)
        .attr('data-kchart-width', String(width))
        .attr('data-kchart-height', String(height))
        .node();

    if (!isCanvasTransferred(canvas)) {
        canvas.width = width;
        canvas.height = height;
    }

    return canvas;
};

const resolveAxisDomain = <T = any>(
    axis: KChartAxis<T>,
    data: T[]
): any[] => {
    if (axis.domain) {
        return axis.domain;
    }

    if (axis.type === 'string' || axis.type === 'point') {
        return data.map((item: T) => item[axis.field]);
    }

    const domainFields = axis.domainFields?.length ? axis.domainFields : [axis.field];
    const values = data.flatMap((item: T) => domainFields.map((field) => {
        const value = item[field];
        return axis.type === 'time'
            ? new Date(value as any)
            : Number(value);
    })).filter((value) => axis.type === 'time'
        ? value instanceof Date && Number.isFinite(value.getTime())
        : Number.isFinite(value));
    const [minValue, maxValue] = extent(values as any[]);
    const resolvedMin = axis.min ?? minValue ?? 0;
    const resolvedMax = axis.max ?? maxValue ?? 1;
    const canApplyPadding = axis.padding !== undefined && axis.min === undefined && axis.max === undefined;

    if (canApplyPadding && axis.type === 'time') {
        const minTime = resolvedMin instanceof Date ? resolvedMin.getTime() : new Date(resolvedMin as any).getTime();
        const maxTime = resolvedMax instanceof Date ? resolvedMax.getTime() : new Date(resolvedMax as any).getTime();
        const span = Math.max(maxTime - minTime, 24 * 60 * 60 * 1000);
        const padding = span * Math.max(axis.padding ?? 0, 0);

        return [
            new Date(minTime - padding),
            new Date(maxTime + padding)
        ];
    }

    if (canApplyPadding && axis.type === 'number') {
        const minNumber = Number(resolvedMin);
        const maxNumber = Number(resolvedMax);
        const span = Math.max(maxNumber - minNumber, 1);
        const padding = span * Math.max(axis.padding ?? 0, 0);

        return [
            minNumber - padding,
            maxNumber + padding
        ];
    }

    return [
        resolvedMin,
        resolvedMax
    ];
};

const resolveScales = <T = any>(
    data: T[],
    axes: KChartAxis<T>[],
    plotSize: KChartSize
): KChartResolvedScale<T>[] => axes.map((axis: KChartAxis<T>) => {
    const isHorizontal = axis.placement === 'bottom' || axis.placement === 'top';
    const range: [number, number] = isHorizontal ? [0, plotSize.width] : [plotSize.height, 0];
    const domain = resolveAxisDomain(axis, data);
    let scale: any;

    if (axis.type === 'string') {
        scale = scaleBand()
            .domain(domain.map(String))
            .range(range)
            .padding(axis.padding ?? 0.1);
    } else if (axis.type === 'point') {
        scale = scalePoint()
            .domain(domain.map(String))
            .range(range)
            .padding(axis.padding ?? 0.1);
    } else if (axis.type === 'time') {
        scale = scaleTime()
            .domain(domain.map((value: any) => value instanceof Date ? value : new Date(value)) as [Date, Date])
            .range(range);
    } else {
        scale = scaleLinear()
            .domain(domain.map(Number) as [number, number])
            .range(range)
            .nice();
    }

    return {
        ...axis,
        scale
    };
});

const renderAxes = <T = any>(state: KChartState<T>): void => {
    const axisLayer = state.layers.rootGroup.selectAll<SVGGElement, unknown>('g.kchart-axes')
        .data([undefined])
        .join('g')
        .attr('class', 'kchart-axes')
        .attr('transform', `translate(${state.margin.left}, ${state.margin.top})`);

    state.scales.forEach((scale: KChartResolvedScale<T>) => {
        const axisGroup = axisLayer.selectAll<SVGGElement, KChartResolvedScale<T>>(`g.kchart-axis-${scale.placement}`)
            .data(scale.visible === false ? [] : [scale])
            .join('g')
            .attr('class', `kchart-axis kchart-axis-${scale.placement}`);

        const axisFactory = {
            top: axisTop,
            right: axisRight,
            bottom: axisBottom,
            left: axisLeft
        }[scale.placement](scale.scale);

        if (scale.tickCount && typeof axisFactory.ticks === 'function') {
            axisFactory.ticks(scale.tickCount);
        }

        if (scale.tickFormat) {
            axisFactory.tickFormat(scale.tickFormat as any);
        }

        axisGroup
            .attr('transform', resolveAxisTransform(scale.placement, state.plotSize))
            .call(axisFactory as any);

        renderAxisTitle(axisGroup, scale, state.plotSize);
    });
};

const renderAxisTitle = <T = any>(
    axisGroup: Selection<SVGGElement, KChartResolvedScale<T>, any, any>,
    scale: KChartResolvedScale<T>,
    plotSize: KChartSize
): void => {
    const title = axisGroup.selectAll<SVGTextElement, KChartResolvedScale<T>>('text.kchart-axis-title')
        .data(scale.title ? [scale] : [])
        .join('text')
        .attr('class', 'kchart-axis-title')
        .style('fill', '#9fb1bf')
        .style('font-size', '12px')
        .style('font-weight', 600)
        .style('text-anchor', 'middle')
        .text(scale.title ?? '');

    if (scale.placement === 'bottom') {
        title.attr('x', plotSize.width / 2).attr('y', 34).attr('transform', null);
    } else if (scale.placement === 'top') {
        title.attr('x', plotSize.width / 2).attr('y', -24).attr('transform', null);
    } else if (scale.placement === 'left') {
        title.attr('x', -plotSize.height / 2).attr('y', -36).attr('transform', 'rotate(-90)');
    } else {
        title.attr('x', plotSize.height / 2).attr('y', -36).attr('transform', 'rotate(90)');
    }
};

const resolveAxisTransform = (
    placement: KChartPlacement,
    plotSize: KChartSize
): string => {
    if (placement === 'bottom') {
        return `translate(0, ${plotSize.height})`;
    }

    if (placement === 'right') {
        return `translate(${plotSize.width}, 0)`;
    }

    return 'translate(0, 0)';
};

const resolveDownsampleValue = (value: any, scale?: KChartResolvedScale<any>): number => {
    if (value instanceof Date) {
        return value.getTime();
    }

    if (scale?.type === 'time' && typeof value === 'string') {
        return new Date(value).getTime();
    }

    return Number(value);
};

const resolveDownsampleAccessor = <T = any>(
    field: keyof T & string | undefined,
    scale: KChartResolvedScale<T> | undefined
): ((point: T) => number) | undefined => {
    if (!field) {
        return undefined;
    }

    return (point: T) => resolveDownsampleValue(point[field], scale);
};

const resolveDownsampleThreshold = <T = any>(
    downsample: boolean | KChartDownsampleConfiguration<T>,
    context: KChartDownsampleContext<T>
): number => {
    if (typeof downsample === 'boolean') {
        return Math.max(3, Math.floor(context.plotSize.width));
    }

    if (typeof downsample.threshold === 'function') {
        return downsample.threshold(context);
    }

    return downsample.threshold ?? Math.max(3, Math.floor(context.plotSize.width));
};

const resolveSeriesRenderData = <T = any>(
    state: KChartState<T>,
    series: KChartSeries<T>,
    xScale?: KChartResolvedScale<T>,
    yScale?: KChartResolvedScale<T>
): T[] => {
    const downsample = series.downsample;

    if (!downsample || (typeof downsample !== 'boolean' && downsample.enabled === false)) {
        return state.data;
    }

    const xAccessor = typeof downsample === 'boolean'
        ? resolveDownsampleAccessor(series.xField, xScale)
        : downsample.xAccessor ?? resolveDownsampleAccessor(series.xField, xScale);
    const yAccessor = typeof downsample === 'boolean'
        ? resolveDownsampleAccessor(series.yField, yScale)
        : downsample.yAccessor ?? resolveDownsampleAccessor(series.yField, yScale);

    if (!xAccessor || !yAccessor) {
        return state.data;
    }

    const context: KChartDownsampleContext<T> = {
        data: state.data,
        plotSize: state.plotSize,
        series,
        xField: series.xField,
        yField: series.yField
    };
    const threshold = resolveDownsampleThreshold(downsample, context);

    return downsampleLTTB(state.data, threshold, xAccessor, yAccessor);
};

const renderTitle = <T = any>(state: KChartState<T>): void => {
    const title = state.config.title;
    const hasTitle = Boolean(title?.text?.trim());
    const titleY = Math.max(Math.min(state.margin.top - 42, 28), 20);
    const titleGroup = state.layers.rootGroup.selectAll<SVGTextElement, unknown>('text.kchart-title')
        .data(hasTitle ? [undefined] : [])
        .join('text')
        .attr('class', 'kchart-title')
        .attr('y', titleY)
        .style('fill', title?.color ?? '#edf3f8')
        .style('font-size', `${title?.fontSize ?? 14}px`)
        .style('font-weight', title?.fontWeight ?? 700)
        .text(title?.text ?? '');

    if (!title || !hasTitle) {
        return;
    }

    if (title.align === 'left') {
        titleGroup.attr('x', state.margin.left).style('text-anchor', 'start');
    } else if (title.align === 'right') {
        titleGroup.attr('x', state.size.width - state.margin.right).style('text-anchor', 'end');
    } else {
        titleGroup.attr('x', state.size.width / 2).style('text-anchor', 'middle');
    }
};

const renderGrid = <T = any>(state: KChartState<T>): void => {
    const grid = state.config.grid;
    const isVisible = grid?.visible !== false;
    const gridGroup = state.layers.plotGroup.selectAll<SVGGElement, unknown>('g.kchart-grid')
        .data(isVisible ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-grid');

    if (!isVisible) {
        return;
    }

    const xScale = state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'bottom' || scale.placement === 'top');
    const yScale = state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'left' || scale.placement === 'right');
    const color = grid?.color ?? 'rgba(188, 206, 218, 0.18)';

    const styleLine = (selection: Selection<SVGLineElement, any, any, any>) => selection
        .style('stroke', color)
        .style('stroke-width', 1)
        .style('stroke-dasharray', grid?.dasharray ?? '2 6')
        .style('shape-rendering', 'crispEdges');

    if (grid?.x !== false && xScale && typeof xScale.scale.ticks === 'function') {
        gridGroup.selectAll<SVGLineElement, any>('line.kchart-grid-x')
            .data(xScale.scale.ticks())
            .join('line')
            .attr('class', 'kchart-grid-x')
            .attr('x1', (value: any) => resolveScalePosition(xScale, value))
            .attr('x2', (value: any) => resolveScalePosition(xScale, value))
            .attr('y1', 0)
            .attr('y2', state.plotSize.height)
            .call(styleLine);
    } else {
        gridGroup.selectAll('line.kchart-grid-x').remove();
    }

    if (grid?.y !== false && yScale && typeof yScale.scale.ticks === 'function') {
        gridGroup.selectAll<SVGLineElement, any>('line.kchart-grid-y')
            .data(yScale.scale.ticks())
            .join('line')
            .attr('class', 'kchart-grid-y')
            .attr('x1', 0)
            .attr('x2', state.plotSize.width)
            .attr('y1', (value: any) => resolveScalePosition(yScale, value))
            .attr('y2', (value: any) => resolveScalePosition(yScale, value))
            .call(styleLine);
    } else {
        gridGroup.selectAll('line.kchart-grid-y').remove();
    }
};

const renderLegend = <T = any>(state: KChartState<T>): void => {
    const legend = state.config.legend;
    const isVisible = legend?.visible !== false && state.series.length > 0;
    const legendGroup = state.layers.rootGroup.selectAll<SVGGElement, unknown>('g.kchart-legend')
        .data(isVisible ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-legend');

    if (!isVisible) {
        return;
    }

    const itemGap = legend?.itemGap ?? 14;
    const itemWidth = 148;
    const itemHeight = 22;
    const availableLegendWidth = Math.max(itemWidth, state.size.width - state.margin.left - state.margin.right);
    const legendColumns = Math.max(1, Math.floor(availableLegendWidth / itemWidth));
    const items = state.series.map((series: KChartSeries<T>, index: number) => ({
        selector: series.selector,
        name: series.displayName ?? series.selector,
        color: series.color ?? state.colors[index % state.colors.length],
        hidden: state.hiddenSeries.has(series.selector)
    }));
    const selectable = legend?.selectable !== false;

    const item = legendGroup.selectAll<SVGGElement, typeof items[number]>('g.kchart-legend-item')
        .data(items)
        .join('g')
        .attr('class', 'kchart-legend-item')
        .style('cursor', selectable ? 'pointer' : 'default')
        .style('opacity', (itemData) => itemData.hidden ? 0.48 : 1)
        .attr('transform', (_item, index: number) => {
            if (legend?.placement === 'right') {
                return `translate(0, ${index * 20})`;
            }
            return `translate(${(index % legendColumns) * itemWidth}, ${Math.floor(index / legendColumns) * itemHeight})`;
        })
        .on('click', (_event, itemData) => {
            if (!selectable) {
                return;
            }

            if (state.hiddenSeries.has(itemData.selector)) {
                state.hiddenSeries.delete(itemData.selector);
            } else {
                state.hiddenSeries.add(itemData.selector);
            }
            render(state);
        });

    item.selectAll<SVGRectElement, typeof items[number]>('rect.kchart-legend-check')
        .data((itemData) => [itemData])
        .join('rect')
        .attr('class', 'kchart-legend-check')
        .attr('x', -6)
        .attr('y', -8)
        .attr('width', 14)
        .attr('height', 14)
        .attr('rx', 3)
        .style('fill', (itemData) => itemData.hidden ? 'transparent' : itemData.color)
        .style('stroke', '#f8fbff')
        .style('stroke-width', 1.4);

    item.selectAll<SVGPathElement, typeof items[number]>('path.kchart-legend-checkmark')
        .data((itemData) => [itemData])
        .join('path')
        .attr('class', 'kchart-legend-checkmark')
        .attr('d', 'M -2 -1 L 0 3 L 5 -5')
        .style('fill', 'none')
        .style('stroke', '#ffffff')
        .style('stroke-width', 1.6)
        .style('stroke-linecap', 'round')
        .style('stroke-linejoin', 'round')
        .style('opacity', (itemData) => itemData.hidden ? 0 : 1);

    item.selectAll<SVGTextElement, typeof items[number]>('text')
        .data((itemData) => [itemData])
        .join('text')
        .attr('x', 16)
        .attr('y', 4)
        .style('fill', '#b6c4cf')
        .style('font-size', '12px')
        .style('text-decoration', (itemData) => itemData.hidden ? 'line-through' : 'none')
        .text((itemData) => itemData.name);

    if (legend?.placement === 'right') {
        legendGroup.attr('transform', `translate(${state.size.width - state.margin.right + itemGap}, ${state.margin.top})`);
    } else if (legend?.placement === 'bottom') {
        legendGroup.attr('transform', `translate(${state.margin.left}, ${state.size.height - 10})`);
    } else {
        const hasSpecAreas = resolveSpecAreas(state).length > 0;
        const hasTitle = Boolean(state.config.title?.text?.trim());
        const legendY = hasSpecAreas
            ? (hasTitle ? Math.max(Math.min(state.margin.top - 38, 58), 44) : 20)
            : hasTitle
                ? Math.max(Math.min(state.margin.top - 30, 64), 54)
                : 16;
        legendGroup.attr('transform', `translate(${state.margin.left}, ${legendY})`);
    }
};

const getTooltipElement = <T = any>(state: KChartState<T>): Selection<HTMLDivElement, unknown, any, any> => state.container
    .selectAll<HTMLDivElement, unknown>('div.kchart-tooltip')
    .data([undefined])
    .join('div')
    .attr('class', 'kchart-tooltip')
    .style('position', 'absolute')
    .style('z-index', 6)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('padding', '8px 10px')
    .style('border', '1px solid rgba(233, 242, 247, 0.18)')
    .style('border-radius', '8px')
    .style('background', 'rgba(10, 14, 20, 0.95)')
    .style('box-shadow', '0 14px 30px rgba(0, 0, 0, 0.32)')
    .style('color', '#edf3f8')
    .style('font-size', '12px')
    .style('line-height', '1.45');

const formatTooltip = <T = any>(
    state: KChartState<T>,
    data: T,
    series: KChartSeries<T>,
    color: string
): string => {
    if (state.config.tooltip?.formatter) {
        return state.config.tooltip.formatter({
            data,
            series,
            x: series.xField ? data[series.xField] : undefined,
            y: series.yField ? data[series.yField] : undefined,
            color
        });
    }

    const label = series.displayName ?? series.selector;
    const xValue = series.xField ? data[series.xField] : '';
    const yValue = series.yField ? data[series.yField] : '';

    return `<strong style="color:${color}">${label}</strong><br/>x: ${xValue}<br/>y: ${yValue}`;
};

const resolveZoomedAxes = <T = any>(
    state: KChartState<T>,
    transform: ZoomTransform
): KChartZoomContext<T> => {
    const direction = state.config.zoom?.direction ?? 'x';
    const baseScales = resolveScales(state.data, state.baseAxes, state.plotSize);
    let xDomain: Array<number | Date> | undefined;
    let yDomain: Array<number | Date> | undefined;

    const axes = state.baseAxes.map((axis): KChartAxis<T> => {
        const horizontal = isHorizontalAxis(axis);
        const shouldZoom = isZoomScaleSupported(axis)
            && ((horizontal && (direction === 'x' || direction === 'xy'))
                || (!horizontal && (direction === 'y' || direction === 'xy')));

        if (!shouldZoom) {
            return {
                ...axis,
                domain: cloneAxisDomain(axis.domain)
            };
        }

        const scale = baseScales.find((item) => item.field === axis.field && item.placement === axis.placement);
        if (!scale) {
            return {
                ...axis,
                domain: cloneAxisDomain(axis.domain)
            };
        }

        const zoomedScale = horizontal
            ? transform.rescaleX(scale.scale)
            : transform.rescaleY(scale.scale);
        const domain = zoomedScale.domain().map((value: any) => axis.type === 'time'
            ? value instanceof Date ? value : new Date(value)
            : Number(value)) as Array<number | Date>;

        if (horizontal) {
            xDomain = domain;
        } else {
            yDomain = domain;
        }

        return {
            ...axis,
            domain
        };
    });

    return {
        axes,
        xDomain,
        yDomain,
        transform
    };
};

const resetZoom = <T = any>(state: KChartState<T>): void => {
    state.zoomTransform = zoomIdentity;
    state.axes = cloneAxes(state.initialAxes);
    state.baseAxes = cloneAxes(state.initialAxes);
    state.config = {
        ...state.config,
        axes: state.axes
    };
    state.config.zoom?.onZoom?.({
        axes: state.axes,
        transform: state.zoomTransform
    });
    render(state);
};

const drawZoomSelection = <T = any>(state: KChartState<T>): void => {
    const selection = state.zoomSelection;
    const rect = state.layers.overlayGroup.selectAll<SVGRectElement, unknown>('rect.kchart-zoom-selection')
        .data(selection?.active ? [undefined] : [])
        .join('rect')
        .attr('class', 'kchart-zoom-selection')
        .style('fill', 'rgba(93, 184, 255, 0.16)')
        .style('stroke', 'rgba(148, 214, 255, 0.9)')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '4 4')
        .style('pointer-events', 'none');

    if (!selection?.active) {
        return;
    }

    rect
        .attr('x', Math.min(selection.startX, selection.currentX))
        .attr('y', Math.min(selection.startY, selection.currentY))
        .attr('width', Math.abs(selection.currentX - selection.startX))
        .attr('height', Math.abs(selection.currentY - selection.startY));
};

const resolveSelectionZoomAxes = <T = any>(
    state: KChartState<T>,
    selection: NonNullable<KChartState<T>['zoomSelection']>
): KChartZoomContext<T> | null => {
    const direction = state.config.zoom?.direction ?? 'x';
    const minX = Math.max(0, Math.min(selection.startX, selection.currentX));
    const maxX = Math.min(state.plotSize.width, Math.max(selection.startX, selection.currentX));
    const minY = Math.max(0, Math.min(selection.startY, selection.currentY));
    const maxY = Math.min(state.plotSize.height, Math.max(selection.startY, selection.currentY));
    const width = maxX - minX;
    const height = maxY - minY;
    const shouldZoomX = direction === 'x' || direction === 'xy';
    const shouldZoomY = direction === 'y' || direction === 'xy';

    if ((shouldZoomX && width < 8) || (shouldZoomY && height < 8)) {
        return null;
    }

    let xDomain: Array<number | Date> | undefined;
    let yDomain: Array<number | Date> | undefined;

    const axes = state.axes.map((axis): KChartAxis<T> => {
        const horizontal = isHorizontalAxis(axis);
        const shouldZoom = isZoomScaleSupported(axis)
            && ((horizontal && shouldZoomX) || (!horizontal && shouldZoomY));
        if (!shouldZoom) {
            return {
                ...axis,
                domain: cloneAxisDomain(axis.domain)
            };
        }

        const scale = state.scales.find((item) => item.field === axis.field && item.placement === axis.placement);
        if (!scale || typeof scale.scale.invert !== 'function') {
            return {
                ...axis,
                domain: cloneAxisDomain(axis.domain)
            };
        }

        const rawDomain = horizontal
            ? [scale.scale.invert(minX), scale.scale.invert(maxX)]
            : [scale.scale.invert(maxY), scale.scale.invert(minY)];
        const domain = rawDomain.map((value: any) => axis.type === 'time'
            ? value instanceof Date ? value : new Date(value)
            : Number(value)) as Array<number | Date>;

        if (horizontal) {
            xDomain = domain;
        } else {
            yDomain = domain;
        }

        return {
            ...axis,
            domain
        };
    });

    return {
        axes,
        xDomain,
        yDomain,
        transform: zoomIdentity
    };
};

const applySelectionZoom = <T = any>(state: KChartState<T>): void => {
    const selection = state.zoomSelection;
    if (!selection?.active) {
        return;
    }

    const nextZoom = resolveSelectionZoomAxes(state, selection);
    state.zoomSelection = undefined;
    drawZoomSelection(state);

    if (!nextZoom) {
        return;
    }

    state.zoomTransform = zoomIdentity;
    state.axes = nextZoom.axes;
    state.baseAxes = cloneAxes(nextZoom.axes);
    state.config = {
        ...state.config,
        axes: state.axes
    };
    state.config.zoom?.onZoom?.(nextZoom);
    render(state);
};

const renderZoom = <T = any>(state: KChartState<T>): void => {
    const overlay = state.layers.overlayGroup.select<SVGRectElement>('rect.kchart-tooltip-overlay');
    const overlayNode = overlay.node();
    if (!overlayNode) {
        return;
    }

    const mode = state.config.zoom?.mode ?? 'wheel';
    const zoomConfig = state.config.zoom;
    const inputOptionsConfigured = hasZoomInputOptions(zoomConfig);
    const selectionEnabled = isZoomEnabled(state) && (mode === 'select' || mode === 'both');
    const wheelEnabled = isZoomEnabled(state)
        && (mode === 'wheel' || mode === 'both')
        && isZoomOptionEnabled(zoomConfig?.wheelZoom, true);
    const panEnabled = isZoomEnabled(state) && mode === 'wheel';
    const desktopPanEnabled = panEnabled && isZoomOptionEnabled(zoomConfig?.wheelZoom, true);
    const gestureEnabled = isZoomEnabled(state)
        && isZoomOptionEnabled(zoomConfig?.gestureZoom, !inputOptionsConfigured && panEnabled);

    overlay
        .style('cursor', selectionEnabled ? 'crosshair' : isZoomEnabled(state) ? 'grab' : null)
        .on('dblclick.kchart-zoom-reset', null)
        .on('mousedown.kchart-select-zoom', null)
        .on('mousemove.kchart-select-zoom', null)
        .on('mouseup.kchart-select-zoom', null)
        .on('mouseleave.kchart-select-zoom', null);

    if (!isZoomEnabled(state)) {
        overlay.on('.zoom', null);
        state.layers.overlayGroup.selectAll('rect.kchart-zoom-selection').remove();
        return;
    }

    if (wheelEnabled || desktopPanEnabled || gestureEnabled) {
        const wheelSensitivity = getZoomWheelSensitivity(zoomConfig);
        const zoomBehavior = zoom<SVGRectElement, unknown>()
            .scaleExtent(zoomConfig?.scaleExtent ?? [1, 40])
            .extent([[0, 0], [state.plotSize.width, state.plotSize.height]])
            .translateExtent([[0, 0], [state.plotSize.width, state.plotSize.height]])
            .touchable(() => gestureEnabled)
            .wheelDelta((event: WheelEvent) => -event.deltaY
                * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002)
                * (event.ctrlKey ? 10 : 1)
                * wheelSensitivity)
            .filter((event: any) => {
                if (event.type === 'wheel') {
                    return wheelEnabled && (!inputOptionsConfigured
                        || matchesZoomInputDevice(getZoomWheelDevice(zoomConfig), event));
                }
                if (event.type === 'mousedown') {
                    return desktopPanEnabled && (!inputOptionsConfigured
                        || matchesZoomInputDevice(getZoomWheelDevice(zoomConfig), event));
                }
                if (event.type === 'touchstart' || event.type === 'touchmove') {
                    const touchCount = getEventTouchCount(event);
                    return gestureEnabled
                        && touchCount >= getZoomGestureMinTouches(zoomConfig)
                        && (!inputOptionsConfigured
                            || matchesZoomInputDevice(getZoomGestureDevice(zoomConfig), event));
                }
                return false;
            })
            .on('zoom', (event: D3ZoomEvent<SVGRectElement, unknown>) => {
                state.zoomTransform = event.transform;
                const nextZoom = resolveZoomedAxes(state, event.transform);
                state.axes = nextZoom.axes;
                state.config = {
                    ...state.config,
                    axes: state.axes
                };
                zoomConfig?.onZoom?.(nextZoom);
                render(state);
            });

        overlay.call(zoomBehavior as any);
        (overlayNode as any).__zoom = state.zoomTransform;
    } else {
        overlay.on('.zoom', null);
    }

    if (selectionEnabled) {
        overlay
            .on('mousedown.kchart-select-zoom', (event: MouseEvent) => {
                if (event.button !== 0) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();
                const [mouseX, mouseY] = pointer(event, overlayNode);
                state.zoomSelection = {
                    active: true,
                    startX: mouseX,
                    startY: mouseY,
                    currentX: mouseX,
                    currentY: mouseY
                };
                drawZoomSelection(state);
            })
            .on('mousemove.kchart-select-zoom', (event: MouseEvent) => {
                if (!state.zoomSelection?.active) {
                    return;
                }
                const [mouseX, mouseY] = pointer(event, overlayNode);
                state.zoomSelection.currentX = mouseX;
                state.zoomSelection.currentY = mouseY;
                drawZoomSelection(state);
            })
            .on('mouseup.kchart-select-zoom', (event: MouseEvent) => {
                if (!state.zoomSelection?.active) {
                    return;
                }
                const [mouseX, mouseY] = pointer(event, overlayNode);
                state.zoomSelection.currentX = mouseX;
                state.zoomSelection.currentY = mouseY;
                applySelectionZoom(state);
            })
            .on('mouseleave.kchart-select-zoom', () => {
                if (!state.zoomSelection?.active) {
                    return;
                }
                state.zoomSelection = undefined;
                drawZoomSelection(state);
            });
    }

    if (zoomConfig?.resetOnDoubleClick !== false) {
        overlay.on('dblclick.kchart-zoom-reset', () => resetZoom(state));
    }
};

const renderTooltip = <T = any>(state: KChartState<T>): void => {
    const tooltipEnabled = state.config.tooltip?.visible === true;
    const tooltipNoteConfiguration = resolveTooltipNoteConfiguration(state);
    const cursorGuide = resolveCursorGuide(state);
    const guideEnabled = cursorGuide?.visible === true;
    const enabled = tooltipEnabled || guideEnabled || isZoomEnabled(state);
    const overlay = state.layers.overlayGroup.selectAll<SVGRectElement, unknown>('rect.kchart-tooltip-overlay')
        .data(enabled ? [undefined] : [])
        .join('rect')
        .attr('class', 'kchart-tooltip-overlay')
        .attr('width', state.plotSize.width)
        .attr('height', state.plotSize.height)
        .style('fill', 'transparent')
        .style('pointer-events', 'all');

    const guideLine = state.layers.overlayGroup.selectAll<SVGLineElement, unknown>('line.kchart-guide-line')
        .data(guideEnabled ? [undefined] : [])
        .join('line')
        .attr('class', 'kchart-guide-line')
        .attr('y1', 0)
        .attr('y2', state.plotSize.height)
        .style('stroke', cursorGuide?.color ?? 'rgba(248, 251, 255, 0.72)')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '3 5')
        .style('opacity', 0)
        .style('pointer-events', 'none');

    const guideMarkerGroup = state.layers.overlayGroup.selectAll<SVGGElement, unknown>('g.kchart-guide-markers')
        .data(guideEnabled ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-guide-markers')
        .style('opacity', 0)
        .style('pointer-events', 'none');

    const guideAxisLabel = state.layers.overlayGroup.selectAll<SVGGElement, unknown>('g.kchart-guide-axis-label')
        .data(guideEnabled ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-guide-axis-label')
        .style('opacity', 0)
        .style('pointer-events', 'none');

    const tooltip = getTooltipElement(state);
    renderTooltipNotes(state);
    tooltip
        .style(
            'pointer-events',
            tooltipNoteConfiguration?.enabled ? 'auto' : 'none'
        );
    if (!enabled) {
        tooltip.style('opacity', 0);
        return;
    }

    let activeTooltipCandidate: {
        data: T;
        series: KChartSeries<T>;
        color: string;
        x: number;
        y: number;
        html: string;
    } | undefined;
    const hideHoverTooltip = (): void => {
        activeTooltipCandidate = undefined;
        tooltip.style('opacity', 0);
    };

    overlay
        .on('mousemove', (event: MouseEvent) => {
            const target = overlay.node();
            if (!target) {
                return;
            }

            const [mouseX, mouseY] = pointer(event, target);
            let nearest: {
                data: T;
                series: KChartSeries<T>;
                color: string;
                distance: number;
                x: number;
                y: number;
                html?: string;
            } | null = null;
            const guideMarkers: Array<{
                x: number;
                y: number;
                color: string;
                label: string;
                value: any;
                xValue: any;
            }> = [];

            state.series.forEach((series: KChartSeries<T>, index: number) => {
                if (state.hiddenSeries.has(series.selector)) {
                    return;
                }
                const color = series.color ?? state.colors[index % state.colors.length];
                const customTooltip = series.tooltip?.({
                    ...state.layers,
                    data: state.data,
                    scales: state.scales,
                    size: state.size,
                    plotSize: state.plotSize,
                    margin: state.margin,
                    color,
                    seriesIndex: index,
                    mouseX,
                    mouseY
                });
                if (customTooltip) {
                    const distance = customTooltip.distance ?? Math.hypot(mouseX - customTooltip.x, mouseY - customTooltip.y);
                    if (!nearest || distance < nearest.distance) {
                        nearest = {
                            data: customTooltip.data,
                            series,
                            color: customTooltip.color ?? color,
                            distance,
                            x: customTooltip.x,
                            y: customTooltip.y,
                            html: customTooltip.html
                        };
                    }
                }
                if (series.tooltip) {
                    return;
                }
                if (!series.xField || !series.yField) {
                    return;
                }

                const xScale = state.scales.find((scale: KChartResolvedScale<T>) => scale.field === series.xField);
                const yScale = state.scales.find((scale: KChartResolvedScale<T>) => scale.field === series.yField)
                    ?? state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'left' || scale.placement === 'right');
                if (!xScale || !yScale) {
                    return;
                }

                state.data.forEach((datum: T) => {
                    const x = resolveScalePosition(xScale, datum[series.xField]);
                    const y = resolveScalePosition(yScale, datum[series.yField]);
                    const distance = Math.hypot(mouseX - x, mouseY - y);
                    const guideDistance = Math.abs(mouseX - x);
                    if (!nearest || distance < nearest.distance) {
                        nearest = {
                            data: datum,
                            series,
                            color,
                            distance,
                            x,
                            y
                        };
                    }

                    if (guideEnabled) {
                        const label = series.displayName ?? series.selector;
                        const currentMarker = guideMarkers.find((marker) => marker.label === label);
                        if (!currentMarker || guideDistance < Math.abs(mouseX - currentMarker.x)) {
                            if (currentMarker) {
                                currentMarker.x = x;
                                currentMarker.y = y;
                                currentMarker.value = datum[series.yField];
                                currentMarker.xValue = datum[series.xField];
                            } else {
                                guideMarkers.push({
                                    x,
                                    y,
                                    color,
                                    label,
                                    value: datum[series.yField],
                                    xValue: datum[series.xField]
                                });
                            }
                        }
                    }
                });
            });

            if (guideEnabled && guideMarkers.length) {
                const guideX = guideMarkers[0].x;
                const arrangedGuideMarkers = guideMarkers
                    .slice()
                    .sort((a, b) => a.y - b.y)
                    .map((item, index, sorted) => {
                        const previous = index > 0 ? sorted[index - 1] as typeof item & { labelY?: number } : undefined;
                        const labelY = Math.max(item.y, previous?.labelY !== undefined ? previous.labelY + 20 : item.y);
                        return {
                            ...item,
                            labelY: Math.min(labelY, state.plotSize.height - 12)
                        };
                    });
                guideLine
                    .attr('x1', guideX)
                    .attr('x2', guideX)
                    .style('opacity', 1);

                const xFormat = cursorGuide?.xFormat;
                const xLabel = xFormat
                    ? xFormat(guideMarkers[0].xValue)
                    : String(guideMarkers[0].xValue);
                const xLabelWidth = Math.max(44, xLabel.length * 7 + 16);

                guideAxisLabel
                    .attr('transform', `translate(${guideX}, ${state.plotSize.height + 18})`)
                    .style('opacity', 1);

                guideAxisLabel.selectAll<SVGRectElement, string>('rect')
                    .data([xLabel])
                    .join('rect')
                    .attr('x', -xLabelWidth / 2)
                    .attr('y', -12)
                    .attr('width', xLabelWidth)
                    .attr('height', 18)
                    .attr('rx', 5)
                    .style('fill', 'rgba(10, 14, 20, 0.9)')
                    .style('stroke', 'rgba(248, 251, 255, 0.24)')
                    .style('stroke-width', 1);

                guideAxisLabel.selectAll<SVGTextElement, string>('text')
                    .data([xLabel])
                    .join('text')
                    .attr('x', 0)
                    .attr('y', 1)
                    .style('fill', '#edf3f8')
                    .style('font-size', '11px')
                    .style('font-weight', 700)
                    .style('text-anchor', 'middle')
                    .text((item) => item);

                const marker = guideMarkerGroup.selectAll<SVGGElement, typeof arrangedGuideMarkers[number]>('g.kchart-guide-marker')
                    .data(arrangedGuideMarkers)
                    .join('g')
                    .attr('class', 'kchart-guide-marker')
                    .attr('transform', (item) => `translate(${item.x}, ${item.y})`);

                marker.selectAll<SVGCircleElement, typeof arrangedGuideMarkers[number]>('circle')
                    .data((item) => [item])
                    .join('circle')
                    .attr('r', cursorGuide?.markerRadius ?? 4)
                    .style('fill', (item) => item.color)
                    .style('stroke', '#ffffff')
                    .style('stroke-width', 1.5);

                marker.selectAll<SVGRectElement, typeof arrangedGuideMarkers[number]>('rect')
                    .data((item) => [item])
                    .join('rect')
                    .attr('x', 8)
                    .attr('y', (item) => item.labelY - item.y - 10)
                    .attr('width', (item) => {
                        const valueFormat = cursorGuide?.valueFormat;
                        const value = valueFormat ? valueFormat(item.value) : Number(item.value).toFixed(1);
                        return Math.max(54, `${item.label}: ${value}`.length * 6.3 + 12);
                    })
                    .attr('height', 18)
                    .attr('rx', 5)
                    .style('fill', 'rgba(10, 14, 20, 0.86)')
                    .style('stroke', (item) => item.color)
                    .style('stroke-width', 1);

                marker.selectAll<SVGTextElement, typeof arrangedGuideMarkers[number]>('text')
                    .data((item) => [item])
                    .join('text')
                    .attr('x', 14)
                    .attr('y', (item) => item.labelY - item.y + 4)
                    .style('fill', '#edf3f8')
                    .style('font-size', '11px')
                    .style('font-weight', 700)
                    .text((item) => {
                        const valueFormat = cursorGuide?.valueFormat;
                        const value = valueFormat ? valueFormat(item.value) : Number(item.value).toFixed(1);
                        return `${item.label}: ${value}`;
                    });

                guideMarkerGroup.style('opacity', 1);
            } else {
                guideLine.style('opacity', 0);
                guideMarkerGroup.style('opacity', 0);
                guideAxisLabel.style('opacity', 0);
            }

            if (!tooltipEnabled) {
                hideHoverTooltip();
                return;
            }

            if (!nearest || nearest.distance > 36) {
                hideHoverTooltip();
                return;
            }

            const tooltipHtml = nearest.html ??
                formatTooltip(
                    state,
                    nearest.data,
                    nearest.series,
                    nearest.color
                );
            activeTooltipCandidate = {
                data: nearest.data,
                series: nearest.series,
                color: nearest.color,
                x: nearest.x,
                y: nearest.y,
                html: tooltipHtml
            };

            const tooltipContent = tooltip
                .selectAll<HTMLDivElement, string>(
                    'div.kchart-tooltip-content'
                )
                .data([tooltipHtml])
                .join('div')
                .attr('class', 'kchart-tooltip-content')
                .html((html) => html);
            tooltipContent.style(
                'padding-right',
                tooltipNoteConfiguration?.enabled ? '36px' : null
            );

            const pinButton = tooltip
                .selectAll<HTMLButtonElement, unknown>(
                    'button.kchart-tooltip-pin'
                )
                .data(tooltipNoteConfiguration?.enabled ? [undefined] : [])
                .join('button')
                .attr('class', 'kchart-tooltip-pin')
                .attr('type', 'button')
                .attr('aria-label', 'Pin tooltip as note')
                .attr('title', 'Pin tooltip as note')
                .text(tooltipNoteConfiguration?.pinButtonLabel ?? 'Pin')
                .style('position', 'absolute')
                .style('top', '6px')
                .style('right', '6px')
                .style('height', '24px')
                .style('padding', '0 7px')
                .style('border', '1px solid rgba(248, 251, 255, 0.28)')
                .style('border-radius', '5px')
                .style('background', 'rgba(255, 255, 255, 0.08)')
                .style('color', '#f8fbff')
                .style('font-size', '10px')
                .style('font-weight', 700)
                .style('cursor', 'pointer');
            pinButton.on('click', (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                if (activeTooltipCandidate) {
                    pinTooltipNote(state, activeTooltipCandidate);
                    hideHoverTooltip();
                }
            });

            tooltip
                .style('left', `${state.margin.left + nearest.x + 12}px`)
                .style('top', `${state.margin.top + nearest.y + 12}px`)
                .style('opacity', 1);
        })
        .on('mouseleave', (event: MouseEvent) => {
            const tooltipNode = tooltip.node();
            if (
                event.relatedTarget instanceof Node &&
                tooltipNode?.contains(event.relatedTarget)
            ) {
                return;
            }
            state.series.forEach((series: KChartSeries<T>) => {
                if (!state.hiddenSeries.has(series.selector)) {
                    series.clearTooltip?.(state.layers);
                }
            });
            hideHoverTooltip();
            guideLine.style('opacity', 0);
            guideMarkerGroup.style('opacity', 0);
            guideAxisLabel.style('opacity', 0);
        });

    tooltip.on('mouseleave.kchart-tooltip-note', (event: MouseEvent) => {
        const overlayNode = overlay.node();
        if (
            event.relatedTarget instanceof Node &&
            overlayNode?.contains(event.relatedTarget)
        ) {
            return;
        }
        hideHoverTooltip();
    });
};

const renderSeries = <T = any>(
    state: KChartState<T>,
    animation: KChartAnimationContext = defaultAnimationContext
): void => {
    state.layers.svg
        .attr('width', state.size.width)
        .attr('height', state.size.height);

    state.layers.plotGroup.attr('transform', `translate(${state.margin.left}, ${state.margin.top})`);
    state.layers.seriesGroup.selectAll('*').remove();

    state.series.forEach((series: KChartSeries<T>, index: number) => {
        if (state.hiddenSeries.has(series.selector)) {
            series.destroy?.(state.layers);
            return;
        }

        const xScale = series.xField
            ? state.scales.find((scale: KChartResolvedScale<T>) => scale.field === series.xField)
            : state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'bottom' || scale.placement === 'top');
        const yScale = series.yField
            ? state.scales.find((scale: KChartResolvedScale<T>) => scale.field === series.yField)
                ?? state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'left' || scale.placement === 'right')
            : state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'left' || scale.placement === 'right');

        const seriesGroup = state.layers.seriesGroup.selectAll<SVGGElement, KChartSeries<T>>(`g.${series.selector}-group`)
            .data([series])
            .join('g')
            .attr('class', `${series.selector}-group`);
        const renderData = resolveSeriesRenderData(state, series, xScale, yScale);

        series.render({
            ...state.layers,
            group: seriesGroup,
            seriesGroup,
            data: renderData,
            scales: state.scales,
            xScale,
            yScale,
            size: state.size,
            plotSize: state.plotSize,
            margin: state.margin,
            color: series.color ?? state.colors[index % state.colors.length],
            seriesIndex: index,
            animation
        });
    });
};

const renderSeriesWithAnimation = <T = any>(state: KChartState<T>): void => {
    const animation = resolveAnimationConfiguration(state.config);
    const canAnimate = animation.enabled
        && animation.mode !== 'update'
        && animation.duration > 0
        && typeof globalThis.requestAnimationFrame === 'function'
        && !(animation.respectReducedMotion && shouldReduceMotion());

    cancelSeriesAnimation(state);

    if (!canAnimate) {
        renderSeries(state, defaultAnimationContext);
        return;
    }

    const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const renderId = state.animationRenderId;

    const tick = (now: number): void => {
        if (state.animationRenderId !== renderId) {
            return;
        }

        const elapsed = Math.max(0, now - startedAt);
        const rawProgress = Math.min(elapsed / animation.duration, 1);
        const context: KChartAnimationContext = {
            enabled: true,
            progress: applyAnimationEasing(rawProgress, animation.easing),
            elapsed,
            duration: animation.duration,
            easing: animation.easing,
            mode: animation.mode,
            phase: 'enter'
        };

        renderSeries(state, context);

        if (rawProgress < 1) {
            state.animationFrame = globalThis.requestAnimationFrame(tick);
        } else {
            state.animationFrame = undefined;
        }
    };

    tick(startedAt);
};

const render = <T = any>(state: KChartState<T>): void => {
    const baseMargin: KChartMargin = {
        ...defaultMargin,
        ...state.config.margin
    };
    const sizes = resolveSize(state.container, state.config, baseMargin);
    state.size = sizes.size;
    state.margin = sizes.margin;
    state.plotSize = sizes.plotSize;
    state.scales = resolveScales(state.data, state.axes, state.plotSize);
    renderTitle(state);
    renderAxes(state);
    renderGrid(state);
    renderSpecAreas(state);
    renderGuideLines(state);
    renderSeriesWithAnimation(state);
    renderLegend(state);
    renderTooltip(state);
    renderZoom(state);
};

export const createKChart = <T = any>(
    config: KChartConfiguration<T>
): KChartController<T> => {
    const container = resolveContainer(config.selector);
    const baseMargin: KChartMargin = {
        ...defaultMargin,
        ...config.margin
    };
    const sizes = resolveSize(container, config, baseMargin);
    const state: KChartState<T> = {
        config,
        container,
        data: config.data,
        axes: cloneAxes(config.axes),
        initialAxes: cloneAxes(config.axes),
        baseAxes: cloneAxes(config.axes),
        series: config.series,
        size: sizes.size,
        plotSize: sizes.plotSize,
        margin: sizes.margin,
        colors: config.colors ?? schemeCategory10.slice(),
        scales: [],
        layers: undefined as any,
        hiddenSeries: new Set<string>(),
        zoomTransform: zoomIdentity,
        animationRenderId: 0
    };
    state.layers = createLayers(container, config, () => state.size, () => state.margin);

    const controller: KChartController<T> = {
        render() {
            render(state);
            return controller;
        },
        updateData(data: T[]) {
            state.data = data;
            state.config = {
                ...state.config,
                data
            };
            return controller.render();
        },
        updateAxes(axes: KChartAxis<T>[]) {
            state.axes = cloneAxes(axes);
            state.initialAxes = cloneAxes(axes);
            state.baseAxes = cloneAxes(axes);
            state.zoomTransform = zoomIdentity;
            state.config = {
                ...state.config,
                axes: state.axes
            };
            return controller.render();
        },
        updateSeries(series: KChartSeries<T>[]) {
            state.series = series;
            return controller.render();
        },
        resize(size: Partial<KChartSize> = {}) {
            const nextConfig = {
                ...state.config,
                ...size
            };
            const nextBaseMargin: KChartMargin = {
                ...defaultMargin,
                ...nextConfig.margin
            };
            const nextSizes = resolveSize(state.container, nextConfig, nextBaseMargin);
            state.config = nextConfig;
            state.margin = nextSizes.margin;
            state.size = nextSizes.size;
            state.plotSize = nextSizes.plotSize;
            return controller.render();
        },
        destroy() {
            cancelSeriesAnimation(state);
            state.series.forEach((series: KChartSeries<T>) => {
                if (series.destroy) {
                    series.destroy(state.layers);
                }
            });
            state.container.selectAll('.kchart-svg').remove();
            state.container.selectAll('canvas[class^="kchart-"]').remove();
            destroyTooltipNotes(state);
        },
        getState() {
            return state;
        }
    };

    return controller;
};
