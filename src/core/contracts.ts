import type {Selection} from 'd3-selection';
import type {ZoomTransform} from 'd3-zoom';

export type KChartScaleType = 'number' | 'time' | 'string' | 'point';
export type KChartPlacement = 'top' | 'right' | 'bottom' | 'left';
export type KChartTextAlign = 'left' | 'center' | 'right';
export type KChartLegendPlacement = 'top' | 'right' | 'bottom';
export type KChartZoomDirection = 'x' | 'y' | 'xy';
export type KChartZoomMode = 'wheel' | 'select' | 'both';
export type KChartZoomInputDevice = 'pc' | 'mobile' | 'all';
export type KChartCandlestickColorMode = 'open-close' | 'previous-close';
export type KChartGlobeLandMode = 'land' | 'countries';
export type KChartAnimationEasing = 'linear' | 'easeOutCubic' | 'easeInOutCubic';
export type KChartAnimationMode = 'enter' | 'update' | 'both';

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

export interface KChartAnimationConfiguration {
    enabled?: boolean;
    duration?: number;
    easing?: KChartAnimationEasing;
    mode?: KChartAnimationMode;
    respectReducedMotion?: boolean;
}

export interface KChartAnimationContext {
    enabled: boolean;
    progress: number;
    elapsed: number;
    duration: number;
    easing: KChartAnimationEasing;
    mode: KChartAnimationMode;
    phase: 'enter' | 'update';
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
    animation: KChartAnimationContext;
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
    exit: () => void;
}

export type KChartGlobeDrilldownMode = 'map' | 'zoom' | 'external-map';

export type KChartGlobeTransitionType = 'warp' | 'cloud' | 'none';

export interface KChartGlobeTransitionConfiguration {
    type?: KChartGlobeTransitionType;
    duration?: number;
    coverDuration?: number;
    revealDuration?: number;
    respectReducedMotion?: boolean;
    color?: string;
    density?: number;
    blur?: number;
}

export interface KChartGlobeDrilldownConfiguration<T = any> {
    enabled?: boolean;
    mode?: KChartGlobeDrilldownMode;
    autoMapOnZoom?: boolean;
    mapZoomThreshold?: number;
    globeZoomThreshold?: number;
    focusZoom?: number;
    zoomScale?: number;
    duration?: number;
    transition?: KChartGlobeTransitionType | KChartGlobeTransitionConfiguration;
    resetControl?: boolean;
    landFill?: string | ((feature: any, index: number) => string);
    landStroke?: string | ((feature: any, index: number) => string);
    landOpacity?: number | ((feature: any, index: number) => number);
    onEnter?: (context: KChartGlobeDrilldownContext<T>) => void | Promise<void>;
    onExit?: () => void | Promise<void>;
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

export interface KChartGeoRegionMapContext<T = any> {
    feature: any;
    data?: T;
    index: number;
    key: string;
    label: string;
    value?: any;
}

export interface KChartGeoRegionMapClickContext<T = any> extends KChartGeoRegionMapContext<T> {
    event: MouseEvent;
}

export interface KChartGeoRegionMapLabelConfiguration<T = any> {
    visible?: boolean;
    mode?: 'centroid' | 'callout';
    formatter?: (context: KChartGeoRegionMapContext<T>) => string;
    fill?: string;
    fontSize?: number;
    fontWeight?: number | string;
    stroke?: string;
    strokeWidth?: number;
    calloutStroke?: string;
    calloutOpacity?: number;
    side?: 'auto' | 'left' | 'right';
    offset?: number;
}

export interface KChartGeoRegionMapZoomControlsConfiguration {
    visible?: boolean;
    x?: number;
    y?: number;
    step?: number;
}

export interface KChartGeoRegionMapZoomConfiguration {
    enabled?: boolean;
    wheel?: boolean;
    pan?: boolean;
    controls?: boolean | KChartGeoRegionMapZoomControlsConfiguration;
    scaleExtent?: [number, number];
}

export interface KChartGeoRegionMapSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    geoJson?: any | any[];
    topoObjectName?: string;
    dataKey?: keyof T & string;
    featureKey?: string | ((feature: any) => string);
    labelKey?: string | ((feature: any) => string);
    valueField?: keyof T & string;
    colorField?: keyof T & string;
    fitPadding?: number;
    backgroundFill?: string;
    fill?: string | ((context: KChartGeoRegionMapContext<T>) => string);
    missingFill?: string;
    stroke?: string | ((context: KChartGeoRegionMapContext<T>) => string);
    strokeWidth?: number;
    opacity?: number | ((context: KChartGeoRegionMapContext<T>) => number);
    hoverFill?: string | ((context: KChartGeoRegionMapContext<T>) => string);
    hoverStroke?: string;
    hoverStrokeWidth?: number;
    zoom?: boolean | KChartGeoRegionMapZoomConfiguration;
    labels?: boolean | KChartGeoRegionMapLabelConfiguration<T>;
    tooltip?: boolean | {
        formatter?: (context: KChartGeoRegionMapContext<T>) => string;
    };
    onRegionClick?: (context: KChartGeoRegionMapClickContext<T>) => void;
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

export interface KChartTooltipNote<T = any> {
    id: string;
    seriesSelector: string;
    seriesName: string;
    x: number;
    y: number;
    position?: {
        left: number;
        top: number;
    };
    color: string;
    html: string;
    note: string;
    data: T;
}

export interface KChartTooltipNoteConfiguration<T = any> {
    enabled?: boolean;
    maxNotes?: number;
    pinButtonLabel?: string;
    notePlaceholder?: string;
    onChange?: (notes: KChartTooltipNote<T>[]) => void;
}

export interface KChartTooltipNoteOption<T = any> {
    type: 'tooltip-note';
    visible?: boolean;
    config?: KChartTooltipNoteConfiguration<T>;
}

export type KChartOption<T = any> =
    | KChartSpecAreaOption
    | KChartGuideLineOption
    | KChartCursorLineOption
    | KChartTooltipNoteOption<T>;

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
    options?: KChartOption<T>[];
    animation?: boolean | KChartAnimationConfiguration;
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
    animationFrame?: number;
    animationRenderId: number;
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
