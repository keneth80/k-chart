import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { scaleBand, scaleLinear, scalePoint, scaleTime } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { BaseType, pointer, select, Selection } from 'd3-selection';
import { D3ZoomEvent, zoom, zoomIdentity, ZoomTransform } from 'd3-zoom';
import {resolveCursorGuide} from '../options/cursor-line';
import {renderGuideLines} from '../options/guide-line';
import {renderSpecAreas, resolveSpecAreas} from '../options/spec-area';
import {
    destroyRangeNavigator,
    RANGE_NAVIGATOR_MINIMUM_AXIS_FOOTER,
    renderRangeNavigator,
    reconcileRangeNavigatorRange,
    resolveRangeNavigatorAxis,
    resolveRangeNavigatorConfiguration,
    resolveRangeNavigatorDataDomain,
    resolveRangeNavigatorLayout
} from '../options/range-navigator';
import {
    destroyTooltipNotes,
    pinTooltipNote,
    renderTooltipNotes,
    resolveTooltipNoteConfiguration
} from '../options/tooltip-note';
import {isCanvasTransferred} from '../series/support/canvas';
import {resolveScalePosition} from '../series/support/scale';
import {resolveSeriesRenderData} from '../internal/downsample';
import {resolveAxisDomain} from './domain';
import {applyAxisTickCount} from './ticks';
import {
    activateLegendFromKeyboard,
    resolveChartAccessibility,
    resolveChartStatus,
    resolveChartTheme,
    resolveContainerSize,
    resolveLegendLayout,
    resolveResponsiveTickCount,
    resolveTooltipPosition,
    truncateLegendLabel
} from './usability';
import {interpolateResolvedScales} from './animation';
import {
    resolveAxisTitleAttributes,
    resolveAxisTitleMargins,
    resolveHorizontalAxisTitleTopSpace
} from './axis-title';

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
    KChartRangeNavigatorRange,
    KChartConfiguration,
    KChartState,
    KChartController,
    KChartRenderCompleteEvent,
    KChartRenderCompletionState
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

const animationCancellation = new WeakMap<object, () => void>();
const destroyedCharts = new WeakSet<object>();
const containerOwners = new WeakMap<HTMLElement, () => void>();
const chartIds = new WeakMap<object, string>();
const seriesCanvasUsage = new WeakMap<object, Map<object, Set<HTMLCanvasElement>>>();
let chartIdSequence = 0;
const getChartId = (state: object): string => {
    let id = chartIds.get(state);
    if (!id) {
        id = `kchart-${++chartIdSequence}`;
        chartIds.set(state, id);
    }
    return id;
};

const validateSeriesSelectors = <T = any>(series: KChartSeries<T>[]): void => {
    // Core treats selectors as opaque labels. Built-in canvas series cleanup
    // still requires a CSS-safe canvasName when the selector is not CSS-safe.
    const selectors = new Set<string>();
    series.forEach((item) => {
        if (selectors.has(item.selector)) {
            throw new Error(`Duplicate KChart series selector: ${item.selector}`);
        }
        selectors.add(item.selector);
    });
};

type ZoomFrameRequester = (callback: (timestamp: number) => void) => number;
type ZoomFrameCanceller = (frame: number) => void;

export const createZoomRenderScheduler = (
    renderLatest: () => void,
    requestFrame: ZoomFrameRequester | undefined = typeof globalThis.requestAnimationFrame === 'function'
        ? (callback) => globalThis.requestAnimationFrame(callback)
        : undefined,
    cancelFrame: ZoomFrameCanceller | undefined = typeof globalThis.cancelAnimationFrame === 'function'
        ? (frame) => globalThis.cancelAnimationFrame(frame)
        : undefined
) => {
    let scheduledFrame: number | undefined;
    let renderPending = false;
    let destroyed = false;

    const cancel = (): void => {
        if (scheduledFrame !== undefined) {
            cancelFrame?.(scheduledFrame);
        }
        scheduledFrame = undefined;
        renderPending = false;
    };

    const flush = (): void => {
        if (destroyed || !renderPending) {
            return;
        }
        if (scheduledFrame !== undefined) {
            cancelFrame?.(scheduledFrame);
        }
        scheduledFrame = undefined;
        renderPending = false;
        renderLatest();
    };

    return {
        start(): void {
            // Keep a frame queued by a gesture that ended just before this one
            // began. The callback reads current state, so the same frame can
            // safely paint the newest transform without dropping either input.
        },
        schedule(): void {
            if (destroyed) {
                return;
            }
            renderPending = true;
            if (scheduledFrame !== undefined) {
                return;
            }
            if (!requestFrame) {
                flush();
                return;
            }
            // Zoom input can outpace painting, so retain only the latest state per frame.
            scheduledFrame = requestFrame(() => {
                scheduledFrame = undefined;
                flush();
            });
        },
        end(): void {
            flush();
        },
        cancel,
        destroy(): void {
            cancel();
            destroyed = true;
        }
    };
};

type ZoomRenderScheduler = ReturnType<typeof createZoomRenderScheduler>;

const zoomRenderSchedulers = new WeakMap<object, ZoomRenderScheduler>();

const getZoomRenderScheduler = <T = any>(state: KChartState<T>): ZoomRenderScheduler => {
    let scheduler = zoomRenderSchedulers.get(state);
    if (!scheduler) {
        scheduler = createZoomRenderScheduler(() => render(state));
        zoomRenderSchedulers.set(state, scheduler);
    }
    return scheduler;
};

const now = (): number => typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const createResolvedRenderCompletion = (
    renderId = 0
): KChartRenderCompletionState => {
    const timestamp = now();
    const event: KChartRenderCompleteEvent = {
        renderId,
        asyncTasks: 0,
        duration: 0,
        timestamp
    };

    return {
        renderId,
        startedAt: timestamp,
        asyncTasks: 0,
        tasks: [],
        promise: Promise.resolve(event),
        resolve: () => undefined
    };
};

const beginRenderCompletion = <T = any>(
    state: KChartState<T>
): KChartRenderCompletionState => {
    const renderId = state.renderCompletion.renderId + 1;
    let resolveCompletion: (event: KChartRenderCompleteEvent) => void = () => undefined;
    const completion: KChartRenderCompletionState = {
        renderId,
        startedAt: now(),
        asyncTasks: 0,
        tasks: [],
        promise: new Promise<KChartRenderCompleteEvent>((resolve) => {
            resolveCompletion = resolve;
        }),
        resolve: resolveCompletion
    };

    state.renderCompletion = completion;
    return completion;
};

const registerRenderTask = <T = any>(
    state: KChartState<T>,
    task: Promise<void>
): void => {
    // Series can choose SVG, Canvas, WebGL, or worker-backed rendering.
    // The core only tracks "something async is still painting" and stays
    // decoupled from the renderer implementation.
    const completion = state.renderCompletion;
    completion.asyncTasks += 1;
    completion.tasks.push(task.catch(() => undefined));
};

const finishRenderCompletion = <T = any>(
    state: KChartState<T>,
    completion: KChartRenderCompletionState
): void => {
    Promise.all(completion.tasks).then(() => {
        const timestamp = now();
        const event: KChartRenderCompleteEvent = {
            renderId: completion.renderId,
            asyncTasks: completion.asyncTasks,
            duration: timestamp - completion.startedAt,
            timestamp
        };
        completion.resolve(event);
        if (state.renderCompletion === completion) {
            state.config.onRenderComplete?.(event);
        }
    });
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
    animationCancellation.get(state)?.();
    animationCancellation.delete(state);
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
    const resolvedAxisMargin = resolveAxisTitleMargins(config.axes, baseMargin);
    const rangeNavigator = resolveRangeNavigatorConfiguration(config);
    const hasRangeNavigator = Boolean(rangeNavigator)
        && rangeNavigator?.visible !== false
        && Boolean(resolveRangeNavigatorAxis(config.axes, rangeNavigator?.xField));
    let axisMargin = hasRangeNavigator
        ? {
            ...resolvedAxisMargin,
            bottom: Math.max(
                resolvedAxisMargin.bottom,
                RANGE_NAVIGATOR_MINIMUM_AXIS_FOOTER
            )
                + resolveRangeNavigatorLayout(rangeNavigator).reservedSpace
        }
        : resolvedAxisMargin;
    const horizontalAxisTitleTopSpace = resolveHorizontalAxisTitleTopSpace(config.axes);
    const legend = config.legend;
    const hasTopLegend = legend?.visible !== false && legend?.placement !== 'right' && legend?.placement !== 'bottom' && config.series.length > 0;
    const titleVisible = hasTitleText(config);
    const topOptionLabelsVisible = hasTopOptionLabels(config);

    if (legend?.placement === 'right' && legend.visible !== false && config.series.length > 0) {
        axisMargin = {...axisMargin, right: Math.max(axisMargin.right, Math.min(180, size.width * 0.4))};
    }

    const legendLayout = resolveLegendLayout(
        size.width - axisMargin.left - axisMargin.right,
        legend?.visible === false ? 0 : config.series.length,
        legend?.placement
    );
    if (legend?.placement === 'bottom' && legendLayout.rows > 0) {
        axisMargin = {...axisMargin, bottom: axisMargin.bottom + legendLayout.height + 12};
    }

    if (!hasTopLegend && titleVisible) {
        if (horizontalAxisTitleTopSpace === 0) {
            return axisMargin;
        }
        const chartTitleFontSize = typeof config.title?.fontSize === 'number'
            ? config.title.fontSize
            : 14;
        const chartTitleRowBottom = 28 + chartTitleFontSize + 8;
        return {
            ...axisMargin,
            top: Math.max(
                axisMargin.top,
                chartTitleRowBottom + horizontalAxisTitleTopSpace
            )
        };
    }

    const legendRows = hasTopLegend ? legendLayout.rows : 0;
    const legendY = titleVisible
        ? topOptionLabelsVisible ? 58 : 54
        : 16;
    const legendHeight = legendRows > 0 ? legendLayout.height : 0;
    const optionLabelLift = topOptionLabelsVisible ? 18 : 0;
    const gap = topOptionLabelsVisible ? 12 : 18;
    const requiredTop = Math.ceil(
        legendY
        + legendHeight
        + optionLabelLift
        + gap
        + horizontalAxisTitleTopSpace
    );

    if (!titleVisible || topOptionLabelsVisible) {
        return {
            ...axisMargin,
            top: Math.max(axisMargin.top, requiredTop)
        };
    }

    return hasTopLegend ? {...axisMargin, top: Math.max(axisMargin.top, requiredTop)} : axisMargin;
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

const measureContainerContentSize = (node: HTMLElement): KChartSize => {
    const rect = node.getBoundingClientRect();
    const style = node.ownerDocument.defaultView?.getComputedStyle?.(node);
    const pixels = (name: string): number => parseFloat(style?.getPropertyValue(name)) || 0;
    return {
        width: Math.max(0, rect.width - pixels('padding-left') - pixels('padding-right')
            - pixels('border-left-width') - pixels('border-right-width')),
        height: Math.max(0, rect.height - pixels('padding-top') - pixels('padding-bottom')
            - pixels('border-top-width') - pixels('border-bottom-width'))
    };
};

const hasDefiniteContainerHeight = (node: HTMLElement): boolean => {
    const typedHeight = (node as any).computedStyleMap?.().get('height')?.toString();
    const height = typedHeight ?? node.style.getPropertyValue('height');
    return Boolean(height && !['auto', 'min-content', 'max-content', 'fit-content'].includes(height));
};

const resolveSize = <T = any>(
    container: Selection<HTMLElement, unknown, any, any>,
    config: KChartConfiguration<T>,
    margin: KChartMargin,
    previousSize?: KChartSize
): {size: KChartSize, plotSize: KChartSize, margin: KChartMargin} => {
    const node = container.node();
    const size = resolveContainerSize(measureContainerContentSize(node), config);
    if (previousSize && config.height === undefined && config.autoResize !== false && !hasDefiniteContainerHeight(node)) {
        size.height = previousSize.height;
    }
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
    getMargin: () => KChartMargin,
    canvases: Set<HTMLCanvasElement>
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
        .style('display', 'block')
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

    const getCanvas = (name = 'default') => {
        const canvas = ensureCanvas(container, name, getSize(), getMargin(), '2d');
        canvases.add(canvas);
        return canvas;
    };
    const getWebglCanvas = (name = 'webgl') => {
        const canvas = ensureCanvas(container, name, getSize(), getMargin(), 'webgl');
        canvases.add(canvas);
        return canvas;
    };

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
    const pixelWidth = Math.round(width);
    const pixelHeight = Math.round(height);
    const canvas = container.selectAll<HTMLCanvasElement, unknown>('canvas')
        .filter(function () {
            return this.getAttribute('data-kchart-canvas-key') === className
                || (!this.getAttribute('data-kchart-canvas-key') && this.getAttribute('class') === className);
        })
        .data([undefined])
        .join('canvas')
        .attr('data-kchart-canvas-key', className)
        .each(function () {
            if (!this.getAttribute('class')) {
                this.setAttribute('class', className);
            }
        })
        .style('position', 'absolute')
        .style('z-index', 1)
        .style('pointer-events', 'none')
        .style('left', `${margin.left}px`)
        .style('top', `${margin.top}px`)
        .style('width', `${width}px`)
        .style('height', `${height}px`)
        .attr('data-kchart-width', String(pixelWidth))
        .attr('data-kchart-height', String(pixelHeight))
        .node();

    if (!isCanvasTransferred(canvas) && canvas.width !== pixelWidth) {
        canvas.width = pixelWidth;
    }
    if (!isCanvasTransferred(canvas) && canvas.height !== pixelHeight) {
        canvas.height = pixelHeight;
    }

    return canvas;
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
    const theme = resolveChartTheme(state.config.theme);
    const axisLayer = state.layers.rootGroup.selectAll<SVGGElement, unknown>('g.kchart-axes')
        .data([undefined])
        .join('g')
        .attr('class', 'kchart-axes')
        .attr('transform', `translate(${state.margin.left}, ${state.margin.top})`);

    const hasTopAxis = state.scales.some((scale) => scale.visible !== false && scale.placement === 'top');
    const hasTopAxisTitle = state.scales.some((scale) =>
        scale.visible !== false && scale.placement === 'top' && Boolean(scale.title)
    );

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

        applyAxisTickCount(axisFactory, {...scale, tickCount: resolveResponsiveTickCount(scale, state.plotSize)});

        if (scale.tickFormat) {
            axisFactory.tickFormat(scale.tickFormat as any);
        }

        axisGroup
            .attr('transform', resolveAxisTransform(scale.placement, state.plotSize))
            .call(axisFactory as any);

        axisGroup.selectAll('text').style('fill', theme.muted);
        axisGroup.selectAll('line').style('stroke', theme.grid);
        axisGroup.selectAll('path.domain').style('stroke', theme.grid);
        renderAxisTitle(axisGroup, scale, state.plotSize, hasTopAxis, hasTopAxisTitle, theme.muted);
    });
};

const renderAxisTitle = <T = any>(
    axisGroup: Selection<SVGGElement, KChartResolvedScale<T>, any, any>,
    scale: KChartResolvedScale<T>,
    plotSize: KChartSize,
    hasTopAxis: boolean,
    hasTopAxisTitle: boolean,
    color: string
): void => {
    const attributes = resolveAxisTitleAttributes(scale, plotSize, {
        hasTopAxis,
        hasTopAxisTitle
    });
    const title = axisGroup.selectAll<SVGTextElement, KChartResolvedScale<T>>('text.kchart-axis-title')
        .data(scale.title ? [scale] : [])
        .join('text')
        .attr('class', 'kchart-axis-title')
        .style('fill', color)
        .style('font-size', '12px')
        .style('font-weight', 600)
        .style('text-anchor', attributes.textAnchor)
        .text(scale.title ?? '');

    title
        .attr('x', attributes.x)
        .attr('y', attributes.y)
        .attr('transform', attributes.transform);
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

const renderTitle = <T = any>(state: KChartState<T>): void => {
    const title = state.config.title;
    const hasTitle = Boolean(title?.text?.trim());
    const titleY = Math.max(Math.min(state.margin.top - 42, 28), 20);
    const titleGroup = state.layers.rootGroup.selectAll<SVGTextElement, unknown>('text.kchart-title')
        .data(hasTitle ? [undefined] : [])
        .join('text')
        .attr('class', 'kchart-title')
        .attr('y', titleY)
        .style('fill', title?.color ?? resolveChartTheme(state.config.theme).text)
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
    const color = grid?.color ?? resolveChartTheme(state.config.theme).grid;

    const styleLine = (selection: Selection<SVGLineElement, any, any, any>) => selection
        .style('stroke', color)
        .style('stroke-width', 1)
        .style('stroke-dasharray', grid?.dasharray ?? '2 6')
        .style('shape-rendering', 'crispEdges');

    if (grid?.x !== false && xScale && typeof xScale.scale.ticks === 'function') {
        gridGroup.selectAll<SVGLineElement, any>('line.kchart-grid-x')
            .data(xScale.scale.ticks(resolveResponsiveTickCount(xScale, state.plotSize) || undefined))
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
            .data(yScale.scale.ticks(resolveResponsiveTickCount(yScale, state.plotSize) || undefined))
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
    const layout = resolveLegendLayout(
        legend?.placement === 'right' ? state.margin.right - itemGap - 8
            : state.size.width - state.margin.left - state.margin.right,
        state.series.length,
        legend?.placement
    );
    const theme = resolveChartTheme(state.config.theme);
    const items = state.series.map((series: KChartSeries<T>, index: number) => ({
        selector: series.selector,
        name: series.displayName ?? series.selector,
        color: series.color ?? state.colors[index % state.colors.length],
        hidden: state.hiddenSeries.has(series.selector)
    }));
    const selectable = legend?.selectable !== false;
    const toggleItem = (itemData: typeof items[number]): void => {
        if (!selectable) {
            return;
        }
        if (state.hiddenSeries.has(itemData.selector)) {
            state.hiddenSeries.delete(itemData.selector);
        } else {
            state.hiddenSeries.add(itemData.selector);
        }
        render(state);
    };

    const item = legendGroup.selectAll<SVGGElement, typeof items[number]>('g.kchart-legend-item')
        .data(items)
        .join('g')
        .attr('class', 'kchart-legend-item')
        .attr('role', selectable ? 'button' : null)
        .attr('tabindex', selectable ? 0 : null)
        .attr('aria-label', (itemData) => itemData.name)
        .attr('aria-pressed', (itemData) => selectable ? String(!itemData.hidden) : null)
        .style('cursor', selectable ? 'pointer' : 'default')
        .style('opacity', (itemData) => itemData.hidden ? 0.48 : 1)
        .attr('transform', (_item, index: number) => {
            if (legend?.placement === 'right') {
                return `translate(0, ${index * layout.itemHeight})`;
            }
            return `translate(${(index % layout.columns) * layout.itemWidth}, ${Math.floor(index / layout.columns) * layout.itemHeight})`;
        })
        .on('click', (_event, itemData) => toggleItem(itemData))
        .on('keydown', (event: KeyboardEvent, itemData) => {
            activateLegendFromKeyboard(event, () => toggleItem(itemData), selectable);
        });

    item.selectAll<SVGTitleElement, typeof items[number]>('title')
        .data((itemData) => [itemData])
        .join('title')
        .text((itemData) => itemData.name);

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
        .style('stroke', theme.text)
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
        .style('fill', theme.muted)
        .style('font-size', '12px')
        .style('text-decoration', (itemData) => itemData.hidden ? 'line-through' : 'none')
        .text((itemData) => itemData.name)
        .each(function (itemData) {
            const node = this;
            const measure = typeof node.getComputedTextLength === 'function'
                ? (value: string): number => {
                    node.textContent = value;
                    return node.getComputedTextLength();
                }
                : undefined;
            node.textContent = truncateLegendLabel(itemData.name, layout.textWidth, measure);
        });

    if (legend?.placement === 'right') {
        legendGroup.attr('transform', `translate(${state.size.width - state.margin.right + itemGap}, ${state.margin.top})`);
    } else if (legend?.placement === 'bottom') {
        legendGroup.attr('transform', `translate(${state.margin.left}, ${state.size.height - layout.height + 8})`);
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
    .attr('id', `${getChartId(state)}-tooltip`)
    .attr('role', 'tooltip')
    .attr('aria-hidden', 'true')
    .style('position', 'absolute')
    .style('z-index', 6)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .style('visibility', 'hidden')
    .style('box-sizing', 'border-box')
    .style('max-width', `${Math.max(0, state.size.width - 16)}px`)
    .style('max-height', `${Math.max(0, state.size.height - 16)}px`)
    .style('overflow', 'auto')
    .style('overflow-wrap', 'anywhere')
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
    zoomRenderSchedulers.get(state)?.cancel();
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
    zoomRenderSchedulers.get(state)?.cancel();
    render(state);
};

const renderZoom = <T = any>(state: KChartState<T>): void => {
    const overlay = state.layers.overlayGroup.select<SVGRectElement>('rect.kchart-tooltip-overlay');
    const overlayNode = overlay.node();
    const seriesHandlesPointerEvents = state.series.some((series) => (
        !state.hiddenSeries.has(series.selector) && series.pointerEvents === 'series'
    ));
    const eventTarget = (seriesHandlesPointerEvents
        ? state.layers.seriesGroup
        : overlay) as unknown as Selection<any, unknown, any, unknown>;
    const eventTargetNode = eventTarget.node();
    if (!overlayNode || !eventTargetNode) {
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
    state.layers.seriesGroup
        .style('cursor', seriesHandlesPointerEvents
            ? selectionEnabled ? 'crosshair' : isZoomEnabled(state) ? 'grab' : null
            : null)
        .on('dblclick.kchart-zoom-reset', null)
        .on('mousedown.kchart-select-zoom', null)
        .on('mousemove.kchart-select-zoom', null)
        .on('mouseup.kchart-select-zoom', null)
        .on('mouseleave.kchart-select-zoom', null);
    overlay.on('.zoom', null);
    state.layers.seriesGroup.on('.zoom', null);

    if (!isZoomEnabled(state)) {
        state.layers.overlayGroup.selectAll('rect.kchart-zoom-selection').remove();
        return;
    }

    if (wheelEnabled || desktopPanEnabled || gestureEnabled) {
        const wheelSensitivity = getZoomWheelSensitivity(zoomConfig);
        const zoomBehavior = zoom<any, unknown>()
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
            .on('start', () => {
                getZoomRenderScheduler(state).start();
            })
            .on('zoom', (event: D3ZoomEvent<any, unknown>) => {
                state.zoomTransform = event.transform;
                const nextZoom = resolveZoomedAxes(state, event.transform);
                state.axes = nextZoom.axes;
                state.config = {
                    ...state.config,
                    axes: state.axes
                };
                zoomConfig?.onZoom?.(nextZoom);
                getZoomRenderScheduler(state).schedule();
            })
            .on('end', () => {
                zoomRenderSchedulers.get(state)?.end();
            });

        eventTarget.call(zoomBehavior as any);
        (eventTargetNode as any).__zoom = state.zoomTransform;
    } else {
        eventTarget.on('.zoom', null);
    }

    if (selectionEnabled) {
        eventTarget
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
        eventTarget.on('dblclick.kchart-zoom-reset', () => resetZoom(state));
    }
};

const renderTooltip = <T = any>(state: KChartState<T>): void => {
    const tooltipEnabled = state.config.tooltip?.visible === true;
    const tooltipNoteConfiguration = resolveTooltipNoteConfiguration(state);
    const cursorGuide = resolveCursorGuide(state);
    const guideEnabled = cursorGuide?.visible === true;
    const enabled = tooltipEnabled || guideEnabled || isZoomEnabled(state);
    const seriesHandlesPointerEvents = state.series.some((series) => (
        !state.hiddenSeries.has(series.selector) && series.pointerEvents === 'series'
    ));
    const overlay = state.layers.overlayGroup.selectAll<SVGRectElement, unknown>('rect.kchart-tooltip-overlay')
        .data(enabled ? [undefined] : [])
        .join('rect')
        .attr('class', 'kchart-tooltip-overlay')
        .attr('width', state.plotSize.width)
        .attr('height', state.plotSize.height)
        .style('fill', 'transparent')
        .style('pointer-events', seriesHandlesPointerEvents ? 'none' : 'all');
    state.layers.seriesGroup.selectAll<SVGRectElement, unknown>('rect.kchart-series-event-surface')
        .data(enabled && seriesHandlesPointerEvents ? [undefined] : [])
        .join('rect')
        .attr('class', 'kchart-series-event-surface')
        .attr('width', state.plotSize.width)
        .attr('height', state.plotSize.height)
        .style('fill', 'transparent')
        .style('pointer-events', 'all')
        .lower();
    const tooltipEventTarget = (seriesHandlesPointerEvents
        ? state.layers.seriesGroup
        : overlay) as unknown as Selection<BaseType, unknown, BaseType, unknown>;
    const tooltipEventNode = tooltipEventTarget.node();

    // Relationship series bind hover/click directly to their nodes and links.
    // Listen on the parent group in that mode so events still bubble into the
    // core tooltip without a transparent rectangle blocking the series.
    [overlay, state.layers.seriesGroup].forEach((target) => {
        const selection = target as Selection<BaseType, unknown, any, any>;
        selection.on('.kchart-tooltip', null).attr('tabindex', null).attr('role', null)
            .attr('aria-label', null).attr('aria-describedby', null);
    });

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
        tooltip.style('opacity', 0).style('visibility', 'hidden').attr('aria-hidden', 'true');
        tooltipEventTarget.attr('aria-describedby', null);
    };

    const showTooltipAt = (mouseX: number, mouseY: number, keyboardDatum?: {data: T; series: KChartSeries<T>}): void => {
            if (destroyedCharts.has(state)) {
                return;
            }
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
                if (state.hiddenSeries.has(series.selector) || (keyboardDatum && series !== keyboardDatum.series)) {
                    return;
                }
                const color = series.color ?? state.colors[index % state.colors.length];
                if (keyboardDatum) {
                    nearest = {data: keyboardDatum.data, series, color, distance: 0, x: mouseX, y: mouseY};
                    return;
                }
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

            const tooltipRect = tooltip.node().getBoundingClientRect();
            const overflowing = tooltip.node().scrollHeight > tooltip.node().clientHeight
                || tooltip.node().scrollWidth > tooltip.node().clientWidth;
            tooltip.style('pointer-events', overflowing || tooltipNoteConfiguration?.enabled ? 'auto' : 'none')
                .attr('tabindex', overflowing ? 0 : null)
                .attr('role', overflowing || tooltipNoteConfiguration?.enabled ? 'group' : 'tooltip')
                .attr('aria-label', overflowing || tooltipNoteConfiguration?.enabled ? 'Data details' : null);
            const position = resolveTooltipPosition(
                {x: state.margin.left + nearest.x, y: state.margin.top + nearest.y},
                tooltipRect,
                state.size
            );
            tooltip
                .style('left', `${position.left}px`)
                .style('top', `${position.top}px`)
                .style('visibility', 'visible')
                .style('opacity', 1)
                .attr('aria-hidden', 'false')
                .attr('aria-live', keyboardDatum ? 'polite' : 'off');
            tooltipEventTarget.attr('aria-describedby', `${getChartId(state)}-tooltip`);
    };

    const showPointerTooltip = (event: MouseEvent | PointerEvent): void => {
        const target = overlay.node();
        if (target) {
            const [x, y] = pointer(event, target);
            showTooltipAt(x, y);
        }
    };
    const keyboardSeries = state.series.find((item) => !state.hiddenSeries.has(item.selector) && item.xField && item.yField);
    let keyboardIndex = 0;
    const showKeyboardTooltip = (startIndex = keyboardIndex, direction = 1): void => {
        const xScale = keyboardSeries && state.scales.find((scale) => scale.field === keyboardSeries.xField);
        const yScale = keyboardSeries && state.scales.find((scale) => scale.field === keyboardSeries.yField);
        if (!xScale || !yScale) {
            return;
        }
        const start = Math.max(0, Math.min(startIndex, state.data.length - 1));
        // Resolve only the requested raw index, skipping invalid/offscreen points lazily.
        for (let index = start; index >= 0 && index < state.data.length; index += direction) {
            const datum = state.data[index];
            if (!datum) {
                continue;
            }
            const x = resolveScalePosition(xScale, datum[keyboardSeries.xField]);
            const y = resolveScalePosition(yScale, datum[keyboardSeries.yField]);
            if (Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= state.plotSize.width
                && y >= 0 && y <= state.plotSize.height) {
                keyboardIndex = index;
                showTooltipAt(x, y, {data: datum, series: keyboardSeries});
                return;
            }
        }
    };
    const pointerEvents = typeof PointerEvent !== 'undefined';
    let pointerFocus = false;
    tooltipEventTarget
        .attr('tabindex', tooltipEnabled && state.data.length > 0 && keyboardSeries ? 0 : null)
        .attr('role', tooltipEnabled ? 'group' : null)
        .attr('aria-label', tooltipEnabled ? 'Chart data' : null)
        .on(`${pointerEvents ? 'pointermove' : 'mousemove'}.kchart-tooltip`, showPointerTooltip)
        .on(`${pointerEvents ? 'pointerdown' : 'mousedown'}.kchart-tooltip`, (event: PointerEvent) => {
            pointerFocus = true;
            if (event.pointerType !== 'mouse') {
                showPointerTooltip(event);
            }
        })
        .on(`${pointerEvents ? 'pointerup' : 'mouseup'}.kchart-tooltip`, () => { pointerFocus = false; })
        .on('pointercancel.kchart-tooltip', hideHoverTooltip)
        .on('focus.kchart-tooltip', () => {
            if (!pointerFocus) {
                showKeyboardTooltip();
            }
            pointerFocus = false;
        })
        .on('keydown.kchart-tooltip', (event: KeyboardEvent) => {
            if (!tooltipEnabled || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey
                || event.isComposing || (event.target && event.target !== tooltipEventNode)) {
                return;
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                hideHoverTooltip();
            } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
                event.preventDefault();
                const count = state.data.length;
                const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? count - 1
                    : keyboardIndex + (event.key === 'ArrowLeft' ? -1 : 1);
                showKeyboardTooltip(nextIndex, event.key === 'ArrowLeft' || event.key === 'End' ? -1 : 1);
            }
        })
        .on('blur.kchart-tooltip', (event: FocusEvent) => {
            if (!(typeof Node !== 'undefined' && event.relatedTarget instanceof Node
                && tooltip.node()?.contains(event.relatedTarget))) {
                hideHoverTooltip();
            }
        })
        .on(`${pointerEvents ? 'pointerleave' : 'mouseleave'}.kchart-tooltip`, (event: PointerEvent) => {
            if (event.pointerType === 'touch') {
                return;
            }
            const tooltipNode = tooltip.node();
            if (
                typeof Node !== 'undefined' && event.relatedTarget instanceof Node &&
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
        if (
            typeof Node !== 'undefined' && event.relatedTarget instanceof Node &&
            (tooltipEventNode as Node | null)?.contains(event.relatedTarget)
        ) {
            return;
        }
        hideHoverTooltip();
    });
    tooltip.on('keydown.kchart-tooltip', (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            (tooltipEventTarget.node() as HTMLElement)?.focus?.();
            hideHoverTooltip();
        }
    });
};

const renderChartAccessibility = <T = any>(state: KChartState<T>): void => {
    const accessibility = resolveChartAccessibility(state.config.accessibility, state.config.title?.text);
    const descriptionId = `${getChartId(state)}-description`;
    state.layers.svg
        .attr('role', 'group')
        .attr('aria-label', accessibility.label)
        .attr('aria-describedby', accessibility.description ? descriptionId : null)
        .attr('aria-busy', state.config.status?.state === 'loading' ? 'true' : null)
        .style('color', resolveChartTheme(state.config.theme).text);
    state.layers.svg.selectAll<SVGDescElement, string>('desc.kchart-description')
        .data(accessibility.description ? [accessibility.description] : [])
        .join('desc')
        .attr('class', 'kchart-description')
        .attr('id', descriptionId)
        .text((description) => description);
    const status = resolveChartStatus(state.config.status);
    state.layers.rootGroup.selectAll<SVGTextElement, typeof status>('text.kchart-status')
        .data(status ? [status] : [])
        .join('text')
        .attr('class', 'kchart-status')
        .attr('role', status?.role ?? null)
        .attr('aria-live', status?.state === 'error' ? 'assertive' : 'polite')
        .attr('x', state.margin.left + state.plotSize.width / 2)
        .attr('y', state.margin.top + state.plotSize.height / 2)
        .attr('text-anchor', 'middle')
        .style('fill', resolveChartTheme(state.config.theme).text)
        .style('font-size', '13px')
        .style('pointer-events', 'none')
        .text(status?.message ?? '');
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

    // Axis/legend/tooltip stay in the core, while each series owns only its
    // drawing strategy. This is the main extension point that lets KChart mix
    // SVG, Canvas, WebGL, and custom visualizations in one chart.
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

        // The layer was cleared above; selector names are labels, not CSS queries.
        const seriesGroup = state.layers.seriesGroup.append<SVGGElement>('g')
            .datum(series)
            .attr('class', `${series.selector}-group`);
        const renderData = resolveSeriesRenderData(state.data, state.plotSize, series, xScale, yScale);
        const usage = seriesCanvasUsage.get(state);
        let ownedCanvases = usage.get(series);
        if (!ownedCanvases) {
            ownedCanvases = new Set<HTMLCanvasElement>();
            usage.set(series, ownedCanvases);
        }
        const trackCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
            ownedCanvases.add(canvas);
            return canvas;
        };

        series.render({
            ...state.layers,
            getCanvas: (name) => trackCanvas(state.layers.getCanvas(name)),
            getWebglCanvas: (name) => trackCanvas(state.layers.getWebglCanvas(name)),
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
            animation,
            registerAsyncRenderTask: (task: Promise<void>) => registerRenderTask(state, task)
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

const toRangeNavigatorRange = (
    domain: Array<string | number | Date>
): KChartRangeNavigatorRange | undefined => {
    if (domain.length < 2) {
        return undefined;
    }
    const first = domain[0];
    const last = domain[domain.length - 1];
    if ((typeof first !== 'number' && !(first instanceof Date))
        || (typeof last !== 'number' && !(last instanceof Date))) {
        return undefined;
    }
    return [first, last];
};

const renderRangeNavigatorForState = <T = any>(state: KChartState<T>): void => {
    const configuration = resolveRangeNavigatorConfiguration(state.config);
    if (!configuration || configuration.visible === false) {
        destroyRangeNavigator(state);
        return;
    }

    // The navigator owns a full-data scale. The active chart axis may hold a
    // narrower brush or zoom domain, so using it for the overview would make
    // the mini chart collapse to the selected window.
    const initialAxis = resolveRangeNavigatorAxis(state.initialAxes, configuration.xField);
    const activeAxis = resolveRangeNavigatorAxis(state.axes, configuration.xField);
    if (!initialAxis || !activeAxis || (initialAxis.type !== 'number' && initialAxis.type !== 'time')) {
        destroyRangeNavigator(state);
        return;
    }

    const configuredDomain = initialAxis.domain?.length
        || initialAxis.min !== undefined
        || initialAxis.max !== undefined
        ? toRangeNavigatorRange(resolveAxisDomain(initialAxis, state.data))
        : undefined;
    const fullDomain = configuredDomain ?? resolveRangeNavigatorDataDomain(
        state.data,
        initialAxis.field,
        initialAxis.type
    );
    const selectedRange = toRangeNavigatorRange(resolveAxisDomain(activeAxis, state.data));
    if (!fullDomain || !selectedRange) {
        destroyRangeNavigator(state);
        return;
    }

    renderRangeNavigator(state, {
        xAxis: initialAxis,
        fullDomain,
        selectedRange,
        onRangeChange: (range) => {
            getZoomRenderScheduler(state).cancel();
            state.axes = state.axes.map((axis) => axis === activeAxis
                ? {
                    ...axis,
                    domain: [...range],
                    min: undefined,
                    max: undefined
                }
                : axis);
            // Wheel zoom starts from the navigator selection, while
            // initialAxes remains the reset/full-data source of truth.
            state.baseAxes = cloneAxes(state.axes);
            state.zoomTransform = zoomIdentity;
            state.config = {
                ...state.config,
                axes: state.axes
            };
            const renderIdBeforeCallback = state.renderCompletion.renderId;
            configuration.onRangeChange?.(range);
            if (destroyedCharts.has(state as object)
                || state.renderCompletion.renderId !== renderIdBeforeCallback) {
                return;
            }
            render(state);
        }
    });
};

const reconcileRangeNavigatorSelectionForData = <T = any>(state: KChartState<T>): void => {
    const configuration = resolveRangeNavigatorConfiguration(state.config);
    if (!configuration || configuration.visible === false) {
        return;
    }
    const initialAxis = resolveRangeNavigatorAxis(state.initialAxes, configuration.xField);
    const activeAxis = resolveRangeNavigatorAxis(state.axes, configuration.xField);
    if (!initialAxis || !activeAxis || !activeAxis.domain?.length
        || (initialAxis.type !== 'number' && initialAxis.type !== 'time')) {
        return;
    }

    const configuredDomain = initialAxis.domain?.length
        || initialAxis.min !== undefined
        || initialAxis.max !== undefined
        ? toRangeNavigatorRange(resolveAxisDomain(initialAxis, state.data))
        : undefined;
    const fullDomain = configuredDomain ?? resolveRangeNavigatorDataDomain(
        state.data,
        initialAxis.field,
        initialAxis.type
    );
    const selectedRange = toRangeNavigatorRange(activeAxis.domain);
    if (!fullDomain || !selectedRange) {
        return;
    }
    const nextRange = reconcileRangeNavigatorRange(
        selectedRange,
        fullDomain,
        initialAxis.type
    );
    const unchanged = nextRange.every((value, index) => {
        const current = selectedRange[index];
        return value instanceof Date && current instanceof Date
            ? value.getTime() === current.getTime()
            : value === current;
    });
    if (unchanged) {
        return;
    }

    state.axes = state.axes.map((axis) => axis === activeAxis
        ? {...axis, domain: [...nextRange], min: undefined, max: undefined}
        : axis);
    state.baseAxes = cloneAxes(state.axes);
    state.zoomTransform = zoomIdentity;
    state.config = {...state.config, axes: state.axes};
};

const render = <T = any>(state: KChartState<T>): void => {
    if (destroyedCharts.has(state)) {
        return;
    }
    const completion = beginRenderCompletion(state);
    const baseMargin: KChartMargin = {
        ...defaultMargin,
        ...state.config.margin
    };
    const sizes = resolveSize(state.container, state.config, baseMargin, state.size);
    state.size = sizes.size;
    state.margin = sizes.margin;
    state.plotSize = sizes.plotSize;
    // Scales are recalculated before every render so custom series always
    // receive the latest coordinate system instead of owning axis state.
    state.scales = resolveScales(state.data, state.axes, state.plotSize);
    renderTitle(state);
    renderAxes(state);
    renderGrid(state);
    renderSpecAreas(state);
    renderGuideLines(state);
    renderSeriesWithAnimation(state);
    renderRangeNavigatorForState(state);
    renderLegend(state);
    renderTooltip(state);
    renderZoom(state);
    renderChartAccessibility(state);
    // Completion resolves immediately for synchronous SVG/canvas paths, or
    // waits for worker-backed series that registered async render tasks.
    finishRenderCompletion(state, completion);
};

const renderDataUpdate = <T = any>(
    state: KChartState<T>,
    previousScales: KChartResolvedScale<T>[]
): void => {
    const animation = resolveAnimationConfiguration(state.config);
    const canAnimate = animation.enabled
        && (animation.mode === 'update' || animation.mode === 'both')
        && animation.duration > 0
        && previousScales.length > 0
        && state.series
            .filter((series) => !state.hiddenSeries.has(series.selector))
            .every((series) => series.supportsUpdateAnimation === true)
        && typeof globalThis.requestAnimationFrame === 'function'
        && !(animation.respectReducedMotion && shouldReduceMotion());

    if (!canAnimate) {
        render(state);
        return;
    }

    cancelSeriesAnimation(state);
    const completion = beginRenderCompletion(state);
    const baseMargin: KChartMargin = {
        ...defaultMargin,
        ...state.config.margin
    };
    const sizes = resolveSize(state.container, state.config, baseMargin, state.size);
    state.size = sizes.size;
    state.margin = sizes.margin;
    state.plotSize = sizes.plotSize;
    const nextScales = resolveScales(state.data, state.axes, state.plotSize);

    renderChartAccessibility(state);
    renderTitle(state);
    renderLegend(state);
    renderTooltip(state);
    renderZoom(state);
    renderRangeNavigatorForState(state);

    const startedAt = now();
    const renderId = state.animationRenderId;
    let resolveTransition: () => void = () => undefined;
    const transition = new Promise<void>((resolve) => {
        resolveTransition = resolve;
    });
    animationCancellation.set(state, resolveTransition);
    registerRenderTask(state, transition);

    const renderFrame = (timestamp: number): void => {
        if (state.animationRenderId !== renderId) {
            return;
        }

        const elapsed = Math.max(0, timestamp - startedAt);
        const rawProgress = Math.min(elapsed / animation.duration, 1);
        const progress = applyAnimationEasing(rawProgress, animation.easing);
        state.scales = interpolateResolvedScales(previousScales, nextScales, progress);

        renderAxes(state);
        renderGrid(state);
        renderSpecAreas(state);
        renderGuideLines(state);
        const taskCountBeforeFrame = completion.tasks.length;
        renderSeries(state, {
            ...defaultAnimationContext,
            elapsed,
            duration: animation.duration,
            easing: animation.easing,
            mode: animation.mode,
            phase: 'update'
        });

        if (rawProgress < 1) {
            state.animationFrame = globalThis.requestAnimationFrame(renderFrame);
            return;
        }

        state.scales = nextScales;
        renderRangeNavigatorForState(state);
        state.animationFrame = undefined;
        animationCancellation.delete(state);
        const finalFrameTasks = completion.tasks.slice(taskCountBeforeFrame);
        Promise.all(finalFrameTasks).then(resolveTransition);
    };

    renderFrame(startedAt);
    finishRenderCompletion(state, completion);
};

export const createKChart = <T = any>(
    config: KChartConfiguration<T>
): KChartController<T> => {
    validateSeriesSelectors(config.series);
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
        animationRenderId: 0,
        renderCompletion: createResolvedRenderCompletion()
    };
    // A container has one live controller. Retire its previous owner before
    // creating layers so old cleanup hooks cannot touch the replacement chart.
    containerOwners.get(container.node())?.();
    const canvases = new Set<HTMLCanvasElement>();
    const canvasUsage = new Map<object, Set<HTMLCanvasElement>>();
    seriesCanvasUsage.set(state, canvasUsage);
    state.layers = createLayers(container, config, () => state.size, () => state.margin, canvases);
    let resizeObserver: ResizeObserver | undefined;
    const resizeScheduler = createZoomRenderScheduler(() => {
        if (destroyedCharts.has(state)) {
            return;
        }
        const nextSize = resolveContainerSize(measureContainerContentSize(container.node()), state.config);
        if (state.config.height === undefined && !hasDefiniteContainerHeight(container.node())) {
            nextSize.height = state.size.height;
        }
        if (nextSize.width !== state.size.width || nextSize.height !== state.size.height) {
            controller.resize();
        }
    });
    const scheduleResize = (): void => resizeScheduler.schedule();

    const controller: KChartController<T> = {
        render() {
            if (destroyedCharts.has(state)) {
                return controller;
            }
            // Explicit renders are authoritative. Discard a queued zoom paint
            // so it cannot immediately restart/cancel an update animation.
            zoomRenderSchedulers.get(state)?.cancel();
            render(state);
            return controller;
        },
        whenRenderComplete() {
            return state.renderCompletion.promise;
        },
        updateData(data: T[]) {
            if (destroyedCharts.has(state)) {
                return controller;
            }
            zoomRenderSchedulers.get(state)?.cancel();
            const previousScales = state.scales;
            state.data = data;
            state.config = {
                ...state.config,
                data
            };
            reconcileRangeNavigatorSelectionForData(state);
            renderDataUpdate(state, previousScales);
            return controller;
        },
        updateAxes(axes: KChartAxis<T>[]) {
            if (destroyedCharts.has(state)) {
                return controller;
            }
            zoomRenderSchedulers.get(state)?.cancel();
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
            if (destroyedCharts.has(state)) {
                return controller;
            }
            validateSeriesSelectors(series);
            zoomRenderSchedulers.get(state)?.cancel();
            cancelSeriesAnimation(state);
            const retained = new Set(series);
            const previous = new Set(state.series);
            const protectedCanvases = new Set<HTMLCanvasElement>();
            retained.forEach((item) => canvasUsage.get(item)?.forEach((canvas) => protectedCanvases.add(canvas)));
            previous.forEach((item) => {
                if (!retained.has(item)) {
                    state.hiddenSeries.delete(item.selector);
                    const detached: Array<{canvas: HTMLCanvasElement; parent: Node; next: Node | null}> = [];
                    protectedCanvases.forEach((canvas) => {
                        if (canvas.parentNode === container.node()) {
                            detached.push({canvas, parent: canvas.parentNode, next: canvas.nextSibling});
                            canvas.parentNode.removeChild(canvas);
                        }
                    });
                    // Cleanup hooks commonly query their parent for a named canvas.
                    // Keep retained renderers' shared nodes out of those queries.
                    try {
                        item.destroy?.(state.layers);
                    } finally {
                        detached.reverse().forEach(({canvas, parent, next}) => {
                            parent.insertBefore(canvas, next?.parentNode === parent ? next : null);
                        });
                    }
                    canvasUsage.delete(item);
                }
            });
            canvases.forEach((canvas) => {
                if (canvas.parentNode !== container.node()) {
                    canvases.delete(canvas);
                }
            });
            const retainedSelectors = new Set(series.filter((item) => previous.has(item)).map((item) => item.selector));
            state.hiddenSeries.forEach((selector) => {
                if (!retainedSelectors.has(selector)) {
                    state.hiddenSeries.delete(selector);
                }
            });
            state.series = series;
            state.config = {...state.config, series};
            return controller.render();
        },
        resize(size: Partial<KChartSize> = {}) {
            if (destroyedCharts.has(state)) {
                return controller;
            }
            const nextConfig = {
                ...state.config,
                ...size
            };
            const nextBaseMargin: KChartMargin = {
                ...defaultMargin,
                ...nextConfig.margin
            };
            const nextSizes = resolveSize(state.container, nextConfig, nextBaseMargin, state.size);
            state.config = nextConfig;
            state.margin = nextSizes.margin;
            state.size = nextSizes.size;
            state.plotSize = nextSizes.plotSize;
            return controller.render();
        },
        destroy() {
            if (destroyedCharts.has(state)) {
                return;
            }
            // Mutators become chainable no-ops; state and completion remain readable.
            destroyedCharts.add(state as object);
            resizeObserver?.disconnect();
            resizeScheduler.destroy();
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', scheduleResize);
            }
            getZoomRenderScheduler(state).destroy();
            cancelSeriesAnimation(state);
            destroyRangeNavigator(state);
            state.series.forEach((series: KChartSeries<T>) => {
                if (series.destroy) {
                    series.destroy(state.layers);
                }
            });
            state.layers.svg.remove();
            canvases.forEach((canvas) => select(canvas).remove());
            canvases.clear();
            canvasUsage.clear();
            seriesCanvasUsage.delete(state);
            state.container.selectAll('div.kchart-tooltip').remove();
            destroyTooltipNotes(state);
            state.hiddenSeries.clear();
            if (containerOwners.get(container.node()) === controller.destroy) {
                containerOwners.delete(container.node());
            }
        },
        getState() {
            return state;
        }
    };

    containerOwners.set(container.node(), controller.destroy);
    if (config.autoResize !== false && (config.width === undefined || config.height === undefined)) {
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(scheduleResize);
            resizeObserver.observe(container.node());
        } else if (typeof window !== 'undefined') {
            window.addEventListener('resize', scheduleResize);
        }
    }

    return controller;
};
