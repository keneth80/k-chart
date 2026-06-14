import { extent } from 'd3-array';
import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { geoDistance, geoGraticule10, geoMercator, geoOrthographic, geoPath } from 'd3-geo';
import { scaleBand, scaleLinear, scalePoint, scaleTime } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { BaseType, pointer, select, Selection } from 'd3-selection';
import { curveMonotoneX, line as d3Line } from 'd3-shape';
import { D3ZoomEvent, zoom, zoomIdentity, ZoomTransform } from 'd3-zoom';
import { feature as topojsonFeature, mesh as topojsonMesh } from 'topojson-client';
import worldCountries110m from 'world-atlas/countries-110m.json';
import worldLand110m from 'world-atlas/land-110m.json';

export type KChartScaleType = 'number' | 'time' | 'string' | 'point';
export type KChartPlacement = 'top' | 'right' | 'bottom' | 'left';
export type KChartTextAlign = 'left' | 'center' | 'right';
export type KChartLegendPlacement = 'top' | 'right' | 'bottom';
export type KChartZoomDirection = 'x' | 'y' | 'xy';
export type KChartZoomMode = 'wheel' | 'select' | 'both';
export type KChartZoomInputDevice = 'pc' | 'mobile' | 'all';
export type KChartCandlestickColorMode = 'open-close' | 'previous-close';
export type KChartGlobeLandMode = 'land' | 'countries';

export interface KChartAxis<T = any> {
    field: keyof T & string;
    type: KChartScaleType;
    placement: KChartPlacement;
    domainFields?: Array<keyof T & string>;
    min?: number | Date;
    max?: number | Date;
    domain?: Array<string | number | Date>;
    visible?: boolean;
    padding?: number;
    title?: string;
    tickCount?: number;
    tickFormat?: (value: any) => string;
}

export interface KChartMargin {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

export interface KChartSize {
    width: number;
    height: number;
}

export interface KChartResolvedScale<T = any> extends KChartAxis<T> {
    scale: any;
}

export interface KChartDownsampleContext<T = any> {
    data: T[];
    plotSize: KChartSize;
    series: KChartSeries<T>;
    xField?: keyof T & string;
    yField?: keyof T & string;
}

export interface KChartDownsampleConfiguration<T = any> {
    enabled?: boolean;
    threshold?: number | ((context: KChartDownsampleContext<T>) => number);
    xAccessor?: (point: T) => number;
    yAccessor?: (point: T) => number;
}

export interface KChartAsyncRenderConfiguration {
    enabled?: boolean;
    workerFactory?: () => Worker;
}

export interface KChartLayerContext {
    svg: Selection<SVGSVGElement, unknown, any, any>;
    rootGroup: Selection<SVGGElement, unknown, any, any>;
    plotGroup: Selection<SVGGElement, unknown, any, any>;
    seriesGroup: Selection<SVGGElement, unknown, any, any>;
    overlayGroup: Selection<SVGGElement, unknown, any, any>;
    getCanvas(name?: string): HTMLCanvasElement;
    getWebglCanvas(name?: string): HTMLCanvasElement;
}

export interface KChartRenderContext<T = any> extends KChartLayerContext {
    group: Selection<SVGGElement, unknown, any, any>;
    data: T[];
    scales: KChartResolvedScale<T>[];
    xScale?: KChartResolvedScale<T>;
    yScale?: KChartResolvedScale<T>;
    size: KChartSize;
    plotSize: KChartSize;
    margin: KChartMargin;
    color: string;
    seriesIndex: number;
}

export interface KChartSeriesTooltipContext<T = any> extends KChartLayerContext {
    data: T[];
    scales: KChartResolvedScale<T>[];
    size: KChartSize;
    plotSize: KChartSize;
    margin: KChartMargin;
    color: string;
    seriesIndex: number;
    mouseX: number;
    mouseY: number;
}

export interface KChartSeriesTooltipResult<T = any> {
    data: T;
    x: number;
    y: number;
    color?: string;
    distance?: number;
    html?: string;
}

export interface KChartSeries<T = any> {
    selector: string;
    displayName?: string;
    xField?: keyof T & string;
    yField?: keyof T & string;
    color?: string;
    downsample?: boolean | KChartDownsampleConfiguration<T>;
    render(context: KChartRenderContext<T>): void;
    tooltip?(context: KChartSeriesTooltipContext<T>): KChartSeriesTooltipResult<T> | null | undefined;
    clearTooltip?(context: KChartLayerContext): void;
    destroy?(context: KChartLayerContext): void;
}

export interface KChartLineSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    color?: string;
    strokeWidth?: number;
    curve?: boolean;
    dot?: boolean | {
        radius?: number;
        fill?: string;
        stroke?: string;
    };
    downsample?: boolean | KChartDownsampleConfiguration<T>;
}

export interface KChartCanvasLineSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    color?: string;
    lineWidth?: number;
    canvasName?: string;
    downsample?: boolean | KChartDownsampleConfiguration<T>;
    asyncRender?: KChartAsyncRenderConfiguration;
}

export interface KChartCanvasPointSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    color?: string;
    radius?: number | ((point: T) => number);
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    canvasName?: string;
}

export interface KChartCanvasCandlestickSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    openField: keyof T & string;
    highField: keyof T & string;
    lowField: keyof T & string;
    closeField: keyof T & string;
    colorMode?: KChartCandlestickColorMode;
    previousCloseField?: keyof T & string;
    upColor?: string;
    downColor?: string;
    neutralColor?: string;
    wickColor?: string;
    borderColor?: string;
    candleWidth?: number | ((context: {
        data: T[];
        xScale: KChartResolvedScale<T>;
        plotSize: KChartSize;
    }) => number);
    minCandleWidth?: number;
    maxCandleWidth?: number;
    strokeWidth?: number;
    canvasName?: string;
}

export interface KChartGlobeMarkerClickContext<T = any> {
    data: T;
    event: MouseEvent;
    lat: number;
    lon: number;
    x: number;
    y: number;
}

export interface KChartGlobeZoomConfiguration {
    enabled?: boolean;
    wheel?: boolean;
    pinch?: boolean;
    controls?: boolean | KChartGlobeZoomControlsConfiguration;
    min?: number;
    max?: number;
    wheelSensitivity?: number;
}

export interface KChartGlobeZoomControlsConfiguration {
    visible?: boolean;
    step?: number;
    x?: number;
    y?: number;
}

export interface KChartGlobeDrilldownContext<T = any> {
    data: T;
    lat: number;
    lon: number;
}

export type KChartGlobeDrilldownMode = 'map' | 'zoom';

export interface KChartGlobeDrilldownConfiguration<T = any> {
    enabled?: boolean;
    mode?: KChartGlobeDrilldownMode;
    focusZoom?: number;
    zoomScale?: number;
    duration?: number;
    resetControl?: boolean;
    landFill?: string | ((feature: any, index: number) => string);
    landStroke?: string | ((feature: any, index: number) => string);
    landOpacity?: number | ((feature: any, index: number) => number);
    onEnter?: (context: KChartGlobeDrilldownContext<T>) => void;
    onExit?: () => void;
}

export interface KChartSvgGlobeSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    latField: keyof T & string;
    lonField: keyof T & string;
    labelField?: keyof T & string;
    initialRotate?: [number, number, number?];
    draggable?: boolean;
    globeScale?: number;
    zoom?: boolean | KChartGlobeZoomConfiguration;
    drilldown?: boolean | KChartGlobeDrilldownConfiguration<T>;
    sphereFill?: string;
    sphereStroke?: string;
    graticuleVisible?: boolean;
    graticuleStroke?: string;
    landVisible?: boolean;
    landMode?: KChartGlobeLandMode;
    landGeoJson?: any | any[];
    landFill?: string | ((feature: any, index: number) => string);
    landStroke?: string | ((feature: any, index: number) => string);
    landOpacity?: number | ((feature: any, index: number) => number);
    countryBordersVisible?: boolean;
    countryBordersStroke?: string;
    countryBordersStrokeWidth?: number;
    markerRadius?: number | ((point: T) => number);
    markerColor?: string | ((point: T) => string);
    markerStroke?: string;
    markerStrokeWidth?: number;
    markerOpacity?: number;
    onMarkerClick?: (context: KChartGlobeMarkerClickContext<T>) => void;
}

export interface KChartWebglPointSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    color?: string;
    pointSize?: number | ((point: T) => number);
    canvasName?: string;
}

export interface KChartWebglLineSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    color?: string;
    lineWidth?: number;
    canvasName?: string;
    downsample?: boolean | KChartDownsampleConfiguration<T>;
    asyncRender?: KChartAsyncRenderConfiguration;
}

export interface KChartTitleConfiguration {
    text: string;
    align?: KChartTextAlign;
    color?: string;
    fontSize?: number;
    fontWeight?: number | string;
}

export interface KChartGridConfiguration {
    visible?: boolean;
    x?: boolean;
    y?: boolean;
    color?: string;
    dasharray?: string;
}

export interface KChartLegendConfiguration {
    visible?: boolean;
    placement?: KChartLegendPlacement;
    itemGap?: number;
    selectable?: boolean;
}

export interface KChartTooltipConfiguration<T = any> {
    visible?: boolean;
    formatter?: (context: {
        data: T;
        series: KChartSeries<T>;
        x: any;
        y: any;
        color: string;
    }) => string;
}

export interface KChartZoomContext<T = any> {
    axes: KChartAxis<T>[];
    xDomain?: Array<number | Date>;
    yDomain?: Array<number | Date>;
    transform: ZoomTransform;
}

export interface KChartWheelZoomConfiguration {
    enabled?: boolean;
    devices?: KChartZoomInputDevice;
    sensitivity?: number;
}

export interface KChartGestureZoomConfiguration {
    enabled?: boolean;
    devices?: KChartZoomInputDevice;
    minTouches?: number;
}

export interface KChartZoomConfiguration<T = any> {
    enabled?: boolean;
    mode?: KChartZoomMode;
    direction?: KChartZoomDirection;
    scaleExtent?: [number, number];
    wheelZoom?: boolean | KChartWheelZoomConfiguration;
    gestureZoom?: boolean | KChartGestureZoomConfiguration;
    resetOnDoubleClick?: boolean;
    onZoom?: (context: KChartZoomContext<T>) => void;
}

export interface KChartSpecAreaConfiguration {
    visible?: boolean;
    start: number | Date | string;
    end: number | Date | string;
    color?: string;
    label?: string;
}

export interface KChartCursorGuideConfiguration {
    visible?: boolean;
    color?: string;
    markerRadius?: number;
    valueFormat?: (value: any) => string;
    xFormat?: (value: any) => string;
}

export interface KChartFixedGuideLine {
    visible?: boolean;
    axis?: 'x' | 'y';
    value: number | Date | string;
    label?: string;
    color?: string;
    width?: number;
    dasharray?: string;
    labelColor?: string;
    labelBackground?: string;
}

export interface KChartGuideLinesConfiguration {
    visible?: boolean;
    x?: KChartFixedGuideLine[];
    y?: KChartFixedGuideLine[];
}

export interface KChartSpecAreaOption {
    type: 'spec-area';
    visible?: boolean;
    areas: KChartSpecAreaConfiguration[];
}

export interface KChartGuideLineOption {
    type: 'guide-line';
    visible?: boolean;
    x?: KChartFixedGuideLine[];
    y?: KChartFixedGuideLine[];
}

export interface KChartCursorLineOption {
    type: 'cursor-line';
    visible?: boolean;
    config?: KChartCursorGuideConfiguration;
}

export type KChartOption = KChartSpecAreaOption | KChartGuideLineOption | KChartCursorLineOption;

export interface KChartConfiguration<T = any> {
    selector: string | HTMLElement;
    data: T[];
    axes: KChartAxis<T>[];
    series: KChartSeries<T>[];
    width?: number;
    height?: number;
    margin?: Partial<KChartMargin>;
    colors?: string[];
    className?: string;
    title?: KChartTitleConfiguration;
    grid?: KChartGridConfiguration;
    legend?: KChartLegendConfiguration;
    tooltip?: KChartTooltipConfiguration<T>;
    zoom?: KChartZoomConfiguration<T>;
    specAreas?: KChartSpecAreaConfiguration[];
    cursorGuide?: KChartCursorGuideConfiguration;
    guideLine?: KChartCursorGuideConfiguration;
    guideLines?: KChartGuideLinesConfiguration;
    options?: KChartOption[];
}

export interface KChartState<T = any> {
    config: KChartConfiguration<T>;
    container: Selection<HTMLElement, unknown, any, any>;
    data: T[];
    axes: KChartAxis<T>[];
    initialAxes: KChartAxis<T>[];
    baseAxes: KChartAxis<T>[];
    series: KChartSeries<T>[];
    size: KChartSize;
    plotSize: KChartSize;
    margin: KChartMargin;
    colors: string[];
    scales: KChartResolvedScale<T>[];
    layers: KChartLayerContext;
    hiddenSeries: Set<string>;
    zoomTransform: ZoomTransform;
    zoomSelection?: {
        active: boolean;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
    };
}

export interface KChartController<T = any> {
    render(): KChartController<T>;
    updateData(data: T[]): KChartController<T>;
    updateAxes(axes: KChartAxis<T>[]): KChartController<T>;
    updateSeries(series: KChartSeries<T>[]): KChartController<T>;
    resize(size?: Partial<KChartSize>): KChartController<T>;
    destroy(): void;
    getState(): KChartState<T>;
}

const defaultMargin: KChartMargin = {
    top: 24,
    right: 24,
    bottom: 36,
    left: 44
};

type KChartWorkerRenderer = '2d' | 'webgl';

interface KChartAsyncCanvasEntry {
    worker: Worker;
    renderer: KChartWorkerRenderer;
    canvasId: string;
    failed: boolean;
}

interface KChartLineRenderPayload {
    type: 'kchart:render-line';
    canvasId: string;
    renderer: KChartWorkerRenderer;
    width: number;
    height: number;
    color: string;
    lineWidth: number;
    points: Float32Array;
}

const transferredCanvases = new WeakSet<HTMLCanvasElement>();
const asyncCanvasEntries = new WeakMap<HTMLCanvasElement, KChartAsyncCanvasEntry>();
let asyncCanvasId = 0;

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

    if (!transferredCanvases.has(canvas)) {
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

const resolveScalePosition = <T = any>(
    scale: KChartResolvedScale<T>,
    value: any
): number => {
    const scaleValue = scale.type === 'time' && !(value instanceof Date)
        ? new Date(value as any)
        : value;
    const position = scale.scale(scaleValue);

    return typeof scale.scale.bandwidth === 'function'
        ? position + scale.scale.bandwidth() / 2
        : position;
};

const clampNumber = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const resolveCanvasCandlestickWidth = <T = any>(
    data: T[],
    xScale: KChartResolvedScale<T>,
    xField: keyof T & string,
    plotSize: KChartSize,
    configuration: Pick<KChartCanvasCandlestickSeriesConfiguration<T>, 'candleWidth' | 'minCandleWidth' | 'maxCandleWidth'>
): number => {
    if (typeof configuration.candleWidth === 'number') {
        return configuration.candleWidth;
    }

    if (typeof configuration.candleWidth === 'function') {
        return configuration.candleWidth({ data, xScale, plotSize });
    }

    const minWidth = configuration.minCandleWidth ?? 3;
    const maxWidth = configuration.maxCandleWidth ?? 18;

    if (typeof xScale.scale.bandwidth === 'function') {
        return clampNumber(xScale.scale.bandwidth() * 0.72, minWidth, maxWidth);
    }

    const positions = data
        .map((point) => resolveScalePosition(xScale, point[xField]))
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
    let minDistance = Number.POSITIVE_INFINITY;

    for (let index = 1; index < positions.length; index += 1) {
        const distance = positions[index] - positions[index - 1];
        if (distance > 0 && distance < minDistance) {
            minDistance = distance;
        }
    }

    if (!Number.isFinite(minDistance)) {
        return clampNumber(plotSize.width / Math.max(data.length, 1) * 0.72, minWidth, maxWidth);
    }

    return clampNumber(minDistance * 0.72, minWidth, maxWidth);
};

const resolveCandlestickColor = <T = any>(
    point: T,
    previousPoint: T | undefined,
    configuration: Pick<KChartCanvasCandlestickSeriesConfiguration<T>, 'openField' | 'closeField' | 'colorMode' | 'previousCloseField' | 'upColor' | 'downColor' | 'neutralColor'>,
    fallbackColor: string
): string => {
    const previousCloseFromField = configuration.previousCloseField
        ? Number(point[configuration.previousCloseField])
        : undefined;
    const previousCloseFromPoint = previousPoint
        ? Number(previousPoint[configuration.closeField])
        : undefined;
    const open = configuration.colorMode === 'previous-close'
        ? (Number.isFinite(previousCloseFromField) ? previousCloseFromField : previousCloseFromPoint)
        : Number(point[configuration.openField]);
    const close = Number(point[configuration.closeField]);

    if (!Number.isFinite(open) || !Number.isFinite(close)) {
        return configuration.neutralColor ?? fallbackColor;
    }

    if (close > open) {
        return configuration.upColor ?? '#22c55e';
    }

    if (close < open) {
        return configuration.downColor ?? '#ef4444';
    }

    return configuration.neutralColor ?? fallbackColor;
};

const formatCandlestickTooltipValue = (value: any): string => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue.toLocaleString(undefined, { maximumFractionDigits: 4 }) : String(value);
};

const resolveGlobePointValue = <T = any>(point: T, field: keyof T & string): number => Number(point[field]);

const resolveGlobeMarkerRadius = <T = any>(
    point: T,
    configuration: Pick<KChartSvgGlobeSeriesConfiguration<T>, 'markerRadius'>
): number => {
    if (typeof configuration.markerRadius === 'function') {
        return configuration.markerRadius(point);
    }
    return configuration.markerRadius ?? 5;
};

const resolveGlobeMarkerColor = <T = any>(
    point: T,
    configuration: Pick<KChartSvgGlobeSeriesConfiguration<T>, 'markerColor'>,
    fallbackColor: string
): string => {
    if (typeof configuration.markerColor === 'function') {
        return configuration.markerColor(point);
    }
    return configuration.markerColor ?? fallbackColor;
};

const resolveGlobeLandStyle = (
    value: string | ((feature: any, index: number) => string) | undefined,
    feature: any,
    index: number,
    fallback: string
): string => {
    if (typeof value === 'function') {
        return value(feature, index);
    }
    return value ?? fallback;
};

const resolveGlobeLandOpacity = (
    value: number | ((feature: any, index: number) => number) | undefined,
    feature: any,
    index: number
): number => {
    if (typeof value === 'function') {
        return value(feature, index);
    }
    return value ?? 0.88;
};

const normalizeGlobeLandFeatures = (geoJson: any | any[]): any[] => {
    const values = Array.isArray(geoJson) ? geoJson : [geoJson];
    return values.flatMap((value) => {
        if (value?.type === 'FeatureCollection' && Array.isArray(value.features)) {
            return value.features;
        }
        return value ? [value] : [];
    });
};

const normalizeGlobeRotation = (rotation?: [number, number, number?]): [number, number, number] => [
    rotation?.[0] ?? 0,
    rotation?.[1] ?? -12,
    rotation?.[2] ?? 0
];

const resolveGlobeZoomConfiguration = (zoom?: boolean | KChartGlobeZoomConfiguration): Required<KChartGlobeZoomConfiguration> => {
    if (typeof zoom === 'boolean') {
        return {
            enabled: zoom,
            wheel: true,
            pinch: true,
            controls: false,
            min: 0.55,
            max: 3,
            wheelSensitivity: 0.0012
        };
    }
    return {
        enabled: zoom?.enabled ?? false,
        wheel: zoom?.wheel ?? true,
        pinch: zoom?.pinch ?? true,
        controls: zoom?.controls ?? false,
        min: zoom?.min ?? 0.55,
        max: zoom?.max ?? 3,
        wheelSensitivity: zoom?.wheelSensitivity ?? 0.0012
    };
};

const resolveGlobeZoomControlsConfiguration = (
    controls: boolean | KChartGlobeZoomControlsConfiguration | undefined
): Required<KChartGlobeZoomControlsConfiguration> => {
    if (typeof controls === 'boolean') {
        return {
            visible: controls,
            step: 0.22,
            x: 8,
            y: 8
        };
    }
    return {
        visible: controls?.visible ?? false,
        step: controls?.step ?? 0.22,
        x: controls?.x ?? 8,
        y: controls?.y ?? 8
    };
};

const resolveGlobeDrilldownConfiguration = <T = any>(
    drilldown?: boolean | KChartGlobeDrilldownConfiguration<T>
): Required<Omit<KChartGlobeDrilldownConfiguration<T>, 'onEnter' | 'onExit' | 'landFill' | 'landStroke' | 'landOpacity'>> & Pick<KChartGlobeDrilldownConfiguration<T>, 'onEnter' | 'onExit' | 'landFill' | 'landStroke' | 'landOpacity'> => {
    if (typeof drilldown === 'boolean') {
        return {
            enabled: drilldown,
            mode: 'map',
            focusZoom: 2.6,
            zoomScale: 6,
            duration: 720,
            resetControl: true
        };
    }
    return {
        enabled: drilldown?.enabled ?? false,
        mode: drilldown?.mode ?? 'map',
        focusZoom: drilldown?.focusZoom ?? 2.6,
        zoomScale: drilldown?.zoomScale ?? 6,
        duration: drilldown?.duration ?? 720,
        resetControl: drilldown?.resetControl ?? true,
        landFill: drilldown?.landFill,
        landStroke: drilldown?.landStroke,
        landOpacity: drilldown?.landOpacity,
        onEnter: drilldown?.onEnter,
        onExit: drilldown?.onExit
    };
};

const WORLD_COUNTRY_GEOJSON = topojsonFeature(
    worldCountries110m as any,
    (worldCountries110m as any).objects.countries
);

const WORLD_LAND_GEOJSON = topojsonFeature(
    worldLand110m as any,
    (worldLand110m as any).objects.land
);

const WORLD_COUNTRY_BORDERS_GEOJSON = topojsonMesh(
    worldCountries110m as any,
    (worldCountries110m as any).objects.countries,
    (a: any, b: any) => a !== b
);

const isGlobePointVisible = (lon: number, lat: number, rotation: [number, number, number]): boolean => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
        return false;
    }

    const center: [number, number] = [-rotation[0], -rotation[1]];
    return geoDistance([lon, lat], center) <= Math.PI / 2;
};

export const downsampleLTTB = <T = any>(
    data: T[],
    threshold: number,
    xAccessor: (point: T) => number,
    yAccessor: (point: T) => number
): T[] => {
    const dataLength = data.length;
    const targetLength = Math.floor(threshold);

    if (dataLength <= 2 || !Number.isFinite(targetLength) || targetLength <= 0 || targetLength >= dataLength) {
        return data;
    }

    if (targetLength === 1) {
        return [data[0]];
    }

    if (targetLength === 2) {
        return [data[0], data[dataLength - 1]];
    }

    const sampled: T[] = [data[0]];
    const bucketSize = (dataLength - 2) / (targetLength - 2);
    let previousSelectedIndex = 0;

    for (let bucketIndex = 0; bucketIndex < targetLength - 2; bucketIndex += 1) {
        const averageStart = Math.floor((bucketIndex + 1) * bucketSize) + 1;
        const averageEnd = Math.min(Math.floor((bucketIndex + 2) * bucketSize) + 1, dataLength);
        const averageLength = Math.max(averageEnd - averageStart, 1);
        let averageX = 0;
        let averageY = 0;

        for (let index = averageStart; index < averageEnd; index += 1) {
            averageX += xAccessor(data[index]);
            averageY += yAccessor(data[index]);
        }

        if (averageEnd <= averageStart) {
            averageX = xAccessor(data[dataLength - 1]);
            averageY = yAccessor(data[dataLength - 1]);
        } else {
            averageX /= averageLength;
            averageY /= averageLength;
        }

        const rangeStart = Math.floor(bucketIndex * bucketSize) + 1;
        const rangeEnd = Math.min(Math.floor((bucketIndex + 1) * bucketSize) + 1, dataLength - 1);
        const pointAX = xAccessor(data[previousSelectedIndex]);
        const pointAY = yAccessor(data[previousSelectedIndex]);
        let maxArea = -1;
        let maxAreaIndex = rangeStart;

        for (let index = rangeStart; index < rangeEnd; index += 1) {
            const pointBX = xAccessor(data[index]);
            const pointBY = yAccessor(data[index]);
            const area = Math.abs(
                (pointAX - averageX) * (pointBY - pointAY)
                - (pointAX - pointBX) * (averageY - pointAY)
            ) * 0.5;

            if (Number.isFinite(area) && area > maxArea) {
                maxArea = area;
                maxAreaIndex = index;
            }
        }

        sampled.push(data[maxAreaIndex]);
        previousSelectedIndex = maxAreaIndex;
    }

    sampled.push(data[dataLength - 1]);

    return sampled;
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

const getAsyncCanvasEntry = (
    canvas: HTMLCanvasElement,
    renderer: KChartWorkerRenderer,
    asyncRender?: KChartAsyncRenderConfiguration
): KChartAsyncCanvasEntry | null => {
    if (!asyncRender?.enabled || !asyncRender.workerFactory || typeof canvas.transferControlToOffscreen !== 'function') {
        return null;
    }

    const existing = asyncCanvasEntries.get(canvas);
    if (existing) {
        return existing.failed || existing.renderer !== renderer ? null : existing;
    }

    try {
        const worker = asyncRender.workerFactory();
        const canvasId = `kchart-offscreen-${asyncCanvasId += 1}`;
        const offscreenCanvas = canvas.transferControlToOffscreen();
        const entry: KChartAsyncCanvasEntry = {
            worker,
            renderer,
            canvasId,
            failed: false
        };

        worker.onerror = () => {
            entry.failed = true;
        };
        worker.postMessage({
            type: 'kchart:init-canvas',
            canvasId,
            renderer,
            canvas: offscreenCanvas
        }, [offscreenCanvas]);
        transferredCanvases.add(canvas);
        asyncCanvasEntries.set(canvas, entry);

        return entry;
    } catch (_error) {
        return null;
    }
};

const destroyAsyncCanvas = (canvas: HTMLCanvasElement): void => {
    const entry = asyncCanvasEntries.get(canvas);

    if (!entry) {
        return;
    }

    try {
        entry.worker.postMessage({
            type: 'kchart:destroy-canvas',
            canvasId: entry.canvasId
        });
        entry.worker.terminate();
    } catch (_error) {
        entry.worker.terminate();
    }

    asyncCanvasEntries.delete(canvas);
};

const destroyCanvasByClass = (
    svg: Selection<SVGSVGElement, unknown, any, any>,
    className: string
): void => {
    const parent = svg.node()?.parentElement;

    if (!parent) {
        return;
    }

    select(parent).selectAll<HTMLCanvasElement, unknown>(`canvas.${className}`)
        .each(function destroyCanvas() {
            destroyAsyncCanvas(this);
        })
        .remove();
};

const resolveLinePoints = <T = any>(
    data: T[],
    xScale: KChartResolvedScale<T>,
    yScale: KChartResolvedScale<T>,
    xField: keyof T & string,
    yField: keyof T & string
): Float32Array => {
    const points = new Float32Array(data.length * 2);
    let pointIndex = 0;

    data.forEach((point: T) => {
        if (point[xField] === undefined || point[yField] === undefined) {
            return;
        }

        const x = resolveScalePosition(xScale, point[xField]);
        const y = resolveScalePosition(yScale, point[yField]);

        if (Number.isFinite(x) && Number.isFinite(y)) {
            points[pointIndex] = x;
            points[pointIndex + 1] = y;
            pointIndex += 2;
        }
    });

    return pointIndex === points.length
        ? points
        : points.slice(0, pointIndex);
};

const resolveWebglLineVertices = (
    points: Float32Array,
    width: number,
    height: number
): Float32Array => {
    const vertices = new Float32Array(points.length);

    for (let index = 0; index < points.length; index += 2) {
        vertices[index] = (points[index] / width) * 2 - 1;
        vertices[index + 1] = 1 - (points[index + 1] / height) * 2;
    }

    return vertices;
};

const resolveWebglPointInterleavedData = <T = any>(
    data: T[],
    xScale: KChartResolvedScale<T>,
    yScale: KChartResolvedScale<T>,
    xField: keyof T & string,
    yField: keyof T & string,
    width: number,
    height: number,
    resolveSize: (point: T) => number
): {buffer: Float32Array, count: number} => {
    const buffer = new Float32Array(data.length * 3);
    let pointCount = 0;

    data.forEach((point: T) => {
        if (point[xField] === undefined || point[yField] === undefined) {
            return;
        }

        const x = resolveScalePosition(xScale, point[xField]);
        const y = resolveScalePosition(yScale, point[yField]);

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return;
        }

        const offset = pointCount * 3;
        buffer[offset] = (x / width) * 2 - 1;
        buffer[offset + 1] = 1 - (y / height) * 2;
        buffer[offset + 2] = resolveSize(point);
        pointCount += 1;
    });

    return {
        buffer: pointCount * 3 === buffer.length
            ? buffer
            : buffer.subarray(0, pointCount * 3),
        count: pointCount
    };
};

const resolveCanvasPixelSize = (canvas: HTMLCanvasElement): KChartSize => ({
    width: Number(canvas.dataset.kchartWidth) || canvas.width,
    height: Number(canvas.dataset.kchartHeight) || canvas.height
});

const renderLineWithWorker = (
    canvas: HTMLCanvasElement,
    renderer: KChartWorkerRenderer,
    asyncRender: KChartAsyncRenderConfiguration | undefined,
    payload: Omit<KChartLineRenderPayload, 'type' | 'canvasId' | 'renderer'>
): boolean => {
    const entry = getAsyncCanvasEntry(canvas, renderer, asyncRender);

    if (!entry) {
        return false;
    }

    const message: KChartLineRenderPayload = {
        type: 'kchart:render-line',
        canvasId: entry.canvasId,
        renderer,
        ...payload
    };

    entry.worker.postMessage(message, [message.points.buffer]);

    return true;
};

const parseColor = (color: string): [number, number, number, number] => {
    if (color.startsWith('#')) {
        const value = color.slice(1);
        const normalized = value.length === 3
            ? value.split('').map((item: string) => item + item).join('')
            : value;
        const numberValue = parseInt(normalized, 16);

        return [
            ((numberValue >> 16) & 255) / 255,
            ((numberValue >> 8) & 255) / 255,
            (numberValue & 255) / 255,
            1
        ];
    }

    return [0.35, 0.72, 1, 1];
};

const createShader = (
    gl: WebGLRenderingContext,
    type: number,
    source: string
): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) {
        return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
    }

    return shader;
};

const createProgram = (
    gl: WebGLRenderingContext,
    vertexSource: string,
    fragmentSource: string
): WebGLProgram | null => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) {
        return null;
    }

    const program = gl.createProgram();
    if (!program) {
        return null;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }

    return program;
};

export const startKChartRenderWorker = (
    workerScope: Worker = self as any
): void => {
    interface WorkerCanvasEntry {
        canvas: OffscreenCanvas;
        renderer: KChartWorkerRenderer;
        context2d?: OffscreenCanvasRenderingContext2D;
        gl?: WebGLRenderingContext;
        program?: WebGLProgram;
    }

    const canvases = new Map<string, WorkerCanvasEntry>();

    const resolveWorkerProgram = (entry: WorkerCanvasEntry): WebGLProgram | null => {
        if (entry.program) {
            return entry.program;
        }

        if (!entry.gl) {
            return null;
        }

        const vertexSource = `
            attribute vec2 a_position;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        const fragmentSource = `
            precision mediump float;
            uniform vec4 u_color;

            void main() {
                gl_FragColor = u_color;
            }
        `;
        entry.program = createProgram(entry.gl, vertexSource, fragmentSource) ?? undefined;

        return entry.program ?? null;
    };

    const drawCanvasLine = (
        entry: WorkerCanvasEntry,
        message: KChartLineRenderPayload
    ): void => {
        const context = entry.context2d;
        if (!context) {
            return;
        }

        entry.canvas.width = message.width;
        entry.canvas.height = message.height;
        context.clearRect(0, 0, message.width, message.height);
        context.beginPath();
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = message.lineWidth;
        context.strokeStyle = message.color;

        for (let index = 0; index < message.points.length; index += 2) {
            const x = message.points[index];
            const y = message.points[index + 1];

            if (index === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        }

        context.stroke();
    };

    const drawWebglLine = (
        entry: WorkerCanvasEntry,
        message: KChartLineRenderPayload
    ): void => {
        const gl = entry.gl;
        if (!gl) {
            return;
        }

        entry.canvas.width = message.width;
        entry.canvas.height = message.height;

        const vertices = new Float32Array(message.points.length);
        for (let index = 0; index < message.points.length; index += 2) {
            vertices[index] = (message.points[index] / message.width) * 2 - 1;
            vertices[index + 1] = 1 - (message.points[index + 1] / message.height) * 2;
        }

        const program = resolveWorkerProgram(entry);
        if (!program) {
            return;
        }

        gl.viewport(0, 0, message.width, message.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.lineWidth(message.lineWidth);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const colorLocation = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(colorLocation, new Float32Array(parseColor(message.color)));
        gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);
        gl.deleteBuffer(positionBuffer);
    };

    workerScope.onmessage = (event: MessageEvent<any>) => {
        const message = event.data;

        if (message.type === 'kchart:init-canvas') {
            const canvas = message.canvas as OffscreenCanvas;
            const renderer = message.renderer as KChartWorkerRenderer;
            const entry: WorkerCanvasEntry = {
                canvas,
                renderer
            };

            if (renderer === '2d') {
                entry.context2d = canvas.getContext('2d') ?? undefined;
            } else {
                entry.gl = canvas.getContext('webgl', { alpha: true }) as WebGLRenderingContext | null ?? undefined;
            }

            canvases.set(message.canvasId, entry);
            return;
        }

        if (message.type === 'kchart:destroy-canvas') {
            canvases.delete(message.canvasId);
            return;
        }

        if (message.type === 'kchart:render-line') {
            const entry = canvases.get(message.canvasId);
            if (!entry) {
                return;
            }

            if (message.renderer === '2d') {
                drawCanvasLine(entry, message);
            } else {
                drawWebglLine(entry, message);
            }
        }
    };
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

const getSpecAreas = <T = any>(state: KChartState<T>): KChartSpecAreaConfiguration[] => [
    ...(state.config.specAreas ?? []),
    ...(state.config.options ?? [])
        .filter((option): option is KChartSpecAreaOption => option.type === 'spec-area' && option.visible !== false)
        .flatMap((option) => option.areas)
].filter((area) => area.visible !== false);

const renderSpecAreas = <T = any>(state: KChartState<T>): void => {
    const areas = getSpecAreas(state);
    const areaGroup = state.layers.plotGroup.selectAll<SVGGElement, unknown>('g.kchart-spec-areas')
        .data(areas.length ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-spec-areas');
    const labelGroup = state.layers.plotGroup.selectAll<SVGGElement, unknown>('g.kchart-spec-area-labels')
        .data(areas.length ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-spec-area-labels');

    if (!areas.length) {
        return;
    }

    const xScale = state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'bottom' || scale.placement === 'top');
    if (!xScale) {
        return;
    }

    const clamp = (value: number): number => Math.max(0, Math.min(state.plotSize.width, value));

    const area = areaGroup.selectAll<SVGGElement, KChartSpecAreaConfiguration>('g.kchart-spec-area')
        .data(areas)
        .join('g')
        .attr('class', 'kchart-spec-area');

    area.selectAll<SVGRectElement, KChartSpecAreaConfiguration>('rect')
        .data((item) => [item])
        .join('rect')
        .attr('x', (item) => clamp(resolveScalePosition(xScale, item.start)))
        .attr('y', 0)
        .attr('width', (item) => Math.max(0, clamp(resolveScalePosition(xScale, item.end)) - clamp(resolveScalePosition(xScale, item.start))))
        .attr('height', state.plotSize.height)
        .style('fill', (item) => item.color ?? 'rgba(249, 225, 250, 0.22)')
        .style('pointer-events', 'none');

    const labels = labelGroup.selectAll<SVGGElement, KChartSpecAreaConfiguration>('g.kchart-spec-area-label')
        .data(areas.filter((item) => item.label))
        .join('g')
        .attr('class', 'kchart-spec-area-label')
        .attr('transform', (item) => {
            const start = clamp(resolveScalePosition(xScale, item.start));
            const end = clamp(resolveScalePosition(xScale, item.end));
            return `translate(${start + Math.max(0, end - start) / 2}, -14)`;
        })
        .style('pointer-events', 'none');

    labels.selectAll<SVGRectElement, KChartSpecAreaConfiguration>('rect')
        .data((item) => [item])
        .join('rect')
        .attr('x', (item) => -Math.max(46, (item.label?.length ?? 0) * 6.5) / 2)
        .attr('y', -11)
        .attr('width', (item) => Math.max(46, (item.label?.length ?? 0) * 6.5))
        .attr('height', 18)
        .attr('rx', 5)
        .style('fill', 'rgba(10, 14, 20, 0.82)')
        .style('stroke', 'rgba(248, 251, 255, 0.22)')
        .style('stroke-width', 1);

    labels.selectAll<SVGTextElement, KChartSpecAreaConfiguration>('text')
        .data((item) => [item])
        .join('text')
        .attr('x', 0)
        .attr('y', 2)
        .style('fill', '#b6c4cf')
        .style('font-size', '11px')
        .style('font-weight', 700)
        .style('text-anchor', 'middle')
        .text((item) => item.label ?? '');
};

const getFixedGuideLines = <T = any>(state: KChartState<T>): KChartFixedGuideLine[] => {
    const config = state.config.guideLines;
    if (config?.visible === false) {
        return [];
    }

    return [
        ...(config?.x ?? []).map((item) => ({ ...item, axis: 'x' as const })),
        ...(config?.y ?? []).map((item) => ({ ...item, axis: 'y' as const })),
        ...(state.config.options ?? [])
            .filter((option): option is KChartGuideLineOption => option.type === 'guide-line' && option.visible !== false)
            .flatMap((option) => [
                ...(option.x ?? []).map((item) => ({ ...item, axis: 'x' as const })),
                ...(option.y ?? []).map((item) => ({ ...item, axis: 'y' as const }))
            ])
    ].filter((item) => item.visible !== false);
};

const renderGuideLines = <T = any>(state: KChartState<T>): void => {
    const guideLines = getFixedGuideLines(state);
    const guideGroup = state.layers.plotGroup.selectAll<SVGGElement, unknown>('g.kchart-fixed-guide-lines')
        .data(guideLines.length ? [undefined] : [])
        .join('g')
        .attr('class', 'kchart-fixed-guide-lines');

    if (!guideLines.length) {
        return;
    }

    const xScale = state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'bottom' || scale.placement === 'top');
    const yScale = state.scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'left' || scale.placement === 'right');
    const positioned = guideLines
        .map((item) => {
            const scale = item.axis === 'y' ? yScale : xScale;
            if (!scale) {
                return null;
            }

            const position = resolveScalePosition(scale, item.value);
            if (!Number.isFinite(position)) {
                return null;
            }

            return { ...item, position };
        })
        .filter((item): item is KChartFixedGuideLine & { axis: 'x' | 'y'; position: number } => Boolean(item));

    const guide = guideGroup.selectAll<SVGGElement, typeof positioned[number]>('g.kchart-fixed-guide-line')
        .data(positioned, (item) => `${item.axis}-${String(item.value)}-${item.label ?? ''}`)
        .join('g')
        .attr('class', (item) => `kchart-fixed-guide-line kchart-fixed-guide-line-${item.axis}`);

    guide.selectAll<SVGLineElement, typeof positioned[number]>('line')
        .data((item) => [item])
        .join('line')
        .attr('x1', (item) => item.axis === 'x' ? item.position : 0)
        .attr('x2', (item) => item.axis === 'x' ? item.position : state.plotSize.width)
        .attr('y1', (item) => item.axis === 'x' ? 0 : item.position)
        .attr('y2', (item) => item.axis === 'x' ? state.plotSize.height : item.position)
        .style('stroke', (item) => item.color ?? 'rgba(248, 251, 255, 0.46)')
        .style('stroke-width', (item) => item.width ?? 1)
        .style('stroke-dasharray', (item) => item.dasharray ?? '4 6')
        .style('shape-rendering', 'crispEdges')
        .style('pointer-events', 'none');

    const labels = guide.selectAll<SVGGElement, typeof positioned[number]>('g.kchart-fixed-guide-line-label')
        .data((item) => item.label ? [item] : [])
        .join('g')
        .attr('class', 'kchart-fixed-guide-line-label')
        .attr('transform', (item) => item.axis === 'x'
            ? `translate(${item.position}, -20)`
            : `translate(-12, ${item.position})`);

    labels.selectAll<SVGRectElement, typeof positioned[number]>('rect')
        .data((item) => [item])
        .join('rect')
        .attr('x', (item) => item.axis === 'x' ? -Math.max(28, String(item.label).length * 7 + 14) / 2 : -Math.max(28, String(item.label).length * 7 + 14))
        .attr('y', -12)
        .attr('width', (item) => Math.max(28, String(item.label).length * 7 + 14))
        .attr('height', 18)
        .attr('rx', 5)
        .style('fill', (item) => item.labelBackground ?? 'rgba(10, 14, 20, 0.84)')
        .style('stroke', (item) => item.color ?? 'rgba(248, 251, 255, 0.46)')
        .style('stroke-width', 1);

    labels.selectAll<SVGTextElement, typeof positioned[number]>('text')
        .data((item) => [item])
        .join('text')
        .attr('x', (item) => item.axis === 'x' ? 0 : -Math.max(28, String(item.label).length * 7 + 14) / 2)
        .attr('y', 1)
        .style('fill', (item) => item.labelColor ?? '#edf3f8')
        .style('font-size', '11px')
        .style('font-weight', 700)
        .style('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .text((item) => item.label ?? '');
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
        const hasSpecAreas = getSpecAreas(state).length > 0;
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

const getCursorGuide = <T = any>(state: KChartState<T>): KChartCursorGuideConfiguration | undefined => {
    const option = state.config.options?.find((item): item is KChartCursorLineOption => item.type === 'cursor-line' && item.visible !== false);
    if (option) {
        return {
            visible: option.visible ?? true,
            ...option.config
        };
    }

    return state.config.cursorGuide ?? state.config.guideLine;
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
    const cursorGuide = getCursorGuide(state);
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
    if (!enabled) {
        tooltip.style('opacity', 0);
        return;
    }

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
                tooltip.style('opacity', 0);
                return;
            }

            if (!nearest || nearest.distance > 36) {
                tooltip.style('opacity', 0);
                return;
            }

            tooltip
                .html(nearest.html ?? formatTooltip(state, nearest.data, nearest.series, nearest.color))
                .style('left', `${state.margin.left + nearest.x + 12}px`)
                .style('top', `${state.margin.top + nearest.y + 12}px`)
                .style('opacity', 1);
        })
        .on('mouseleave', () => {
            state.series.forEach((series: KChartSeries<T>) => {
                if (!state.hiddenSeries.has(series.selector)) {
                    series.clearTooltip?.(state.layers);
                }
            });
            tooltip.style('opacity', 0);
            guideLine.style('opacity', 0);
            guideMarkerGroup.style('opacity', 0);
            guideAxisLabel.style('opacity', 0);
        });
};

const renderSeries = <T = any>(state: KChartState<T>): void => {
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
            seriesIndex: index
        });
    });
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
    renderSeries(state);
    renderLegend(state);
    renderTooltip(state);
    renderZoom(state);
};

export const createCustomSeries = <T = any>(
    series: KChartSeries<T>
): KChartSeries<T> => series;

export const createSpecAreaOption = (
    areas: KChartSpecAreaConfiguration[],
    config: Pick<KChartSpecAreaOption, 'visible'> = {}
): KChartSpecAreaOption => ({
    type: 'spec-area',
    ...config,
    areas
});

export const createGuideLineOption = (
    config: Omit<KChartGuideLineOption, 'type'>
): KChartGuideLineOption => ({
    type: 'guide-line',
    ...config
});

export const createCursorLineOption = (
    config: KChartCursorGuideConfiguration = {}
): KChartCursorLineOption => ({
    type: 'cursor-line',
    visible: config.visible ?? true,
    config
});

export const createLineSeries = <T = any>(
    configuration: KChartLineSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    downsample: configuration.downsample,
    render({ group, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const resolveX = (point: T): number => resolveScalePosition(xScale, point[configuration.xField]);
        const resolveY = (point: T): number => resolveScalePosition(yScale, point[configuration.yField]);
        const line = d3Line<T>()
            .defined((point: T) => point[configuration.xField] !== undefined && point[configuration.yField] !== undefined)
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

        const dotOption = typeof configuration.dot === 'object' ? configuration.dot : {};
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

export const createCanvasLineSeries = <T = any>(
    configuration: KChartCanvasLineSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    downsample: configuration.downsample,
    render({ getCanvas, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getCanvas(configuration.canvasName ?? configuration.selector);
        const canvasSize = resolveCanvasPixelSize(canvas);
        const points = resolveLinePoints(data, xScale, yScale, configuration.xField, configuration.yField);
        if (renderLineWithWorker(canvas, '2d', configuration.asyncRender, {
            width: canvasSize.width,
            height: canvasSize.height,
            color: configuration.color ?? color,
            lineWidth: configuration.lineWidth ?? 2,
            points
        })) {
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        let hasPoint = false;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.beginPath();
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = configuration.lineWidth ?? 2;
        context.strokeStyle = configuration.color ?? color;

        data.forEach((point: T) => {
            if (point[configuration.xField] === undefined || point[configuration.yField] === undefined) {
                return;
            }

            const x = resolveScalePosition(xScale, point[configuration.xField]);
            const y = resolveScalePosition(yScale, point[configuration.yField]);

            if (!hasPoint) {
                context.moveTo(x, y);
                hasPoint = true;
                return;
            }

            context.lineTo(x, y);
        });

        context.stroke();
    },
    destroy({ svg }) {
        destroyCanvasByClass(svg, `kchart-2d-canvas-${configuration.canvasName ?? configuration.selector}`);
    }
});

export const createCanvasPointSeries = <T = any>(
    configuration: KChartCanvasPointSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    render({ getCanvas, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getCanvas(configuration.canvasName ?? configuration.selector);
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = configuration.fill ?? configuration.color ?? color;
        context.strokeStyle = configuration.stroke ?? 'rgba(255, 255, 255, 0.78)';
        context.lineWidth = configuration.strokeWidth ?? 1.5;

        data.forEach((point: T) => {
            if (point[configuration.xField] === undefined || point[configuration.yField] === undefined) {
                return;
            }

            const radius = typeof configuration.radius === 'function'
                ? configuration.radius(point)
                : configuration.radius ?? 3;

            context.beginPath();
            context.arc(
                resolveScalePosition(xScale, point[configuration.xField]),
                resolveScalePosition(yScale, point[configuration.yField]),
                radius,
                0,
                Math.PI * 2
            );
            context.fill();
            context.stroke();
        });
    },
    destroy({ svg }) {
        destroyCanvasByClass(svg, `kchart-2d-canvas-${configuration.canvasName ?? configuration.selector}`);
    }
});

export const createCanvasCandlestickSeries = <T = any>(
    configuration: KChartCanvasCandlestickSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.closeField,
    color: configuration.neutralColor,
    render({ getCanvas, data, xScale, yScale, color, plotSize }) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getCanvas(configuration.canvasName ?? configuration.selector);
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        const candleWidth = resolveCanvasCandlestickWidth(data, xScale, configuration.xField, plotSize, configuration);
        const halfWidth = candleWidth / 2;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = configuration.strokeWidth ?? 1.4;

        data.forEach((point: T, index: number) => {
            const open = Number(point[configuration.openField]);
            const high = Number(point[configuration.highField]);
            const low = Number(point[configuration.lowField]);
            const close = Number(point[configuration.closeField]);

            if (![open, high, low, close].every(Number.isFinite) || point[configuration.xField] === undefined) {
                return;
            }

            const x = resolveScalePosition(xScale, point[configuration.xField]);
            const openY = resolveScalePosition(yScale, open);
            const highY = resolveScalePosition(yScale, high);
            const lowY = resolveScalePosition(yScale, low);
            const closeY = resolveScalePosition(yScale, close);

            if (![x, openY, highY, lowY, closeY].every(Number.isFinite)) {
                return;
            }

            const candleColor = resolveCandlestickColor(point, data[index - 1], configuration, color);
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

            context.strokeStyle = configuration.wickColor ?? candleColor;
            context.beginPath();
            context.moveTo(x, highY);
            context.lineTo(x, lowY);
            context.stroke();

            context.fillStyle = candleColor;
            context.strokeStyle = configuration.borderColor ?? candleColor;
            context.beginPath();
            context.rect(x - halfWidth, bodyTop, candleWidth, bodyHeight);
            context.fill();
            context.stroke();
        });
    },
    tooltip({ data, scales, mouseX, mouseY, color, plotSize }) {
        const xScale = scales.find((scale: KChartResolvedScale<T>) => scale.field === configuration.xField);
        const yScale = scales.find((scale: KChartResolvedScale<T>) => scale.field === configuration.closeField)
            ?? scales.find((scale: KChartResolvedScale<T>) => scale.placement === 'left' || scale.placement === 'right');
        if (!xScale || !yScale) {
            return null;
        }

        const candleWidth = resolveCanvasCandlestickWidth(data, xScale, configuration.xField, plotSize, configuration);
        const hitRadius = Math.max(candleWidth * 0.7, 14);
        let nearest: {
            data: T;
            previousData?: T;
            x: number;
            y: number;
            distance: number;
        } | null = null;

        data.forEach((point: T, index: number) => {
            if (point[configuration.xField] === undefined || point[configuration.closeField] === undefined) {
                return;
            }

            const x = resolveScalePosition(xScale, point[configuration.xField]);
            const y = resolveScalePosition(yScale, point[configuration.closeField]);
            const distance = Math.abs(mouseX - x);

            if (!Number.isFinite(x) || !Number.isFinite(y) || distance > hitRadius) {
                return;
            }

            const verticalDistance = Math.abs(mouseY - y);
            const totalDistance = distance + verticalDistance * 0.08;

            if (!nearest || totalDistance < nearest.distance) {
                nearest = {
                    data: point,
                    previousData: data[index - 1],
                    x,
                    y,
                    distance: totalDistance
                };
            }
        });

        if (!nearest) {
            return null;
        }

        const point = nearest.data;
        const candleColor = resolveCandlestickColor(point, nearest.previousData, configuration, color);
        const label = configuration.displayName ?? configuration.selector;
        const xValue = String(point[configuration.xField]);
        const previousClose = configuration.previousCloseField
            ? point[configuration.previousCloseField]
            : nearest.previousData?.[configuration.closeField];

        return {
            data: point,
            x: nearest.x,
            y: nearest.y,
            color: candleColor,
            distance: nearest.distance,
            html: [
                `<strong style="color:${candleColor}">${label}</strong>`,
                `x: ${xValue}`,
                configuration.colorMode === 'previous-close'
                    ? `previous close: ${formatCandlestickTooltipValue(previousClose)}`
                    : '',
                `open: ${formatCandlestickTooltipValue(point[configuration.openField])}`,
                `high: ${formatCandlestickTooltipValue(point[configuration.highField])}`,
                `low: ${formatCandlestickTooltipValue(point[configuration.lowField])}`,
                `close: ${formatCandlestickTooltipValue(point[configuration.closeField])}`
            ].filter(Boolean).join('<br/>')
        };
    },
    destroy({ svg }) {
        destroyCanvasByClass(svg, `kchart-2d-canvas-${configuration.canvasName ?? configuration.selector}`);
    }
});

export const createSvgGlobeSeries = <T = any>(
    configuration: KChartSvgGlobeSeriesConfiguration<T>
): KChartSeries<T> => {
    let rotation = normalizeGlobeRotation(configuration.initialRotate);
    let zoomLevel = 1;
    let dragging = false;
    let dragStart: [number, number] = [0, 0];
    let rotationStart: [number, number, number] = [...rotation];
    const activePointers = new Map<number, [number, number]>();
    let pinchStartDistance = 0;
    let pinchStartZoom = 1;
    let viewMode: 'globe' | 'map' = 'globe';
    let focusedPoint: { data: T; lat: number; lon: number; projected: [number, number] } | undefined;
    let drilldownRestoreState: { rotation: [number, number, number]; zoomLevel: number } | undefined;
    let warpEffect: { x: number; y: number; startedAt: number } | undefined;

    return createCustomSeries<T>({
        selector: configuration.selector,
        displayName: configuration.displayName,
        xField: configuration.lonField,
        yField: configuration.latField,
        color: typeof configuration.markerColor === 'string' ? configuration.markerColor : undefined,
        render({ group, data, size, plotSize, margin, color }) {
            const width = plotSize.width;
            const height = plotSize.height;
            const centerX = width / 2;
            const centerY = height / 2;
            const zoomConfiguration = resolveGlobeZoomConfiguration(configuration.zoom);
            const minZoom = Math.min(zoomConfiguration.min, zoomConfiguration.max);
            const maxZoom = Math.max(zoomConfiguration.min, zoomConfiguration.max);
            const zoomControlsConfiguration = resolveGlobeZoomControlsConfiguration(zoomConfiguration.controls);
            const drilldownConfiguration = resolveGlobeDrilldownConfiguration(configuration.drilldown);
            zoomLevel = clampNumber(zoomLevel, minZoom, maxZoom);
            const baseScale = Math.max(1, Math.min(width, height) / 2 * (configuration.globeScale ?? 0.88));
            const globeProjection = geoOrthographic()
                .translate([centerX, centerY])
                .scale(baseScale * zoomLevel)
                .rotate(rotation)
                .clipAngle(90);
            const mapProjection = geoMercator()
                .translate([centerX, centerY])
                .scale(Math.max(1, Math.min(width, height) / Math.PI * drilldownConfiguration.zoomScale * zoomLevel))
                .center(focusedPoint ? [focusedPoint.lon, focusedPoint.lat] : [0, 0]);
            const path = geoPath(globeProjection);
            const mapPath = geoPath(mapProjection);
            const getFirstTwoPointerDistance = (): number => {
                const points = Array.from(activePointers.values());
                if (points.length < 2) {
                    return 0;
                }
                const dx = points[0][0] - points[1][0];
                const dy = points[0][1] - points[1][1];
                return Math.hypot(dx, dy);
            };
            const applyGlobeZoom = (nextZoom: number): void => {
                zoomLevel = clampNumber(nextZoom, minZoom, maxZoom);
                draw();
            };
            const enterDrilldown = (datum: {
                data: T;
                lat: number;
                lon: number;
                projected: [number, number];
            }): void => {
                if (!drilldownConfiguration.enabled) {
                    return;
                }
                if (!focusedPoint) {
                    drilldownRestoreState = {
                        rotation: [...rotation],
                        zoomLevel
                    };
                }
                focusedPoint = datum;
                if (drilldownConfiguration.mode === 'zoom') {
                    viewMode = 'globe';
                    rotation = [
                        -datum.lon,
                        -datum.lat,
                        rotation[2]
                    ];
                    zoomLevel = clampNumber(drilldownConfiguration.focusZoom, minZoom, maxZoom);
                } else {
                    viewMode = 'map';
                }
                warpEffect = {
                    x: datum.projected[0],
                    y: datum.projected[1],
                    startedAt: Date.now()
                };
                drilldownConfiguration.onEnter?.({
                    data: datum.data,
                    lat: datum.lat,
                    lon: datum.lon
                });
                globalThis.setTimeout(() => {
                    warpEffect = undefined;
                    draw();
                }, drilldownConfiguration.duration);
                draw();
            };
            const exitDrilldown = (): void => {
                if (viewMode === 'globe' && !focusedPoint) {
                    return;
                }
                viewMode = 'globe';
                focusedPoint = undefined;
                if (drilldownRestoreState) {
                    rotation = [...drilldownRestoreState.rotation];
                    zoomLevel = clampNumber(drilldownRestoreState.zoomLevel, minZoom, maxZoom);
                    drilldownRestoreState = undefined;
                }
                warpEffect = undefined;
                drilldownConfiguration.onExit?.();
                draw();
            };

            const draw = (): void => {
                globeProjection.rotate(rotation);
                globeProjection.scale(baseScale * zoomLevel);
                if (focusedPoint) {
                    mapProjection.center([focusedPoint.lon, focusedPoint.lat]);
                }
                mapProjection.scale(Math.max(1, Math.min(width, height) / Math.PI * drilldownConfiguration.zoomScale * zoomLevel));

                const globeGroup = group.selectAll<SVGGElement, unknown>('g.kchart-globe-layer')
                    .data([undefined])
                    .join('g')
                    .attr('class', 'kchart-globe-layer')
                    .style('cursor', configuration.draggable === false || viewMode === 'map' ? 'default' : dragging ? 'grabbing' : 'grab')
                    .style('touch-action', configuration.draggable === false && !zoomConfiguration.enabled ? null : 'none');

                globeGroup.selectAll<SVGPathElement, unknown>('path.kchart-globe-sphere')
                    .data(viewMode === 'globe' ? [{ type: 'Sphere' }] : [])
                    .join('path')
                    .attr('class', 'kchart-globe-sphere')
                    .attr('d', (datum: any) => path(datum) ?? '')
                    .style('fill', configuration.sphereFill ?? 'rgba(15, 23, 42, 0.92)')
                    .style('stroke', configuration.sphereStroke ?? 'rgba(148, 163, 184, 0.62)')
                    .style('stroke-width', 1.2)
                    .style('pointer-events', 'all');

                const defaultLandGeoJson = configuration.landMode === 'countries'
                    ? WORLD_COUNTRY_GEOJSON
                    : WORLD_LAND_GEOJSON;
                const landData = configuration.landVisible === false
                    ? []
                    : normalizeGlobeLandFeatures(configuration.landGeoJson ?? defaultLandGeoJson);
                const activePath = viewMode === 'map' ? mapPath : path;
                const activeLandFill = viewMode === 'map'
                    ? drilldownConfiguration.landFill ?? configuration.landFill
                    : configuration.landFill;
                const activeLandStroke = viewMode === 'map'
                    ? drilldownConfiguration.landStroke ?? configuration.landStroke
                    : configuration.landStroke;
                const activeLandOpacity = viewMode === 'map'
                    ? drilldownConfiguration.landOpacity ?? configuration.landOpacity
                    : configuration.landOpacity;

                globeGroup.selectAll<SVGRectElement, unknown>('rect.kchart-globe-map-background')
                    .data(viewMode === 'map' ? [undefined] : [])
                    .join('rect')
                    .attr('class', 'kchart-globe-map-background')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('width', width)
                    .attr('height', height)
                    .style('fill', configuration.sphereFill ?? 'rgba(15, 23, 42, 0.92)')
                    .style('pointer-events', 'all');

                globeGroup.selectAll<SVGPathElement, any>('path.kchart-globe-land')
                    .data(landData)
                    .join('path')
                    .attr('class', 'kchart-globe-land')
                    .attr('d', (datum: any) => activePath(datum) ?? '')
                    .style('fill', (datum, index) => resolveGlobeLandStyle(activeLandFill, datum, index, '#2dd4bf'))
                    .style('fill-opacity', (datum, index) => resolveGlobeLandOpacity(activeLandOpacity, datum, index))
                    .style('stroke', (datum, index) => resolveGlobeLandStyle(activeLandStroke, datum, index, 'rgba(236, 253, 245, 0.9)'))
                    .style('stroke-width', 1)
                    .style('pointer-events', 'none');

                globeGroup.selectAll<SVGPathElement, any>('path.kchart-globe-country-borders')
                    .data(configuration.countryBordersVisible === false || configuration.landVisible === false ? [] : [WORLD_COUNTRY_BORDERS_GEOJSON])
                    .join('path')
                    .attr('class', 'kchart-globe-country-borders')
                    .attr('d', (datum: any) => activePath(datum) ?? '')
                    .style('fill', 'none')
                    .style('stroke', configuration.countryBordersStroke ?? 'rgba(236, 253, 245, 0.26)')
                    .style('stroke-width', configuration.countryBordersStrokeWidth ?? 0.55)
                    .style('pointer-events', 'none');

                globeGroup.selectAll<SVGPathElement, unknown>('path.kchart-globe-graticule')
                    .data(configuration.graticuleVisible === false ? [] : [geoGraticule10()])
                    .join('path')
                    .attr('class', 'kchart-globe-graticule')
                    .attr('d', (datum: any) => activePath(datum) ?? '')
                    .style('fill', 'none')
                    .style('stroke', configuration.graticuleStroke ?? 'rgba(148, 163, 184, 0.22)')
                    .style('stroke-width', 0.8)
                    .style('pointer-events', 'none');

                const markerData = data.map((point) => {
                    const lat = resolveGlobePointValue(point, configuration.latField);
                    const lon = resolveGlobePointValue(point, configuration.lonField);
                    const projected = viewMode === 'map'
                        ? mapProjection([lon, lat])
                        : globeProjection([lon, lat]);
                    return {
                        data: point,
                        lat,
                        lon,
                        projected,
                        visible: Boolean(projected) && (
                            viewMode === 'map'
                                ? true
                                : isGlobePointVisible(lon, lat, rotation)
                        )
                    };
                }).filter((point) => point.visible && point.projected) as Array<{
                    data: T;
                    lat: number;
                    lon: number;
                    projected: [number, number];
                    visible: boolean;
                }>;

                const markers = globeGroup.selectAll<SVGCircleElement, typeof markerData[number]>('circle.kchart-globe-marker')
                    .data(markerData, (datum: any) => String(configuration.labelField ? datum.data[configuration.labelField] : `${datum.lat},${datum.lon}`));

                markers.exit().remove();

                markers.enter()
                    .append('circle')
                    .attr('class', 'kchart-globe-marker')
                    .style('cursor', configuration.onMarkerClick || drilldownConfiguration.enabled ? 'pointer' : 'default')
                    .style('pointer-events', 'all')
                    .merge(markers as any)
                    .attr('cx', (datum) => datum.projected[0])
                    .attr('cy', (datum) => datum.projected[1])
                    .attr('r', (datum) => resolveGlobeMarkerRadius(datum.data, configuration))
                    .style('fill', (datum) => resolveGlobeMarkerColor(datum.data, configuration, color))
                    .style('stroke', configuration.markerStroke ?? 'rgba(248, 251, 255, 0.92)')
                    .style('stroke-width', configuration.markerStrokeWidth ?? 1.4)
                    .style('opacity', configuration.markerOpacity ?? 0.95)
                    .on('click', (event: MouseEvent, datum) => {
                        if (!configuration.onMarkerClick && !drilldownConfiguration.enabled) {
                            return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        enterDrilldown(datum);
                        configuration.onMarkerClick?.({
                            data: datum.data,
                            event,
                            lat: datum.lat,
                            lon: datum.lon,
                            x: datum.projected[0],
                            y: datum.projected[1]
                        });
                    });

                const labels = globeGroup.selectAll<SVGTextElement, typeof markerData[number]>('text.kchart-globe-marker-label')
                    .data(configuration.labelField ? markerData : [], (datum: any) => String(datum.data[configuration.labelField as keyof T & string]));

                labels.exit().remove();

                labels.enter()
                    .append('text')
                    .attr('class', 'kchart-globe-marker-label')
                    .style('pointer-events', 'none')
                    .merge(labels as any)
                    .attr('x', (datum) => datum.projected[0] + resolveGlobeMarkerRadius(datum.data, configuration) + 5)
                    .attr('y', (datum) => datum.projected[1] + 4)
                    .style('fill', 'rgba(248, 251, 255, 0.82)')
                    .style('font-size', '11px')
                    .style('font-weight', 700)
                    .text((datum) => String(datum.data[configuration.labelField as keyof T & string]));

                const warpData = warpEffect
                    ? [0, 1, 2].map((index) => ({...warpEffect, index}))
                    : [];
                const warpRings = globeGroup.selectAll<SVGCircleElement, typeof warpData[number]>('circle.kchart-globe-warp-ring')
                    .data(warpData, (datum: any) => datum.index);

                warpRings.exit().remove();

                warpRings.enter()
                    .append('circle')
                    .attr('class', 'kchart-globe-warp-ring')
                    .style('fill', 'none')
                    .style('pointer-events', 'none')
                    .merge(warpRings as any)
                    .attr('cx', (datum) => datum.x)
                    .attr('cy', (datum) => datum.y)
                    .attr('r', (datum) => 24 + datum.index * 42)
                    .style('stroke', (datum) => datum.index === 0 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(93, 184, 255, 0.62)')
                    .style('stroke-width', (datum) => 1.8 - datum.index * 0.35)
                    .style('stroke-dasharray', (datum) => datum.index === 0 ? 'none' : '6 10')
                    .style('opacity', (datum) => Math.max(0, 0.88 - datum.index * 0.2));

                const warpLines = globeGroup.selectAll<SVGLineElement, number>('line.kchart-globe-warp-line')
                    .data(warpEffect ? Array.from({length: 18}, (_, index) => index) : []);

                warpLines.exit().remove();

                warpLines.enter()
                    .append('line')
                    .attr('class', 'kchart-globe-warp-line')
                    .style('stroke', 'rgba(248, 251, 255, 0.5)')
                    .style('stroke-width', 1)
                    .style('pointer-events', 'none')
                    .merge(warpLines as any)
                    .attr('x1', (index) => (warpEffect?.x ?? centerX) + Math.cos(index / 18 * Math.PI * 2) * 18)
                    .attr('y1', (index) => (warpEffect?.y ?? centerY) + Math.sin(index / 18 * Math.PI * 2) * 18)
                    .attr('x2', (index) => (warpEffect?.x ?? centerX) + Math.cos(index / 18 * Math.PI * 2) * Math.max(width, height))
                    .attr('y2', (index) => (warpEffect?.y ?? centerY) + Math.sin(index / 18 * Math.PI * 2) * Math.max(width, height))
                    .style('opacity', 0.38);

                const zoomControlsVisible = zoomConfiguration.enabled && zoomControlsConfiguration.visible;
                const drilldownResetVisible = Boolean(focusedPoint) && drilldownConfiguration.resetControl;
                const controlsVisible = zoomControlsVisible || drilldownResetVisible;
                const controlsX = Math.max(
                    -margin.left,
                    size.width - margin.left - zoomControlsConfiguration.x - 34
                );
                const controlsY = Math.max(-margin.top, zoomControlsConfiguration.y - margin.top);
                const controlItems = [
                    ...(zoomControlsVisible ? [
                        { key: 'in', label: '+', title: 'Zoom in' },
                        { key: 'reset', label: `${Math.round(zoomLevel * 100)}%`, title: 'Reset zoom' },
                        { key: 'out', label: '-', title: 'Zoom out' }
                    ] : []),
                    ...(drilldownResetVisible ? [
                        { key: 'globe', label: 'G', title: 'Back to globe' }
                    ] : [])
                ].map((item, index) => ({...item, y: index * 31}));
                const zoomControls = globeGroup.selectAll<SVGGElement, unknown>('g.kchart-globe-zoom-controls')
                    .data(controlsVisible ? [undefined] : []);

                zoomControls.exit().remove();

                const zoomControlsEnter = zoomControls.enter()
                    .append('g')
                    .attr('class', 'kchart-globe-zoom-controls')
                    .style('pointer-events', 'all');

                const zoomControlsMerged = zoomControlsEnter
                    .merge(zoomControls as any)
                    .attr('transform', `translate(${controlsX},${controlsY})`);

                const controlButtons = zoomControlsMerged.selectAll<SVGGElement, typeof controlItems[number]>('g.kchart-globe-zoom-control')
                    .data(controlItems, (datum: any) => datum.key);

                controlButtons.exit().remove();

                const controlButtonsEnter = controlButtons.enter()
                    .append('g')
                    .attr('class', 'kchart-globe-zoom-control')
                    .style('cursor', 'pointer')
                    .on('pointerdown', (event: PointerEvent) => {
                        event.preventDefault();
                        event.stopPropagation();
                    })
                    .on('click', (event: MouseEvent, datum) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (datum.key === 'in') {
                            applyGlobeZoom(zoomLevel * (1 + zoomControlsConfiguration.step));
                            return;
                        }
                        if (datum.key === 'out') {
                            applyGlobeZoom(zoomLevel / (1 + zoomControlsConfiguration.step));
                            return;
                        }
                        if (datum.key === 'globe') {
                            exitDrilldown();
                            return;
                        }
                        applyGlobeZoom(1);
                    });

                controlButtonsEnter.append('rect')
                    .attr('class', 'kchart-globe-zoom-control-bg')
                    .attr('width', 34)
                    .attr('height', 27)
                    .attr('rx', 6);

                controlButtonsEnter.append('text')
                    .attr('class', 'kchart-globe-zoom-control-label')
                    .attr('x', 17)
                    .attr('y', 18)
                    .attr('text-anchor', 'middle');

                controlButtonsEnter.append('title');

                const controlButtonsMerged = controlButtonsEnter.merge(controlButtons as any)
                    .attr('transform', (datum) => `translate(0,${datum.y})`)
                    .style('opacity', (datum) => {
                        if (datum.key === 'in' && zoomLevel >= maxZoom) return 0.48;
                        if (datum.key === 'out' && zoomLevel <= minZoom) return 0.48;
                        return 1;
                    });

                controlButtonsMerged.select('rect.kchart-globe-zoom-control-bg')
                    .style('fill', 'rgba(15, 23, 42, 0.72)')
                    .style('stroke', 'rgba(226, 232, 240, 0.42)')
                    .style('stroke-width', 1);

                controlButtonsMerged.select('text.kchart-globe-zoom-control-label')
                    .style('fill', 'rgba(248, 251, 255, 0.92)')
                    .style('font-size', (datum) => datum.key === 'reset' ? '10px' : '17px')
                    .style('font-weight', 800)
                    .text((datum) => datum.label);

                controlButtonsMerged.select('title')
                    .text((datum) => datum.title);
            };

            draw();

            const globeLayer = group.select<SVGGElement>('g.kchart-globe-layer');
            globeLayer.on('.kchart-globe-drag', null);
            globeLayer.on('.kchart-globe-zoom', null);

            if (zoomConfiguration.enabled && zoomConfiguration.wheel) {
                globeLayer.on('wheel.kchart-globe-zoom', (event: WheelEvent) => {
                    event.preventDefault();
                    const zoomDelta = Math.exp(-event.deltaY * zoomConfiguration.wheelSensitivity);
                    zoomLevel = clampNumber(zoomLevel * zoomDelta, minZoom, maxZoom);
                    draw();
                });
            }

            if (configuration.draggable !== false || (zoomConfiguration.enabled && zoomConfiguration.pinch)) {
                globeLayer
                    .on('pointerdown.kchart-globe-drag', (event: PointerEvent) => {
                        const currentPoint = pointer(event, group.node() as any) as [number, number];
                        if (zoomConfiguration.enabled && zoomConfiguration.pinch) {
                            activePointers.set(event.pointerId, currentPoint);
                        }
                        if (zoomConfiguration.enabled && zoomConfiguration.pinch && activePointers.size >= 2) {
                            dragging = false;
                            pinchStartDistance = getFirstTwoPointerDistance();
                            pinchStartZoom = zoomLevel;
                        } else if (configuration.draggable !== false && viewMode === 'globe') {
                            dragging = true;
                            dragStart = currentPoint;
                            rotationStart = [...rotation];
                        }
                        (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
                        event.preventDefault();
                        draw();
                    })
                    .on('pointermove.kchart-globe-drag', (event: PointerEvent) => {
                        if (zoomConfiguration.enabled && zoomConfiguration.pinch && activePointers.has(event.pointerId)) {
                            activePointers.set(event.pointerId, pointer(event, group.node() as any) as [number, number]);
                        }
                        if (zoomConfiguration.enabled && zoomConfiguration.pinch && activePointers.size >= 2) {
                            const distance = getFirstTwoPointerDistance();
                            if (pinchStartDistance > 0 && distance > 0) {
                                zoomLevel = clampNumber(pinchStartZoom * distance / pinchStartDistance, minZoom, maxZoom);
                                draw();
                            }
                            event.preventDefault();
                            return;
                        }
                        if (!dragging) {
                            return;
                        }
                        const [mouseX, mouseY] = pointer(event, group.node() as any);
                        const dx = mouseX - dragStart[0];
                        const dy = mouseY - dragStart[1];
                        rotation = [
                            rotationStart[0] + dx / Math.max(width, 1) * 360,
                            clampNumber(rotationStart[1] - dy / Math.max(height, 1) * 180, -89, 89),
                            rotationStart[2]
                        ];
                        event.preventDefault();
                        draw();
                    })
                    .on('pointerup.kchart-globe-drag pointercancel.kchart-globe-drag', (event: PointerEvent) => {
                        activePointers.delete(event.pointerId);
                        if (activePointers.size < 2) {
                            pinchStartDistance = 0;
                            pinchStartZoom = zoomLevel;
                        }
                        dragging = false;
                        (event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
                        draw();
                    });
            }
        },
        destroy({ plotGroup }) {
            plotGroup.selectAll(`g.series-${configuration.selector} g.kchart-globe-layer`).on('.kchart-globe-drag', null);
            plotGroup.selectAll(`g.series-${configuration.selector} g.kchart-globe-layer`).on('.kchart-globe-zoom', null);
        }
    });
};

export const createWebglPointSeries = <T = any>(
    configuration: KChartWebglPointSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    render({ getWebglCanvas, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getWebglCanvas(configuration.canvasName ?? configuration.selector);
        const gl = canvas.getContext('webgl', { alpha: true });
        if (!gl) {
            return;
        }

        const vertexSource = `
            attribute vec2 a_position;
            attribute float a_size;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                gl_PointSize = a_size;
            }
        `;
        const fragmentSource = `
            precision mediump float;
            uniform vec4 u_color;

            void main() {
                vec2 point = gl_PointCoord - vec2(0.5);
                if (length(point) > 0.5) {
                    discard;
                }
                gl_FragColor = u_color;
            }
        `;
        const program = createProgram(gl, vertexSource, fragmentSource);
        if (!program) {
            return;
        }

        const { buffer, count } = resolveWebglPointInterleavedData(
            data,
            xScale,
            yScale,
            configuration.xField,
            configuration.yField,
            canvas.width,
            canvas.height,
            (point: T) => typeof configuration.pointSize === 'function'
                ? configuration.pointSize(point)
                : configuration.pointSize ?? 8
        );

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const interleavedBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, interleavedBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
        const stride = 3 * Float32Array.BYTES_PER_ELEMENT;
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

        const sizeLocation = gl.getAttribLocation(program, 'a_size');
        gl.enableVertexAttribArray(sizeLocation);
        gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

        const colorLocation = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(colorLocation, new Float32Array(parseColor(configuration.color ?? color)));
        gl.drawArrays(gl.POINTS, 0, count);
    },
    destroy({ svg }) {
        destroyCanvasByClass(svg, `kchart-webgl-canvas-${configuration.canvasName ?? configuration.selector}`);
    }
});

export const createWebglLineSeries = <T = any>(
    configuration: KChartWebglLineSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    downsample: configuration.downsample,
    render({ getWebglCanvas, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getWebglCanvas(configuration.canvasName ?? configuration.selector);
        const canvasSize = resolveCanvasPixelSize(canvas);
        const points = resolveLinePoints(data, xScale, yScale, configuration.xField, configuration.yField);
        if (renderLineWithWorker(canvas, 'webgl', configuration.asyncRender, {
            width: canvasSize.width,
            height: canvasSize.height,
            color: configuration.color ?? color,
            lineWidth: configuration.lineWidth ?? 1,
            points
        })) {
            return;
        }

        const gl = canvas.getContext('webgl', { alpha: true });
        if (!gl) {
            return;
        }

        const vertexSource = `
            attribute vec2 a_position;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        const fragmentSource = `
            precision mediump float;
            uniform vec4 u_color;

            void main() {
                gl_FragColor = u_color;
            }
        `;
        const program = createProgram(gl, vertexSource, fragmentSource);
        if (!program) {
            return;
        }

        const vertices = resolveWebglLineVertices(points, canvas.width, canvas.height);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.lineWidth(configuration.lineWidth ?? 1);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const colorLocation = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(colorLocation, new Float32Array(parseColor(configuration.color ?? color)));
        gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);
    },
    destroy({ svg }) {
        destroyCanvasByClass(svg, `kchart-webgl-canvas-${configuration.canvasName ?? configuration.selector}`);
    }
});

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
        zoomTransform: zoomIdentity
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
            state.series.forEach((series: KChartSeries<T>) => {
                if (series.destroy) {
                    series.destroy(state.layers);
                }
            });
            state.container.selectAll('.kchart-svg').remove();
            state.container.selectAll('canvas[class^="kchart-"]').remove();
        },
        getState() {
            return state;
        }
    };

    return controller;
};
