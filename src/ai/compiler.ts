import type {
    KChartAxis,
    KChartConfiguration,
    KChartController,
    KChartOption,
    KChartScaleType,
    KChartSeries
} from '../core';
import {createKChart} from '../core';
import {
    createCursorLineOption,
    createGuideLineOption,
    createSpecAreaOption,
    createTooltipNoteOption
} from '../options';
import {chartConfig} from '../presets';
import {
    createAreaSeries,
    createBarSeries,
    createBoxPlotSeries,
    createBubbleSeries,
    createCanvasCandlestickSeries,
    createCanvasLineSeries,
    createCanvasPointSeries,
    createGaugeSeries,
    createGeoRegionMapSeries,
    createGraphSeries,
    createGroupedColumnSeries,
    createHistogramSeries,
    createLineSeries,
    createSankeySeries,
    createScatterSeries,
    createSvgGlobeSeries,
    createTreeSeries,
    createTreemapSeries,
    createWaterfallSeries,
    createWebglLineSeries,
    createWebglPointSeries,
    createWorldCountryMapSeries
} from '../series';
import {kChartAICatalog} from './catalog';
import type {
    KChartAIFieldBinding,
    KChartAIPlan,
    KChartAIPlanAdapter,
    KChartAIPlanOption,
    KChartAIPlanSeries
} from './contracts';
import {assertKChartAIPlan} from './validate-plan';

type UnknownSettings = Record<string, unknown>;

export type KChartAICompileErrorCode =
    | 'unsupported-capability'
    | 'missing-binding'
    | 'missing-runtime-setting'
    | 'no-chart-series';

export class KChartAICompileError extends Error {
    readonly code: KChartAICompileErrorCode;
    readonly capability?: string;

    constructor(
        code: KChartAICompileErrorCode,
        message: string,
        capability?: string
    ) {
        super(message);
        Object.setPrototypeOf(this, KChartAICompileError.prototype);
        this.name = 'KChartAICompileError';
        this.code = code;
        this.capability = capability;
    }
}

export interface KChartAISeriesCompileContext<T = any> {
    plan: KChartAIPlan;
    seriesPlan: KChartAIPlanSeries;
    seriesIndex: number;
    selector: string;
    data: T[];
    bindings: Record<string, string | string[]>;
    settings: UnknownSettings;
    trustedSettings: UnknownSettings;
}

export type KChartAISeriesCompiler<T = any> = (
    context: KChartAISeriesCompileContext<T>
) => KChartSeries<T> | KChartSeries<T>[];

export interface KChartAICompileOptions<T = any> {
    selector: string | HTMLElement;
    data: T[];
    /**
     * Application-authored configuration only. Model output must never be
     * copied into this object because callbacks and provider objects are allowed.
     */
    configuration?: Partial<Omit<KChartConfiguration<T>, 'selector' | 'data' | 'axes' | 'series'>>;
    /**
     * Trusted settings keyed by `capability#index` first, then capability id.
     * Use this for callbacks, GeoJSON, providers, and other non-JSON runtime values.
     */
    trustedSeriesSettings?: Record<string, UnknownSettings>;
    trustedAdapterSettings?: Record<string, UnknownSettings>;
    /**
     * Registered application compilers for custom series and recipes. A
     * registered compiler may also override a built-in capability.
     */
    seriesCompilers?: Record<string, KChartAISeriesCompiler<T>>;
}

export interface KChartAICompiledAdapter<T = any> {
    capability: string;
    importPath: string;
    apiName: string;
    packageName?: string;
    data: T[];
    bindings: Record<string, string | string[]>;
    settings: UnknownSettings;
    trustedSettings: UnknownSettings;
}

export interface KChartAICompiledPlan<T = any> {
    plan: KChartAIPlan;
    configuration?: KChartConfiguration<T>;
    adapters: KChartAICompiledAdapter<T>[];
    warnings: string[];
}

export interface KChartAIRenderedPlan<T = any> extends KChartAICompiledPlan<T> {
    controller: KChartController<T>;
}

const lineSettingKeys = [
    'color',
    'strokeWidth',
    'curve',
    'dot',
    'lineWidth',
    'canvasName',
    'downsample',
    'asyncRender'
];

const labelsSettingKeys = [
    'visible',
    'mode',
    'color',
    'fill',
    'fontSize',
    'fontWeight',
    'stroke',
    'strokeWidth',
    'calloutStroke',
    'calloutOpacity',
    'side',
    'offset',
    'showZero'
];

const seriesSettingKeys: Record<string, string[]> = {
    'preset.line': lineSettingKeys,
    'preset.column': ['color', 'barRadius', 'barRatio'],
    'preset.pie': ['innerRadiusRatio', 'palette', 'labelVisible'],
    'preset.doughnut': ['innerRadiusRatio', 'palette', 'labelVisible'],
    'series.line.svg': lineSettingKeys,
    'series.line.canvas': lineSettingKeys,
    'series.line.webgl': lineSettingKeys,
    'series.area.svg': [
        'baseline',
        'color',
        'fill',
        'fillOpacity',
        'stroke',
        'strokeWidth',
        'curve',
        'downsample'
    ],
    'series.bar.svg': [
        'color',
        'fill',
        'opacity',
        'barHeight',
        'minBarHeight',
        'maxBarHeight',
        'radius',
        'baseline'
    ],
    'series.column.grouped.svg': [
        'segments',
        'opacity',
        'groupWidthRatio',
        'gap',
        'radius',
        'baseline'
    ],
    'series.scatter.svg': [
        'color',
        'radius',
        'fill',
        'stroke',
        'strokeWidth',
        'opacity'
    ],
    'series.bubble.svg': [
        'color',
        'radius',
        'fill',
        'stroke',
        'strokeWidth',
        'opacity',
        'minRadius',
        'maxRadius'
    ],
    'series.point.canvas': [
        'color',
        'radius',
        'fill',
        'stroke',
        'strokeWidth',
        'canvasName'
    ],
    'series.point.webgl': ['color', 'pointSize', 'canvasName'],
    'series.candlestick.canvas': [
        'colorMode',
        'upColor',
        'downColor',
        'neutralColor',
        'wickColor',
        'borderColor',
        'candleWidth',
        'minCandleWidth',
        'maxCandleWidth',
        'strokeWidth',
        'canvasName'
    ],
    'series.box-plot.svg': [
        'color',
        'fill',
        'opacity',
        'boxWidthRatio',
        'minBoxWidth',
        'maxBoxWidth',
        'strokeWidth'
    ],
    'series.histogram.svg': [
        'color',
        'fill',
        'opacity',
        'gap',
        'radius',
        'baseline'
    ],
    'series.treemap.svg': [
        'color',
        'fill',
        'opacity',
        'gap',
        'radius',
        'minLabelArea',
        'sort'
    ],
    'series.gauge.svg': [
        'min',
        'max',
        'startAngle',
        'endAngle',
        'color',
        'trackColor',
        'needleColor',
        'thickness',
        'showNeedle'
    ],
    'series.waterfall.svg': [
        'color',
        'positiveColor',
        'negativeColor',
        'totalColor',
        'connectorColor',
        'connectorDasharray',
        'connectorWidth',
        'opacity',
        'barWidthRatio',
        'radius',
        'baseline',
        'labels'
    ],
    'series.graph.svg': [
        'categorySide',
        'layout',
        'directed',
        'edgeSymbols',
        'color',
        'palette',
        'nodeMinRadius',
        'nodeMaxRadius',
        'nodeStroke',
        'nodeStrokeWidth',
        'nodeOpacity',
        'edgeColor',
        'edgeMinWidth',
        'edgeMaxWidth',
        'edgeOpacity',
        'chargeStrength',
        'linkDistance',
        'collisionPadding',
        'iterations',
        'labelThreshold',
        'labels',
        'roam',
        'scaleExtent',
        'selectMode',
        'dimOpacity'
    ],
    'series.tree.svg': [
        'layout',
        'orientation',
        'emphasis',
        'symbol',
        'symbolSize',
        'labelPosition',
        'roam',
        'scaleExtent',
        'fitPadding',
        'color',
        'palette',
        'nodeColor',
        'nodeOpacity',
        'nodeStroke',
        'nodeStrokeWidth',
        'edgeColor',
        'edgeOpacity',
        'edgeStrokeWidth',
        'dimOpacity',
        'labels'
    ],
    'series.sankey.svg': [
        'categorySide',
        'nodeAlign',
        'nodeWidth',
        'nodePadding',
        'iterations',
        'fitPadding',
        'labelGutter',
        'color',
        'palette',
        'nodeColor',
        'nodeStroke',
        'nodeStrokeWidth',
        'nodeOpacity',
        'linkColor',
        'linkOpacity',
        'minLinkWidth',
        'dimOpacity',
        'labels'
    ],
    'series.globe.svg': [
        'initialRotate',
        'draggable',
        'globeScale',
        'zoom',
        'drilldown',
        'sphereFill',
        'sphereStroke',
        'graticuleVisible',
        'graticuleStroke',
        'landVisible',
        'landMode',
        'landFill',
        'landStroke',
        'landOpacity',
        'countryBordersVisible',
        'countryBordersStroke',
        'countryBordersStrokeWidth',
        'markerRadius',
        'markerColor',
        'markerStroke',
        'markerStrokeWidth',
        'markerOpacity'
    ],
    'series.geo-region-map.svg': [
        'topoObjectName',
        'featureKey',
        'labelKey',
        'fitPadding',
        'backgroundFill',
        'fill',
        'missingFill',
        'stroke',
        'strokeWidth',
        'opacity',
        'hoverFill',
        'hoverStroke',
        'hoverStrokeWidth',
        'zoom',
        'labels',
        'bubbles',
        'markers',
        'tooltip'
    ],
    'series.world-country-map.svg': [
        'featureKey',
        'labelKey',
        'fitPadding',
        'backgroundFill',
        'fill',
        'missingFill',
        'stroke',
        'strokeWidth',
        'opacity',
        'hoverFill',
        'hoverStroke',
        'hoverStrokeWidth',
        'zoom',
        'labels',
        'bubbles',
        'markers',
        'tooltip'
    ]
};

const optionSettingKeys: Record<string, string[]> = {
    'option.grid': ['x', 'y', 'color', 'dasharray'],
    'option.legend': ['placement', 'itemGap', 'selectable'],
    'option.tooltip': [],
    'option.zoom': [
        'mode',
        'direction',
        'scaleExtent',
        'wheelZoom',
        'gestureZoom',
        'resetOnDoubleClick'
    ],
    'option.animation': ['duration', 'easing', 'mode', 'respectReducedMotion'],
    'option.downsample.lttb': ['threshold'],
    'option.cursor-line': ['color', 'markerRadius'],
    'option.guide-line': ['x', 'y'],
    'option.spec-area': ['areas'],
    'option.tooltip-note': [
        'maxNotes',
        'pinButtonLabel',
        'notePlaceholder'
    ]
};

const axislessCapabilities = new Set([
    'preset.pie',
    'preset.doughnut',
    'series.treemap.svg',
    'series.gauge.svg',
    'series.graph.svg',
    'series.tree.svg',
    'series.sankey.svg',
    'series.globe.svg',
    'series.geo-region-map.svg',
    'series.world-country-map.svg',
    'series.custom',
    'recipe.radial.custom',
    'recipe.topology.custom'
]);

const slug = (value: string): string => value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const pick = (
    source: UnknownSettings | undefined,
    keys: string[]
): UnknownSettings => {
    const result: UnknownSettings = {};
    if (!source) {
        return result;
    }
    for (const key of keys) {
        if (source[key] !== undefined) {
            result[key] = sanitizeNestedSetting(key, source[key]);
        }
    }
    return result;
};

const sanitizeNestedSetting = (key: string, value: unknown): unknown => {
    if (key === 'labels' && value && typeof value === 'object' && !Array.isArray(value)) {
        return pick(value as UnknownSettings, labelsSettingKeys);
    }
    if (key === 'tooltip' && value && typeof value === 'object' && !Array.isArray(value)) {
        return pick(value as UnknownSettings, []);
    }
    if (key === 'drilldown' && value && typeof value === 'object' && !Array.isArray(value)) {
        return pick(value as UnknownSettings, [
            'enabled',
            'mode',
            'autoMapOnZoom',
            'mapZoomThreshold',
            'globeZoomThreshold',
            'focusZoom',
            'zoomScale',
            'duration',
            'transition',
            'resetControl',
            'landFill',
            'landStroke',
            'landOpacity'
        ]);
    }
    if (key === 'markers' && Array.isArray(value)) {
        return value.map((marker) => pick(marker as UnknownSettings, [
            'id',
            'lat',
            'lon',
            'label',
            'size',
            'color',
            'imagePadding',
            'stroke',
            'strokeWidth',
            'labelPosition',
            'labelFill',
            'labelTextFill',
            'labelFontSize',
            'labelFontWeight',
            'labelOffset',
            'pin'
        ]));
    }
    if (key === 'bubbles' && Array.isArray(value)) {
        return value.map((bubble) => pick(bubble as UnknownSettings, [
            'id',
            'lat',
            'lon',
            'value',
            'radius',
            'color',
            'opacity',
            'stroke',
            'strokeWidth'
        ]));
    }
    return value;
};

const resolveBindings = (
    bindings: KChartAIFieldBinding[] = []
): Record<string, string | string[]> => {
    const result: Record<string, string | string[]> = {};
    for (const binding of bindings) {
        if (binding.field !== undefined) {
            result[binding.role] = binding.field;
        } else if (binding.fields !== undefined) {
            result[binding.role] = binding.fields.slice();
        }
    }
    return result;
};

const requireField = (
    bindings: Record<string, string | string[]>,
    role: string,
    capability: string
): string => {
    const value = bindings[role];
    if (typeof value !== 'string') {
        throw new KChartAICompileError(
            'missing-binding',
            `${capability} requires a single "${role}" field binding.`,
            capability
        );
    }
    return value;
};

const optionalField = (
    bindings: Record<string, string | string[]>,
    role: string
): string | undefined => {
    const value = bindings[role];
    return typeof value === 'string' ? value : undefined;
};

const requireFields = (
    bindings: Record<string, string | string[]>,
    role: string,
    capability: string
): string[] => {
    const value = bindings[role];
    if (!Array.isArray(value) || value.length === 0) {
        throw new KChartAICompileError(
            'missing-binding',
            `${capability} requires one or more "${role}" field bindings.`,
            capability
        );
    }
    return value;
};

const getTrustedSettings = (
    settings: Record<string, UnknownSettings> | undefined,
    capability: string,
    index: number
): UnknownSettings => ({
    ...(settings?.[capability] ?? {}),
    ...(settings?.[`${capability}#${index}`] ?? {})
});

const protectedSeriesConfiguration = (
    seriesPlan: KChartAIPlanSeries,
    selector: string,
    bindings: Record<string, string | string[]>,
    settings: UnknownSettings,
    trustedSettings: UnknownSettings
): UnknownSettings => ({
    ...settings,
    ...trustedSettings,
    selector,
    displayName: seriesPlan.displayName
});

const extractPresetSeries = <T>(
    seriesPlan: KChartAIPlanSeries,
    selector: string,
    data: T[],
    bindings: Record<string, string | string[]>,
    settings: UnknownSettings,
    trustedSettings: UnknownSettings
): KChartSeries<T> => {
    const capability = seriesPlan.capability;
    const merged = {...settings, ...trustedSettings};
    const builder = chartConfig<T>(data).selector(selector);
    if (capability === 'preset.line') {
        const xField = requireField(bindings, 'x', capability) as keyof T & string;
        const yField = requireField(bindings, 'y', capability) as keyof T & string;
        const renderer = seriesPlan.renderer;
        const built = builder
            .x(xField, 'number')
            .y(yField, 'number')
            .line({
                ...merged,
                renderer,
                displayName: seriesPlan.displayName
            } as any)
            .build();
        built.series[0].selector = selector;
        return built.series[0];
    }
    if (capability === 'preset.column') {
        const xField = requireField(bindings, 'x', capability) as keyof T & string;
        const yField = requireField(bindings, 'y', capability) as keyof T & string;
        const built = builder
            .x(xField, 'point')
            .y(yField, 'number')
            .column({
                ...merged,
                displayName: seriesPlan.displayName
            } as any)
            .build();
        built.series[0].selector = selector;
        return built.series[0];
    }
    const label = requireField(bindings, 'label', capability) as keyof T & string;
    const value = requireField(bindings, 'value', capability) as keyof T & string;
    const built = capability === 'preset.doughnut'
        ? builder.doughnut({
            ...merged,
            label,
            value,
            displayName: seriesPlan.displayName
        } as any).build()
        : builder.pie({
            ...merged,
            label,
            value,
            displayName: seriesPlan.displayName
        } as any).build();
    built.series[0].selector = selector;
    return built.series[0];
};

const compileBuiltInSeries = <T>(
    context: KChartAISeriesCompileContext<T>
): KChartSeries<T>[] => {
    const {
        seriesPlan,
        selector,
        data,
        bindings,
        settings,
        trustedSettings
    } = context;
    const capability = seriesPlan.capability;
    if (capability.startsWith('preset.')) {
        return [extractPresetSeries(
            seriesPlan,
            selector,
            data,
            bindings,
            settings,
            trustedSettings
        )];
    }

    const base = protectedSeriesConfiguration(
        seriesPlan,
        selector,
        bindings,
        settings,
        trustedSettings
    );
    const x = (): keyof T & string => requireField(bindings, 'x', capability) as keyof T & string;
    const y = (): keyof T & string => requireField(bindings, 'y', capability) as keyof T & string;
    const field = (role: string): keyof T & string =>
        requireField(bindings, role, capability) as keyof T & string;
    const optional = (role: string): keyof T & string | undefined =>
        optionalField(bindings, role) as keyof T & string | undefined;

    switch (capability) {
        case 'series.line.svg':
            return [createLineSeries<T>({...base, xField: x(), yField: y()} as any)];
        case 'series.line.canvas':
            return [createCanvasLineSeries<T>({...base, xField: x(), yField: y()} as any)];
        case 'series.line.webgl':
            return [createWebglLineSeries<T>({...base, xField: x(), yField: y()} as any)];
        case 'series.area.svg':
            return [createAreaSeries<T>({...base, xField: x(), yField: y()} as any)];
        case 'series.bar.svg':
            return [createBarSeries<T>({
                ...base,
                xField: y(),
                yField: x()
            } as any)];
        case 'series.column.grouped.svg': {
            const segmentFields = requireFields(bindings, 'segments', capability);
            const configuredSegments = Array.isArray(settings.segments)
                ? settings.segments as UnknownSettings[]
                : [];
            const segments = segmentFields.map((segmentField, index) => ({
                ...(configuredSegments[index] ?? {}),
                field: segmentField
            }));
            return [createGroupedColumnSeries<T>({
                ...base,
                xField: x(),
                segments
            } as any)];
        }
        case 'series.scatter.svg':
            return [createScatterSeries<T>({...base, xField: x(), yField: y()} as any)];
        case 'series.bubble.svg':
            return [createBubbleSeries<T>({
                ...base,
                xField: x(),
                yField: y(),
                radiusField: field('radius')
            } as any)];
        case 'series.point.canvas':
            return [createCanvasPointSeries<T>({...base, xField: x(), yField: y()} as any)];
        case 'series.point.webgl':
            return [createWebglPointSeries<T>({...base, xField: x(), yField: y()} as any)];
        case 'series.candlestick.canvas':
            return [createCanvasCandlestickSeries<T>({
                ...base,
                xField: x(),
                openField: field('open'),
                highField: field('high'),
                lowField: field('low'),
                closeField: field('close'),
                previousCloseField: optional('previousClose')
            } as any)];
        case 'series.box-plot.svg':
            return [createBoxPlotSeries<T>({
                ...base,
                xField: x(),
                minField: field('min'),
                q1Field: field('q1'),
                medianField: field('median'),
                q3Field: field('q3'),
                maxField: field('max'),
                outliersField: optional('outliers')
            } as any)];
        case 'series.histogram.svg':
            return [createHistogramSeries<T>({
                ...base,
                binStartField: field('binStart'),
                binEndField: field('binEnd'),
                valueField: field('value')
            } as any)];
        case 'series.treemap.svg':
            return [createTreemapSeries<T>({
                ...base,
                labelField: field('label'),
                valueField: field('value'),
                colorField: optional('color')
            } as any)];
        case 'series.gauge.svg':
            return [createGaugeSeries<T>({
                ...base,
                valueField: field('value'),
                labelField: optional('label')
            } as any)];
        case 'series.waterfall.svg':
            return [createWaterfallSeries<T>({
                ...base,
                xField: x(),
                valueField: field('value'),
                totalField: optional('total')
            } as any)];
        case 'series.graph.svg':
            return [createGraphSeries<T>({
                ...base,
                sourceField: field('source'),
                targetField: field('target'),
                valueField: field('value'),
                categoryField: optional('category')
            } as any)];
        case 'series.tree.svg':
            return [createTreeSeries<T>({
                ...base,
                idField: field('id'),
                parentField: field('parent'),
                labelField: optional('label'),
                valueField: optional('value'),
                categoryField: optional('category')
            } as any)];
        case 'series.sankey.svg':
            return [createSankeySeries<T>({
                ...base,
                sourceField: field('source'),
                targetField: field('target'),
                valueField: field('value'),
                categoryField: optional('category')
            } as any)];
        case 'series.globe.svg':
            return [createSvgGlobeSeries<T>({
                ...base,
                latField: field('latitude'),
                lonField: field('longitude'),
                labelField: optional('label')
            } as any)];
        case 'series.geo-region-map.svg': {
            if (trustedSettings.geoJson === undefined && trustedSettings.topoObjectName === undefined) {
                throw new KChartAICompileError(
                    'missing-runtime-setting',
                    'series.geo-region-map.svg requires application-supplied GeoJSON in trustedSeriesSettings.',
                    capability
                );
            }
            return [createGeoRegionMapSeries<T>({
                ...base,
                dataKey: optional('regionKey'),
                valueField: optional('value'),
                colorField: optional('color')
            } as any)];
        }
        case 'series.world-country-map.svg':
            return [createWorldCountryMapSeries<T>({
                ...base,
                dataKey: optional('regionKey'),
                valueField: optional('value'),
                colorField: optional('color')
            } as any)];
        default:
            throw new KChartAICompileError(
                'unsupported-capability',
                `${capability} needs an application series compiler registered in seriesCompilers.`,
                capability
            );
    }
};

const fieldTypeToScaleType = (
    plan: KChartAIPlan,
    field: string
): KChartScaleType => {
    const type = plan.data.fields.find((item) => item.name === field)?.type;
    if (type === 'time') {
        return 'time';
    }
    if (type === 'string' || type === 'boolean') {
        return 'point';
    }
    return 'number';
};

const addUnique = (target: string[], value: string | undefined): void => {
    if (value && !target.includes(value)) {
        target.push(value);
    }
};

const resolveWaterfallDomain = <T>(
    data: T[],
    valueField: string,
    totalField?: string
): [number, number] => {
    let running = 0;
    let min = 0;
    let max = 0;
    for (const point of data as any[]) {
        const isTotal = totalField ? Boolean(point[totalField]) : false;
        const value = Number(point[valueField]);
        if (!Number.isFinite(value)) {
            continue;
        }
        if (isTotal) {
            running = value;
        } else {
            running += value;
        }
        min = Math.min(min, running);
        max = Math.max(max, running);
    }
    return [min, max];
};

const inferAxes = <T>(
    plan: KChartAIPlan,
    data: T[]
): KChartAxis<T>[] => {
    const plans = plan.series ?? [];
    if (plans.length === 0 || plans.every((seriesPlan) => axislessCapabilities.has(seriesPlan.capability))) {
        return [];
    }

    const xFields: string[] = [];
    const yFields: string[] = [];
    let horizontalBar = false;
    let waterfallDomain: [number, number] | undefined;

    for (const seriesPlan of plans) {
        if (axislessCapabilities.has(seriesPlan.capability)) {
            continue;
        }
        const bindings = resolveBindings(seriesPlan.bindings);
        if (seriesPlan.capability === 'series.bar.svg') {
            horizontalBar = true;
            addUnique(xFields, optionalField(bindings, 'y'));
            addUnique(yFields, optionalField(bindings, 'x'));
            continue;
        }
        if (seriesPlan.capability === 'series.histogram.svg') {
            addUnique(xFields, optionalField(bindings, 'binStart'));
            addUnique(xFields, optionalField(bindings, 'binEnd'));
            addUnique(yFields, optionalField(bindings, 'value'));
            continue;
        }
        addUnique(xFields, optionalField(bindings, 'x'));
        if (seriesPlan.capability === 'series.column.grouped.svg') {
            for (const item of (bindings.segments as string[] | undefined) ?? []) {
                addUnique(yFields, item);
            }
            continue;
        }
        if (seriesPlan.capability === 'series.candlestick.canvas') {
            for (const role of ['open', 'high', 'low', 'close', 'previousClose']) {
                addUnique(yFields, optionalField(bindings, role));
            }
            continue;
        }
        if (seriesPlan.capability === 'series.box-plot.svg') {
            for (const role of ['min', 'q1', 'median', 'q3', 'max']) {
                addUnique(yFields, optionalField(bindings, role));
            }
            continue;
        }
        if (seriesPlan.capability === 'series.waterfall.svg') {
            const valueField = optionalField(bindings, 'value');
            addUnique(yFields, valueField);
            if (valueField) {
                waterfallDomain = resolveWaterfallDomain(
                    data,
                    valueField,
                    optionalField(bindings, 'total')
                );
            }
            continue;
        }
        addUnique(yFields, optionalField(bindings, 'y'));
    }

    const axes: KChartAxis<T>[] = [];
    if (xFields.length > 0) {
        axes.push({
            field: xFields[0] as keyof T & string,
            type: fieldTypeToScaleType(plan, xFields[0]),
            placement: 'bottom',
            domainFields: xFields.length > 1
                ? xFields as Array<keyof T & string>
                : undefined
        });
    }
    if (yFields.length > 0) {
        axes.push({
            field: yFields[0] as keyof T & string,
            type: horizontalBar ? fieldTypeToScaleType(plan, yFields[0]) : 'number',
            placement: 'left',
            domainFields: yFields.length > 1
                ? yFields as Array<keyof T & string>
                : undefined,
            min: waterfallDomain?.[0],
            max: waterfallDomain?.[1]
        });
    }
    if (!plan.axes || plan.axes.length === 0) {
        return axes;
    }

    const axisSide = (placement: string): 'x' | 'y' =>
        placement === 'top' || placement === 'bottom' ? 'x' : 'y';
    const explicitAxes = plan.axes.map((axis) => {
        const inferred = axes.find((item) =>
            axisSide(item.placement) === axisSide(axis.placement)
        );
        const convertBound = (
            value: number | string | undefined
        ): number | Date | undefined => {
            if (value === undefined || axis.type !== 'time') {
                return value as number | undefined;
            }
            return new Date(value);
        };
        return {
            ...inferred,
            field: axis.field as keyof T & string,
            type: axis.type,
            placement: axis.placement,
            title: axis.title,
            min: convertBound(axis.min) ?? inferred?.min,
            max: convertBound(axis.max) ?? inferred?.max,
            tickCount: axis.tickCount,
            domainFields: inferred?.domainFields
        } as KChartAxis<T>;
    });

    for (const inferred of axes) {
        if (!explicitAxes.some((axis) =>
            axisSide(axis.placement) === axisSide(inferred.placement)
        )) {
            explicitAxes.push(inferred);
        }
    }
    return explicitAxes;
};

const compileOptions = <T>(
    plan: KChartAIPlan,
    configuration: KChartConfiguration<T>,
    warnings: string[]
): void => {
    const chartOptions: KChartOption<T>[] = [];
    for (const option of plan.options ?? []) {
        const enabled = option.enabled ?? true;
        const settings = pick(
            option.settings,
            optionSettingKeys[option.capability] ?? []
        );
        switch (option.capability) {
            case 'option.grid':
                configuration.grid = {visible: enabled, ...settings} as any;
                break;
            case 'option.legend':
                configuration.legend = {visible: enabled, ...settings} as any;
                break;
            case 'option.tooltip':
                configuration.tooltip = {visible: enabled};
                break;
            case 'option.zoom': {
                const xAxis = configuration.axes.find((axis) =>
                    axis.placement === 'bottom' || axis.placement === 'top'
                );
                if (enabled && xAxis && (xAxis.type === 'point' || xAxis.type === 'string')) {
                    warnings.push('option.zoom was omitted because categorical x axes do not support zoom.');
                    break;
                }
                configuration.zoom = {enabled, ...settings} as any;
                break;
            }
            case 'option.animation':
                configuration.animation = {enabled, ...settings} as any;
                break;
            case 'option.downsample.lttb': {
                const downsample = {
                    enabled,
                    ...settings
                };
                const eligibleSelectors = new Set(
                    (plan.series ?? [])
                        .map((seriesPlan, index) => ({
                            capability: seriesPlan.capability,
                            selector: `kchart-ai-${slug(seriesPlan.capability)}-${index + 1}`
                        }))
                        .filter(({capability}) =>
                            capability === 'preset.line'
                            || capability === 'series.line.svg'
                            || capability === 'series.line.canvas'
                            || capability === 'series.line.webgl'
                            || capability === 'series.area.svg'
                            || capability === 'recipe.realtime.rolling-window'
                        )
                        .map(({selector}) => selector)
                );
                for (const series of configuration.series) {
                    if (
                        eligibleSelectors.has(series.selector)
                        && series.xField
                        && series.yField
                        && series.downsample === undefined
                    ) {
                        series.downsample = downsample as any;
                    }
                }
                break;
            }
            case 'option.cursor-line':
                chartOptions.push(createCursorLineOption({
                    visible: enabled,
                    ...settings
                } as any) as KChartOption<T>);
                break;
            case 'option.guide-line':
                chartOptions.push(createGuideLineOption({
                    visible: enabled,
                    ...settings
                } as any) as KChartOption<T>);
                break;
            case 'option.spec-area': {
                const areas = Array.isArray(settings.areas) ? settings.areas : [];
                if (enabled && areas.length === 0) {
                    warnings.push('option.spec-area has no areas and was omitted.');
                    break;
                }
                chartOptions.push(createSpecAreaOption(areas as any[], {visible: enabled}) as KChartOption<T>);
                break;
            }
            case 'option.tooltip-note':
                chartOptions.push(createTooltipNoteOption<T>({
                    enabled,
                    ...settings
                } as any));
                break;
            case 'option.render-complete':
                warnings.push('Await controller.whenRenderComplete() to observe the final committed frame.');
                break;
            default:
                break;
        }
    }
    if (chartOptions.length > 0) {
        configuration.options = [
            ...(configuration.options ?? []),
            ...chartOptions
        ];
    }
};

const compileAdapter = <T>(
    adapterPlan: KChartAIPlanAdapter,
    index: number,
    data: T[],
    trustedSettingsMap: Record<string, UnknownSettings> | undefined,
    warnings: string[]
): KChartAICompiledAdapter<T> => {
    const capability = kChartAICatalog.capabilities.find(
        (item) => item.id === adapterPlan.capability
    );
    if (!capability || capability.kind !== 'adapter') {
        throw new KChartAICompileError(
            'unsupported-capability',
            `Unknown KChart adapter capability: ${adapterPlan.capability}`,
            adapterPlan.capability
        );
    }
    const sensitive = /token|secret|apiKey|provider|style/i;
    const sanitizeAdapterSettings = (
        value: unknown,
        path: string
    ): unknown => {
        if (Array.isArray(value)) {
            return value.map((item, index) =>
                sanitizeAdapterSettings(item, `${path}[${index}]`)
            );
        }
        if (!value || typeof value !== 'object') {
            return value;
        }
        const sanitized: UnknownSettings = {};
        for (const [key, item] of Object.entries(value as UnknownSettings)) {
            const itemPath = path ? `${path}.${key}` : key;
            if (sensitive.test(key)) {
                warnings.push(
                    `${adapterPlan.capability}.${itemPath} was removed; credentials and providers must be supplied as trusted runtime settings.`
                );
                continue;
            }
            sanitized[key] = sanitizeAdapterSettings(item, itemPath);
        }
        return sanitized;
    };
    const settings = sanitizeAdapterSettings(
        adapterPlan.settings ?? {},
        ''
    ) as UnknownSettings;
    return {
        capability: capability.id,
        importPath: capability.importPath,
        apiName: capability.apiName,
        packageName: capability.packageName,
        data,
        bindings: resolveBindings(adapterPlan.bindings),
        settings,
        trustedSettings: getTrustedSettings(
            trustedSettingsMap,
            adapterPlan.capability,
            index
        )
    };
};

export const compileKChartAIPlan = <T = any>(
    input: unknown,
    options: KChartAICompileOptions<T>
): KChartAICompiledPlan<T> => {
    const plan = assertKChartAIPlan(input);
    const warnings = [...(plan.warnings ?? [])];
    const compiledSeries: KChartSeries<T>[] = [];

    for (let index = 0; index < (plan.series ?? []).length; index += 1) {
        const seriesPlan = plan.series![index];
        const selector = `kchart-ai-${slug(seriesPlan.capability)}-${index + 1}`;
        const bindings = resolveBindings(seriesPlan.bindings);
        const settings = pick(
            seriesPlan.settings,
            seriesSettingKeys[seriesPlan.capability] ?? []
        );
        const trustedSettings = getTrustedSettings(
            options.trustedSeriesSettings,
            seriesPlan.capability,
            index
        );
        const context: KChartAISeriesCompileContext<T> = {
            plan,
            seriesPlan,
            seriesIndex: index,
            selector,
            data: options.data,
            bindings,
            settings,
            trustedSettings
        };
        const registered = options.seriesCompilers?.[seriesPlan.capability];
        const result = registered
            ? registered(context)
            : compileBuiltInSeries(context);
        compiledSeries.push(...(Array.isArray(result) ? result : [result]));
    }

    const adapters = (plan.adapters ?? []).map((adapter, index) =>
        compileAdapter(
            adapter,
            index,
            options.data,
            options.trustedAdapterSettings,
            warnings
        )
    );

    if (compiledSeries.length === 0) {
        return {
            plan,
            adapters,
            warnings
        };
    }

    const trustedConfiguration = options.configuration ?? {};
    const themeClass = plan.theme ? `kchart-theme-${plan.theme}` : '';
    const configuredClass = trustedConfiguration.className ?? '';
    const className = `${themeClass} ${configuredClass}`.trim() || undefined;
    const configuration: KChartConfiguration<T> = {
        ...trustedConfiguration,
        selector: options.selector,
        data: options.data,
        axes: inferAxes(plan, options.data),
        series: compiledSeries,
        className,
        title: trustedConfiguration.title ?? (
            plan.title ? {text: plan.title} : undefined
        )
    };
    compileOptions(plan, configuration, warnings);
    return {
        plan,
        configuration,
        adapters,
        warnings
    };
};

export const renderKChartAIPlan = <T = any>(
    input: unknown,
    options: KChartAICompileOptions<T>
): KChartAIRenderedPlan<T> => {
    const compiled = compileKChartAIPlan(input, options);
    if (!compiled.configuration) {
        throw new KChartAICompileError(
            'no-chart-series',
            'This ChartPlan contains adapters only. Execute its adapter descriptors in the application runtime.'
        );
    }
    const controller = createKChart(compiled.configuration).render();
    return {
        ...compiled,
        controller
    };
};
