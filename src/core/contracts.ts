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

export interface KChartRenderCompleteEvent {
    renderId: number;
    asyncTasks: number;
    duration: number;
    timestamp: number;
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
    registerAsyncRenderTask?: (task: Promise<void>) => void;
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
    /** Let a series receive node/link pointer events instead of the core overlay. */
    pointerEvents?: 'core' | 'series';
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

export interface KChartAreaSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    baseline?: number;
    color?: string;
    fill?: string;
    fillOpacity?: number;
    stroke?: string;
    strokeWidth?: number;
    curve?: boolean;
    downsample?: boolean | KChartDownsampleConfiguration<T>;
}

export interface KChartBarSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    color?: string;
    fill?: string | ((point: T, index: number) => string);
    opacity?: number;
    barHeight?: number;
    minBarHeight?: number;
    maxBarHeight?: number;
    radius?: number;
    baseline?: number;
}

export interface KChartGroupedColumnSegment<T = any> {
    field: keyof T & string;
    label?: string;
    color?: string;
}

export interface KChartGroupedColumnSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    segments: Array<KChartGroupedColumnSegment<T>>;
    opacity?: number;
    groupWidthRatio?: number;
    gap?: number;
    radius?: number;
    baseline?: number;
}

export interface KChartScatterSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    color?: string;
    radius?: number | ((point: T, index: number) => number);
    fill?: string | ((point: T, index: number) => string);
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
}

export interface KChartBubbleSeriesConfiguration<T = any> extends KChartScatterSeriesConfiguration<T> {
    radiusField?: keyof T & string;
    minRadius?: number;
    maxRadius?: number;
}

export interface KChartBoxPlotSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    minField: keyof T & string;
    q1Field: keyof T & string;
    medianField: keyof T & string;
    q3Field: keyof T & string;
    maxField: keyof T & string;
    outliersField?: keyof T & string;
    color?: string;
    fill?: string | ((point: T, index: number) => string);
    opacity?: number;
    boxWidthRatio?: number;
    minBoxWidth?: number;
    maxBoxWidth?: number;
    strokeWidth?: number;
}

export interface KChartHistogramSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    binStartField: keyof T & string;
    binEndField: keyof T & string;
    valueField: keyof T & string;
    color?: string;
    fill?: string | ((point: T, index: number) => string);
    opacity?: number;
    gap?: number;
    radius?: number;
    baseline?: number;
}

export interface KChartTreemapSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    labelField: keyof T & string;
    valueField: keyof T & string;
    colorField?: keyof T & string;
    color?: string;
    fill?: string | ((point: T, index: number) => string);
    opacity?: number;
    gap?: number;
    radius?: number;
    minLabelArea?: number;
    sort?: boolean;
}

export interface KChartGaugeSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    valueField: keyof T & string;
    labelField?: keyof T & string;
    min?: number;
    max?: number;
    startAngle?: number;
    endAngle?: number;
    color?: string;
    trackColor?: string;
    needleColor?: string;
    thickness?: number;
    showNeedle?: boolean;
    valueFormat?: (value: number, point: T) => string;
}

export interface KChartWaterfallSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    valueField: keyof T & string;
    totalField?: keyof T & string;
    color?: string;
    positiveColor?: string;
    negativeColor?: string;
    totalColor?: string;
    connectorColor?: string;
    connectorDasharray?: string;
    connectorWidth?: number;
    opacity?: number;
    barWidthRatio?: number;
    radius?: number;
    baseline?: number;
    labels?: boolean | {
        visible?: boolean;
        formatter?: (item: {
            point: T;
            index: number;
            start: number;
            end: number;
            delta: number;
            total: boolean;
            value: number;
        }) => string;
        color?: string;
        fontSize?: number;
        fontWeight?: number | string;
        offset?: number;
        showZero?: boolean;
    };
}

export type KChartGraphLayout = 'force' | 'circular';
export type KChartGraphRoamMode = 'move' | 'scale' | 'both' | 'disabled';
export type KChartGraphSelectMode = 'single' | 'multiple' | 'disabled';
export type KChartGraphEdgeSymbols = 'none-none' | 'none-arrow' | 'circle-circle' | 'circle-arrow';

export interface KChartGraphNode<T = any> {
    id: string;
    label: string;
    value: number;
    category?: string;
    rows: T[];
    x: number;
    y: number;
}

export interface KChartGraphEdge<T = any> {
    id: string;
    source: KChartGraphNode<T>;
    target: KChartGraphNode<T>;
    value: number;
    rows: T[];
}

export interface KChartGraphNodeInteractionContext<T = any> {
    node: KChartGraphNode<T>;
    selected: boolean;
    selectedIds: string[];
    event: MouseEvent;
}

export interface KChartGraphSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    sourceField: keyof T & string;
    targetField: keyof T & string;
    valueField: keyof T & string;
    categoryField?: keyof T & string;
    categorySide?: 'source' | 'target' | 'both';
    layout?: KChartGraphLayout;
    directed?: boolean;
    edgeSymbols?: KChartGraphEdgeSymbols;
    color?: string;
    palette?: string[];
    nodeMinRadius?: number;
    nodeMaxRadius?: number;
    nodeStroke?: string;
    nodeStrokeWidth?: number;
    nodeOpacity?: number;
    edgeColor?: string;
    edgeMinWidth?: number;
    edgeMaxWidth?: number;
    edgeOpacity?: number;
    chargeStrength?: number;
    linkDistance?: number;
    collisionPadding?: number;
    iterations?: number;
    labelThreshold?: number;
    labels?: boolean | {
        visible?: boolean;
        formatter?: (node: KChartGraphNode<T>) => string;
        color?: string;
        fontSize?: number;
        fontWeight?: number | string;
    };
    roam?: KChartGraphRoamMode;
    scaleExtent?: [number, number];
    selectMode?: KChartGraphSelectMode;
    dimOpacity?: number;
    onNodeClick?: (context: KChartGraphNodeInteractionContext<T>) => void;
}

export type KChartTreeLayout = 'orthogonal' | 'radial';
export type KChartTreeOrientation = 'left-right' | 'right-left' | 'top-bottom' | 'bottom-top';
export type KChartTreeEmphasis = 'ancestor' | 'descendant' | 'both' | 'none';
export type KChartTreeSymbol = 'circle' | 'square' | 'diamond';
export type KChartTreeLabelPosition = 'auto' | 'left' | 'right' | 'top' | 'bottom';

export interface KChartTreeNode<T = any> {
    id: string;
    parentId?: string;
    label: string;
    value: number;
    category?: string;
    row: T;
    parent?: KChartTreeNode<T>;
    children: Array<KChartTreeNode<T>>;
    depth: number;
    height: number;
    x: number;
    y: number;
}

export interface KChartTreeLink<T = any> {
    id: string;
    source: KChartTreeNode<T>;
    target: KChartTreeNode<T>;
    value: number;
    row: T;
}

export interface KChartTreeNodeClickContext<T = any> {
    node: KChartTreeNode<T>;
    event: MouseEvent;
}

export interface KChartTreeSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    idField: keyof T & string;
    parentField: keyof T & string;
    labelField?: keyof T & string;
    valueField?: keyof T & string;
    categoryField?: keyof T & string;
    layout?: KChartTreeLayout;
    orientation?: KChartTreeOrientation;
    emphasis?: KChartTreeEmphasis;
    symbol?: KChartTreeSymbol;
    symbolSize?: number | ((node: KChartTreeNode<T>) => number);
    labelPosition?: KChartTreeLabelPosition;
    roam?: KChartGraphRoamMode;
    scaleExtent?: [number, number];
    fitPadding?: number;
    color?: string;
    palette?: string[];
    nodeColor?: string | ((node: KChartTreeNode<T>, index: number) => string);
    nodeOpacity?: number;
    nodeStroke?: string;
    nodeStrokeWidth?: number;
    edgeColor?: string | ((link: KChartTreeLink<T>, index: number) => string);
    edgeOpacity?: number;
    edgeStrokeWidth?: number | ((link: KChartTreeLink<T>, index: number) => number);
    dimOpacity?: number;
    labels?: boolean | {
        visible?: boolean;
        formatter?: (node: KChartTreeNode<T>) => string;
        color?: string;
        fontSize?: number;
        fontWeight?: number | string;
        offset?: number;
    };
    onNodeClick?: (context: KChartTreeNodeClickContext<T>) => void;
}

export type KChartSankeyNodeAlign = 'left' | 'right' | 'center' | 'justify';

export interface KChartSankeyNode<T = any> {
    id: string;
    label: string;
    category?: string;
    value: number;
    rows: T[];
    x0: number;
    x1: number;
    y0: number;
    y1: number;
    depth: number;
}

export interface KChartSankeyLink<T = any> {
    id: string;
    source: KChartSankeyNode<T>;
    target: KChartSankeyNode<T>;
    value: number;
    rows: T[];
    width: number;
    y0: number;
    y1: number;
}

export interface KChartSankeyNodeClickContext<T = any> {
    node: KChartSankeyNode<T>;
    event: MouseEvent;
}

export interface KChartSankeyLinkClickContext<T = any> {
    link: KChartSankeyLink<T>;
    event: MouseEvent;
}

export interface KChartSankeySeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    sourceField: keyof T & string;
    targetField: keyof T & string;
    valueField: keyof T & string;
    categoryField?: keyof T & string;
    categorySide?: 'source' | 'target' | 'both';
    nodeAlign?: KChartSankeyNodeAlign;
    nodeWidth?: number;
    nodePadding?: number;
    iterations?: number;
    fitPadding?: number;
    labelGutter?: number;
    color?: string;
    palette?: string[];
    nodeColor?: string | ((node: KChartSankeyNode<T>, index: number) => string);
    nodeStroke?: string;
    nodeStrokeWidth?: number;
    nodeOpacity?: number;
    linkColor?: 'source' | 'target' | 'gradient' | string;
    linkOpacity?: number;
    minLinkWidth?: number;
    dimOpacity?: number;
    labels?: boolean | {
        visible?: boolean;
        formatter?: (node: KChartSankeyNode<T>) => string;
        color?: string;
        fontSize?: number;
        fontWeight?: number | string;
        offset?: number;
    };
    onNodeClick?: (context: KChartSankeyNodeClickContext<T>) => void;
    onLinkClick?: (context: KChartSankeyLinkClickContext<T>) => void;
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

export interface KChartGeoRegionMapMarkerClickContext {
    marker: KChartGeoRegionMapMarker;
    event: MouseEvent;
    x: number;
    y: number;
}

export interface KChartGeoRegionMapMarker {
    id: string;
    lat: number;
    lon: number;
    label?: string;
    size?: number;
    color?: string;
    imageUrl?: string;
    imagePadding?: number;
    stroke?: string;
    strokeWidth?: number;
    labelPosition?: 'top' | 'right' | 'bottom' | 'left';
    labelFill?: string;
    labelTextFill?: string;
    labelFontSize?: number;
    labelFontWeight?: number | string;
    labelOffset?: number;
    pin?: boolean;
    onClick?: (context: KChartGeoRegionMapMarkerClickContext) => void;
}

export interface KChartGeoRegionMapBubble {
    id: string;
    lat: number;
    lon: number;
    value?: number;
    radius?: number;
    color?: string;
    opacity?: number;
    stroke?: string;
    strokeWidth?: number;
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
    bubbles?: KChartGeoRegionMapBubble[];
    markers?: KChartGeoRegionMapMarker[];
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
    onRenderComplete?: (event: KChartRenderCompleteEvent) => void;
}

export interface KChartRenderCompletionState {
    renderId: number;
    startedAt: number;
    asyncTasks: number;
    tasks: Promise<void>[];
    promise: Promise<KChartRenderCompleteEvent>;
    resolve: (event: KChartRenderCompleteEvent) => void;
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
    renderCompletion: KChartRenderCompletionState;
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
    whenRenderComplete(): Promise<KChartRenderCompleteEvent>;
    updateData(data: T[]): KChartController<T>;
    updateAxes(axes: KChartAxis<T>[]): KChartController<T>;
    updateSeries(series: KChartSeries<T>[]): KChartController<T>;
    resize(size?: Partial<KChartSize>): KChartController<T>;
    destroy(): void;
    getState(): KChartState<T>;
}
