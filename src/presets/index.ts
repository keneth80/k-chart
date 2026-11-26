import type {
    KChartAnimationConfiguration,
    KChartAreaSeriesConfiguration,
    KChartAxis,
    KChartBarSeriesConfiguration,
    KChartBubbleSeriesConfiguration,
    KChartCanvasCandlestickSeriesConfiguration,
    KChartConfiguration,
    KChartController,
    KChartGridConfiguration,
    KChartLegendConfiguration,
    KChartMargin,
    KChartOption,
    KChartScaleType,
    KChartScatterSeriesConfiguration,
    KChartSeries,
    KChartSize,
    KChartTitleConfiguration,
    KChartTooltipConfiguration
} from '../core/contracts';
import {createKChart} from '../core/create-kchart';
import {createCanvasLineSeries} from '../series/canvas-line';
import {createCanvasCandlestickSeries} from '../series/canvas-candlestick';
import {createCustomSeries} from '../series/custom';
import {createLineSeries} from '../series/svg-line';
import {createAreaSeries} from '../series/svg-area';
import {createBarSeries} from '../series/svg-bar';
import {createBubbleSeries, createScatterSeries} from '../series/svg-scatter';
import {createWebglLineSeries} from '../series/webgl-line';
import {resolveScalePosition} from '../series/support/scale';

export type KChartSimpleRenderer = 'svg' | 'canvas' | 'webgl';

export interface KChartSimpleAxisOption<T = any> {
    field: keyof T & string;
    type?: KChartScaleType;
    title?: string;
    min?: number | Date;
    max?: number | Date;
    domain?: Array<string | number | Date>;
    domainFields?: Array<keyof T & string>;
    padding?: number;
    titleLayout?: KChartAxis<T>['titleLayout'];
    titleOffset?: number;
    tickCount?: number;
    tickFormat?: (value: any) => string;
}

export interface KChartSimpleBaseOptions<T = any> {
    strictOptions?: boolean;
    selector: string | HTMLElement;
    data: T[];
    width?: number;
    height?: number;
    margin?: Partial<KChartMargin>;
    colors?: string[];
    className?: string;
    title?: string | KChartTitleConfiguration;
    grid?: boolean | KChartGridConfiguration;
    legend?: boolean | KChartLegendConfiguration;
    tooltip?: boolean | KChartTooltipConfiguration<T>;
    animation?: boolean | KChartAnimationConfiguration;
    options?: KChartOption<T>[];
    autoResize?: KChartConfiguration<T>['autoResize'];
    accessibility?: KChartConfiguration<T>['accessibility'];
    theme?: KChartConfiguration<T>['theme'];
    status?: KChartConfiguration<T>['status'];
}

export interface KChartLinePresetOptions<T = any> {
    renderer?: KChartSimpleRenderer;
    displayName?: string;
    color?: string;
    strokeWidth?: number;
    curve?: boolean;
    dot?: boolean | {
        radius?: number;
        fill?: string;
        stroke?: string;
    };
    lineWidth?: number;
    canvasName?: string;
    downsample?: KChartSeries<T>['downsample'];
}

export interface KChartLineChartOptions<T = any> extends KChartSimpleBaseOptions<T>, KChartLinePresetOptions<T> {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y: keyof T & string | KChartSimpleAxisOption<T>;
}

export interface KChartColumnPresetOptions {
    displayName?: string;
    color?: string;
    barRadius?: number;
    barRatio?: number;
    baseline?: number;
}

export interface KChartColumnChartOptions<T = any> extends KChartSimpleBaseOptions<T>, KChartColumnPresetOptions {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y: keyof T & string | KChartSimpleAxisOption<T>;
}

export type KChartAreaPresetOptions<T = any> = Omit<KChartAreaSeriesConfiguration<T>, 'selector' | 'xField' | 'yField'>;
export type KChartScatterPresetOptions<T = any> = Omit<KChartScatterSeriesConfiguration<T>, 'selector' | 'xField' | 'yField'>;
export type KChartBubblePresetOptions<T = any> = Omit<KChartBubbleSeriesConfiguration<T>, 'selector' | 'xField' | 'yField'>;
export type KChartBarPresetOptions<T = any> = Omit<KChartBarSeriesConfiguration<T>, 'selector' | 'xField' | 'yField'>;
export type KChartCandlestickPresetOptions<T = any> = Omit<KChartCanvasCandlestickSeriesConfiguration<T>, 'selector' | 'xField'>;

export interface KChartBarChartOptions<T = any> extends KChartSimpleBaseOptions<T>, KChartBarPresetOptions<T> {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y: keyof T & string | KChartSimpleAxisOption<T>;
}

export interface KChartCandlestickChartOptions<T = any> extends KChartSimpleBaseOptions<T>, KChartCandlestickPresetOptions<T> {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y?: keyof T & string | KChartSimpleAxisOption<T>;
}

export interface KChartAreaChartOptions<T = any> extends KChartSimpleBaseOptions<T>, KChartAreaPresetOptions<T> {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y: keyof T & string | KChartSimpleAxisOption<T>;
}

export interface KChartScatterChartOptions<T = any> extends KChartSimpleBaseOptions<T>, KChartScatterPresetOptions<T> {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y: keyof T & string | KChartSimpleAxisOption<T>;
}

export interface KChartBubbleChartOptions<T = any> extends KChartSimpleBaseOptions<T>, KChartBubblePresetOptions<T> {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y: keyof T & string | KChartSimpleAxisOption<T>;
}

export interface KChartPieSliceLabelContext<T = any> {
    data: T;
    datum: T;
    label: string;
    value: number;
    total: number;
    percentage: number;
    index: number;
    color: string;
}

export type KChartPieSliceLabelFormatter<T = any> = (
    context: KChartPieSliceLabelContext<T>
) => string | string[];

export interface KChartPieLeaderLineConfiguration {
    visible?: boolean;
    color?: string;
    width?: number;
    length?: number;
}

export interface KChartPieLabelCollisionConfiguration {
    minGap?: number;
    padding?: number;
}

export interface KChartPieSliceLabelOptions<T = any> {
    visible?: boolean;
    position?: 'radial' | 'outside';
    formatter?: KChartPieSliceLabelFormatter<T>;
    leaderLine?: boolean | KChartPieLeaderLineConfiguration;
    minPercentage?: number;
    maxVisible?: number;
    collision?: boolean | KChartPieLabelCollisionConfiguration;
}

export interface KChartPiePresetOptions<T = any> {
    label: keyof T & string;
    value: keyof T & string;
    displayName?: string;
    innerRadiusRatio?: number;
    palette?: string[];
    labelVisible?: boolean;
    sliceLabel?: KChartPieSliceLabelFormatter<T> | KChartPieSliceLabelOptions<T>;
}

export interface KChartPieChartOptions<T = any> extends KChartSimpleBaseOptions<T>, KChartPiePresetOptions<T> {}

export type KChartSimpleBuildOptions<T = any> = Partial<KChartConfiguration<T>> & {
    selector?: string | HTMLElement;
};

export interface KChartConfigBuilder<T = any> {
    selector(selector: string | HTMLElement): KChartConfigBuilder<T>;
    size(width: number, height?: number): KChartConfigBuilder<T>;
    margin(margin: Partial<KChartMargin>): KChartConfigBuilder<T>;
    title(title: string | KChartTitleConfiguration): KChartConfigBuilder<T>;
    grid(grid?: boolean | KChartGridConfiguration): KChartConfigBuilder<T>;
    legend(legend?: boolean | KChartLegendConfiguration): KChartConfigBuilder<T>;
    tooltip(tooltip?: boolean | KChartTooltipConfiguration<T>): KChartConfigBuilder<T>;
    animation(animation?: boolean | KChartAnimationConfiguration): KChartConfigBuilder<T>;
    x(field: keyof T & string, type?: KChartScaleType, option?: Partial<KChartAxis<T>>): KChartConfigBuilder<T>;
    y(field: keyof T & string, type?: KChartScaleType, option?: Partial<KChartAxis<T>>): KChartConfigBuilder<T>;
    line(option?: KChartLinePresetOptions<T>): KChartConfigBuilder<T>;
    /** @deprecated Chart and axis options are ignored here; use fluent methods or build(overrides). */
    line(option?: Partial<KChartLineChartOptions<T>>): KChartConfigBuilder<T>;
    column(option?: KChartColumnPresetOptions): KChartConfigBuilder<T>;
    /** @deprecated Chart and axis options are ignored here; use fluent methods or build(overrides). */
    column(option?: Partial<KChartColumnChartOptions<T>>): KChartConfigBuilder<T>;
    area(option?: KChartAreaPresetOptions<T>): KChartConfigBuilder<T>;
    scatter(option?: KChartScatterPresetOptions<T>): KChartConfigBuilder<T>;
    bubble(option?: KChartBubblePresetOptions<T>): KChartConfigBuilder<T>;
    bar(option?: KChartBarPresetOptions<T>): KChartConfigBuilder<T>;
    candlestick(option: KChartCandlestickPresetOptions<T>): KChartConfigBuilder<T>;
    pie(option: KChartPiePresetOptions<T>): KChartConfigBuilder<T>;
    /** @deprecated Chart options are ignored here; use fluent methods or build(overrides). */
    pie(option: KChartPiePresetOptions<T> & Partial<KChartPieChartOptions<T>>): KChartConfigBuilder<T>;
    doughnut(option: KChartPiePresetOptions<T>): KChartConfigBuilder<T>;
    /** @deprecated Chart options are ignored here; use fluent methods or build(overrides). */
    doughnut(option: KChartPiePresetOptions<T> & Partial<KChartPieChartOptions<T>>): KChartConfigBuilder<T>;
    series(series: KChartSeries<T> | KChartSeries<T>[]): KChartConfigBuilder<T>;
    option(option: KChartOption<T> | KChartOption<T>[]): KChartConfigBuilder<T>;
    build(overrides?: KChartSimpleBuildOptions<T>): KChartConfiguration<T>;
    render(overrides?: KChartSimpleBuildOptions<T>): KChartController<T>;
}

const defaultPalette = ['#5db8ff', '#56d08f', '#f3b45b', '#d876ff', '#ff6b8a', '#72e4ff'];

// Keep legacy simple class names; reserve the encoded namespace to avoid collisions.
const safeSelector = (value: string): string => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(value)
    && !value.startsWith('_kchart_')
    ? value
    : `_kchart_${Array.from(value).map((character) => character.codePointAt(0)!.toString(16)).join('_')}`;

// Copy configuration records, not opaque DOM/renderer instances or callback closures.
const snapshot = <V>(value: V, seen = new WeakMap<object, any>()): V => {
    if (!value || typeof value !== 'object') {
        return value;
    }
    if (seen.has(value)) {
        return seen.get(value);
    }
    if (value instanceof Date) {
        const copy = new Date(value.getTime());
        seen.set(value, copy);
        return copy as any;
    }
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
        return value;
    }
    const copy: any = Array.isArray(value) ? [] : Object.create(prototype);
    seen.set(value, copy);
    Object.keys(value).forEach((key) => Object.defineProperty(copy, key, {
        value: snapshot((value as any)[key], seen),
        enumerable: true,
        writable: true,
        configurable: true
    }));
    return copy;
};

const seriesOptionKeys = {
    line: ['renderer', 'displayName', 'color', 'strokeWidth', 'curve', 'dot', 'lineWidth', 'canvasName', 'downsample'],
    column: ['displayName', 'color', 'barRadius', 'barRatio', 'baseline'],
    area: ['displayName', 'baseline', 'color', 'fill', 'fillOpacity', 'stroke', 'strokeWidth', 'curve', 'downsample'],
    scatter: ['displayName', 'color', 'radius', 'fill', 'stroke', 'strokeWidth', 'opacity'],
    bubble: ['displayName', 'color', 'radius', 'fill', 'stroke', 'strokeWidth', 'opacity', 'radiusField', 'minRadius', 'maxRadius'],
    bar: ['displayName', 'color', 'fill', 'opacity', 'barHeight', 'minBarHeight', 'maxBarHeight', 'radius', 'baseline'],
    candlestick: ['displayName', 'openField', 'highField', 'lowField', 'closeField', 'colorMode', 'previousCloseField',
        'upColor', 'downColor', 'neutralColor', 'wickColor', 'borderColor', 'candleWidth', 'minCandleWidth',
        'maxCandleWidth', 'strokeWidth', 'canvasName'],
    pie: ['label', 'value', 'displayName', 'innerRadiusRatio', 'palette', 'labelVisible', 'sliceLabel']
};

const snapshotSeriesOptions = <V extends object>(kind: keyof typeof seriesOptionKeys, option: V): V => {
    const picked: any = {};
    seriesOptionKeys[kind].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(option, key)) {
            picked[key] = (option as any)[key];
        }
    });
    return snapshot(picked);
};

const validateSeriesOptions = (kind: keyof typeof seriesOptionKeys, option: object): void => {
    const unsupported = Object.keys(option).filter((key) => !seriesOptionKeys[kind].includes(key));
    if (unsupported.length) {
        throw new Error(`chartConfig(...).${kind}(): unsupported series option(s): ${unsupported.join(', ')}. Use builder methods or build(overrides) for chart options; x(...) and y(...) for axes.`);
    }
};

const validateStandaloneOptions = (kind: 'line' | 'column' | 'pie', option: KChartSimpleBaseOptions): void => {
    if (!option.strictOptions) return;
    const keys = ['strictOptions', 'selector', 'data', 'width', 'height', 'margin', 'colors', 'className',
        'title', 'grid', 'legend', 'tooltip', 'animation', 'options', 'autoResize', 'accessibility', 'theme', 'status',
        ...(kind === 'pie' ? [] : ['x', 'y']), ...seriesOptionKeys[kind]];
    const unsupported = Object.keys(option).filter((key) => !keys.includes(key));
    if (unsupported.length) {
        throw new Error(`Preset ${kind}: unsupported option(s): ${unsupported.join(', ')}`);
    }
};

const validateLineRenderer = <T>(option: KChartLinePresetOptions<T>, strictOptions = false): KChartSimpleRenderer => {
    const renderer = option.renderer ?? 'svg';
    if (!strictOptions) return renderer;
    if (!['svg', 'canvas', 'webgl'].includes(renderer)) {
        throw new Error(`Unsupported line renderer: ${renderer}`);
    }
    if (renderer !== 'svg' && (option.dot !== undefined || option.curve !== undefined)) {
        throw new Error('Line dot and curve options require the svg renderer.');
    }
    if (renderer === 'svg' && option.canvasName !== undefined) {
        throw new Error('Line canvasName requires the canvas or webgl renderer.');
    }
    return renderer;
};

const resolveColumnBaseline = (scale: any, explicit?: number): number => {
    if (explicit !== undefined) {
        return explicit;
    }
    const domain = typeof scale.domain === 'function' ? scale.domain().map(Number).filter(Number.isFinite) : [];
    if (!domain.length) {
        return 0;
    }
    return Math.max(Math.min(...domain), Math.min(Math.max(...domain), 0));
};

const normalizeTitle = (
    title?: string | KChartTitleConfiguration
): KChartTitleConfiguration | undefined => typeof title === 'string'
    ? {text: title, align: 'left'}
    : title;

const normalizeGrid = (
    grid?: boolean | KChartGridConfiguration
): KChartGridConfiguration | undefined => typeof grid === 'boolean'
    ? {visible: grid}
    : grid;

const normalizeLegend = (
    legend?: boolean | KChartLegendConfiguration
): KChartLegendConfiguration | undefined => typeof legend === 'boolean'
    ? {visible: legend}
    : legend;

const normalizeTooltip = <T = any>(
    tooltip?: boolean | KChartTooltipConfiguration<T>
): KChartTooltipConfiguration<T> | undefined => typeof tooltip === 'boolean'
    ? {visible: tooltip}
    : tooltip;

const normalizeAxis = <T = any>(
    axis: keyof T & string | KChartSimpleAxisOption<T>,
    placement: KChartAxis<T>['placement'],
    fallbackType: KChartScaleType
): KChartAxis<T> => {
    if (typeof axis === 'string') {
        return {
            field: axis,
            type: fallbackType,
            placement
        };
    }

    const {field, type, ...rest} = axis;
    return {
        ...rest,
        field,
        type: type ?? fallbackType,
        placement
    };
};

const candlestickAxis = <T>(axis: KChartAxis<T>, option: KChartCandlestickPresetOptions<T>, inferred = false): KChartAxis<T> => {
    const fields = [option.openField, option.highField, option.lowField, option.closeField];
    if (fields.some((field) => typeof field !== 'string' || !field.length)) {
        throw new Error('Candlestick requires openField, highField, lowField, and closeField.');
    }
    if (axis.field !== option.closeField || axis.type !== 'number') {
        throw new Error('Candlestick requires a numeric y axis bound to closeField; use y(closeField, "number").');
    }
    return {
        ...axis,
        domainFields: axis.domainFields === undefined || inferred
            ? Array.from(new Set([...(axis.domainFields ?? []), ...fields]))
            : axis.domainFields
    };
};

const buildSimpleBaseConfiguration = <T = any>(
    options: KChartSimpleBaseOptions<T>,
    axes: KChartAxis<T>[],
    series: KChartSeries<T>[]
): KChartConfiguration<T> => ({
    selector: options.selector,
    data: options.data,
    axes,
    series,
    width: options.width,
    height: options.height,
    margin: options.margin,
    colors: options.colors,
    className: options.className,
    title: normalizeTitle(options.title),
    grid: normalizeGrid(options.grid ?? true),
    legend: normalizeLegend(options.legend ?? true),
    tooltip: normalizeTooltip(options.tooltip ?? true),
    animation: options.animation,
    options: options.options,
    autoResize: options.autoResize,
    accessibility: options.accessibility,
    theme: options.theme,
    status: options.status
});

const resolveColumnWidth = <T = any>(
    xScale: KChartAxis<T> & {scale: any},
    dataLength: number,
    plotWidth: number,
    barRatio: number
): number => {
    if (typeof xScale.scale.bandwidth === 'function' && xScale.scale.bandwidth() > 0) {
        return xScale.scale.bandwidth() * barRatio;
    }
    return Math.max(8, plotWidth / Math.max(dataLength, 1) * barRatio);
};

const createColumnPresetSeries = <T = any>(
    selector: string,
    xField: keyof T & string,
    yField: keyof T & string,
    option: KChartColumnPresetOptions = {}
): KChartSeries<T> => {
    option = snapshotSeriesOptions('column', option);
    if (option.baseline !== undefined && !Number.isFinite(option.baseline)) {
        throw new Error('Column baseline must be a finite number.');
    }
    return createCustomSeries<T>({
    selector,
    displayName: option.displayName ?? String(yField),
    xField,
    yField,
    color: option.color,
    render({group, data, xScale, yScale, plotSize, color, animation}) {
        if (!xScale || !yScale) {
            return;
        }

        const progress = animation.enabled ? animation.progress : 1;
        const width = resolveColumnWidth(xScale, data.length, plotSize.width, option.barRatio ?? 0.56);
        const baseline = yScale.scale(resolveColumnBaseline(yScale.scale, option.baseline));

        group.selectAll<SVGRectElement, T>(`rect.${selector}`)
            .data(data)
            .join('rect')
            .attr('class', selector)
            .attr('x', (point) => resolveScalePosition(xScale, point[xField]) - width / 2)
            .attr('y', (point) => {
                const target = yScale.scale(point[yField]);
                return Math.min(baseline, baseline + (target - baseline) * progress);
            })
            .attr('width', width)
            .attr('height', (point) => Math.abs((baseline - yScale.scale(point[yField])) * progress))
            .attr('rx', option.barRadius ?? 5)
            .style('fill', option.color ?? color)
            .style('fill-opacity', 0.86 * progress);
    }
    });
};

const pointOnCircle = (
    centerX: number,
    centerY: number,
    radius: number,
    angle: number
): [number, number] => [
    centerX + Math.cos(angle) * radius,
    centerY + Math.sin(angle) * radius
];

const normalizeAngle = (angle: number): number => {
    let normalized = angle;
    while (normalized < -Math.PI / 2) {
        normalized += Math.PI * 2;
    }
    while (normalized >= Math.PI * 1.5) {
        normalized -= Math.PI * 2;
    }
    return normalized;
};

const createPiePresetSeries = <T = any>(
    selector: string,
    labelField: keyof T & string,
    valueField: keyof T & string,
    option: {
        displayName?: string;
        innerRadiusRatio?: number;
        palette?: string[];
        labelVisible?: boolean;
        sliceLabel?: KChartPieSliceLabelFormatter<T> | KChartPieSliceLabelOptions<T>;
    } = {}
): KChartSeries<T> => {
    option = snapshotSeriesOptions('pie', option);
    type Segment = {
        point: T;
        index: number;
        label: string;
        value: number;
        startAngle: number;
        endAngle: number;
        color: string;
    };

    const createSegments = (data: T[]): Segment[] => {
        const palette = option.palette ?? defaultPalette;
        const total = data.reduce((sum, point) => sum + Math.max(0, Number(point[valueField])), 0) || 1;
        let cursor = -Math.PI / 2;

        return data.map((point, index) => {
            const value = Math.max(0, Number(point[valueField]));
            const angle = value / total * Math.PI * 2;
            const segment: Segment = {
                point,
                index,
                label: String(point[labelField]),
                value,
                startAngle: cursor,
                endAngle: cursor + angle,
                color: palette[index % palette.length]
            };
            cursor += angle;
            return segment;
        });
    };

    const describeSegment = (
        segment: Segment,
        centerX: number,
        centerY: number,
        outerRadius: number,
        innerRadius: number
    ): string => {
        const [outerStartX, outerStartY] = pointOnCircle(centerX, centerY, outerRadius, segment.startAngle);
        const [outerEndX, outerEndY] = pointOnCircle(centerX, centerY, outerRadius, segment.endAngle);
        const largeArcFlag = segment.endAngle - segment.startAngle > Math.PI ? 1 : 0;

        if (innerRadius <= 0) {
            return `M${centerX},${centerY} L${outerStartX},${outerStartY} A${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX},${outerEndY} Z`;
        }

        const [innerEndX, innerEndY] = pointOnCircle(centerX, centerY, innerRadius, segment.endAngle);
        const [innerStartX, innerStartY] = pointOnCircle(centerX, centerY, innerRadius, segment.startAngle);
        return `M${outerStartX},${outerStartY} A${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX},${outerEndY} L${innerEndX},${innerEndY} A${innerRadius},${innerRadius} 0 ${largeArcFlag} 0 ${innerStartX},${innerStartY} Z`;
    };

    type LabelLayout = {
        segment: Segment;
        context: KChartPieSliceLabelContext<T>;
        lines: string[];
        side: -1 | 1;
        x: number;
        y: number;
        targetY: number;
        halfHeight: number;
    };

    const clamp = (value: number, minimum: number, maximum: number): number => Math.min(
        maximum,
        Math.max(minimum, value)
    );

    const resolveSliceLabelOption = (): KChartPieSliceLabelOptions<T> => typeof option.sliceLabel === 'function'
        ? {formatter: option.sliceLabel}
        : option.sliceLabel ?? {};

    const estimateLabelWidth = (lines: string[]): number => Math.max(
        0,
        ...lines.map((line) => Array.from(line).reduce((width, character) => (
            width + (character.charCodeAt(0) > 0xff ? 11 : 6.5)
        ), 0))
    );

    const resolveLabelLayouts = (
        segments: Segment[],
        total: number,
        centerX: number,
        centerY: number,
        outerRadius: number,
        plotSize: KChartSize
    ): LabelLayout[] => {
        const labelOption = resolveSliceLabelOption();
        const position = labelOption.position ?? 'radial';
        const configuredMinPercentage = Number(labelOption.minPercentage ?? 0);
        const minPercentage = Number.isFinite(configuredMinPercentage)
            ? Math.max(0, configuredMinPercentage)
            : 0;
        const configuredMaxVisible = Number(labelOption.maxVisible);
        const maxVisible = Number.isFinite(configuredMaxVisible)
            ? Math.max(0, Math.floor(configuredMaxVisible))
            : undefined;
        const leaderLine = typeof labelOption.leaderLine === 'object'
            ? labelOption.leaderLine
            : {};
        const leaderLength = Math.max(0, leaderLine.length ?? 18);
        const collision = typeof labelOption.collision === 'object'
            ? labelOption.collision
            : {};
        const collisionEnabled = labelOption.collision !== false;
        const minGap = Math.max(0, collision.minGap ?? 16);
        const padding = Math.max(0, collision.padding ?? 8);
        let contexts = segments
            .map((segment): KChartPieSliceLabelContext<T> => ({
                data: segment.point,
                datum: segment.point,
                label: segment.label,
                value: segment.value,
                total,
                percentage: total > 0 ? segment.value / total * 100 : 0,
                index: segment.index,
                color: segment.color
            }))
            .filter((context) => context.percentage >= minPercentage);

        if (maxVisible !== undefined && contexts.length > maxVisible) {
            contexts = contexts
                .sort((left, right) => right.percentage - left.percentage || left.index - right.index)
                .slice(0, maxVisible)
                .sort((left, right) => left.index - right.index);
        }

        const layouts = contexts.map((context): LabelLayout => {
            const segment = segments[context.index];
            const midAngle = (segment.startAngle + segment.endAngle) / 2;
            const side: -1 | 1 = Math.cos(midAngle) < 0 ? -1 : 1;
            const labelRadius = position === 'outside'
                ? outerRadius + leaderLength + 10
                : outerRadius + 28;
            const [radialX, radialY] = pointOnCircle(centerX, centerY, labelRadius, midAngle);
            const output = labelOption.formatter?.(context)
                ?? `${context.label} ${Math.round(context.percentage)}%`;
            const outputLines = (Array.isArray(output) ? output : [output]).map(String);
            const lines = outputLines.length > 0 ? outputLines : [''];
            const estimatedWidth = estimateLabelWidth(lines);
            const rawX = centerX + side * labelRadius;
            const outsideX = side > 0
                ? Math.max(4, Math.min(rawX, plotSize.width - estimatedWidth - 4))
                : Math.min(plotSize.width - 4, Math.max(rawX, estimatedWidth + 4));
            const halfHeight = Math.max(11, lines.length * 12.1) / 2;

            return {
                segment,
                context,
                lines,
                side,
                x: position === 'outside'
                    ? outsideX
                    : radialX,
                y: radialY,
                targetY: radialY,
                halfHeight
            };
        });

        if (position !== 'outside') {
            return layouts;
        }

        for (const side of [-1, 1] as const) {
            const sideLayouts = layouts
                .filter((layout) => layout.side === side)
                .sort((left, right) => left.targetY - right.targetY);

            if (!collisionEnabled) {
                sideLayouts.forEach((layout) => {
                    layout.y = clamp(
                        layout.targetY,
                        padding + layout.halfHeight,
                        Math.max(padding + layout.halfHeight, plotSize.height - padding - layout.halfHeight)
                    );
                });
                continue;
            }

            const totalLabelHeight = sideLayouts.reduce(
                (height, layout) => height + layout.halfHeight * 2,
                0
            );
            const availableGapHeight = Math.max(0, plotSize.height - padding * 2 - totalLabelHeight);
            const gap = sideLayouts.length > 1
                ? Math.min(minGap, availableGapHeight / (sideLayouts.length - 1))
                : 0;
            sideLayouts.forEach((layout, index) => {
                const minimumY = padding + layout.halfHeight;
                const maximumY = Math.max(
                    minimumY,
                    plotSize.height - padding - layout.halfHeight
                );
                const previous = sideLayouts[index - 1];
                layout.y = Math.max(
                    clamp(layout.targetY, minimumY, maximumY),
                    index === 0
                        ? minimumY
                        : previous.y + previous.halfHeight + layout.halfHeight + gap
                );
            });

            if (sideLayouts.length > 0) {
                const lastLayout = sideLayouts[sideLayouts.length - 1];
                lastLayout.y = Math.min(
                    lastLayout.y,
                    plotSize.height - padding - lastLayout.halfHeight
                );
                for (let index = sideLayouts.length - 2; index >= 0; index -= 1) {
                    const current = sideLayouts[index];
                    const next = sideLayouts[index + 1];
                    sideLayouts[index].y = Math.min(
                        current.y,
                        next.y - next.halfHeight - current.halfHeight - gap
                    );
                }
            }
        }

        return layouts;
    };

    return createCustomSeries<T>({
        selector,
        displayName: option.displayName ?? String(valueField),
        xField: labelField,
        yField: valueField,
        render({group, data, plotSize, animation}) {
            const centerX = plotSize.width / 2;
            const centerY = plotSize.height / 2 + 8;
            const outerRadius = Math.max(88, Math.min(plotSize.width, plotSize.height) * 0.34);
            const innerRadius = outerRadius * (option.innerRadiusRatio ?? 0);
            const progress = animation.enabled ? animation.progress : 1;
            const segments = createSegments(data);
            const total = segments.reduce((sum, segment) => sum + segment.value, 0);
            const visibleSegments = segments.map((segment) => ({
                ...segment,
                endAngle: segment.startAngle + (segment.endAngle - segment.startAngle) * progress
            }));

            group.selectAll<SVGPathElement, Segment>(`path.${selector}`)
                .data(visibleSegments)
                .join('path')
                .attr('class', selector)
                .attr('d', (segment) => describeSegment(segment, centerX, centerY, outerRadius, innerRadius))
                .style('fill', (segment) => segment.color)
                .style('fill-opacity', 0.84 * progress)
                .style('stroke', '#101720')
                .style('stroke-width', 2)
                .style('stroke-opacity', progress);

            const labelOption = resolveSliceLabelOption();
            const labelsVisible = labelOption.visible ?? option.labelVisible ?? true;
            if (!labelsVisible) {
                group.selectAll(`text.${selector}-label`).remove();
                group.selectAll(`polyline.${selector}-label-line`).remove();
                return;
            }

            const labelLayouts = resolveLabelLayouts(
                segments,
                total,
                centerX,
                centerY,
                outerRadius,
                plotSize
            );
            const position = labelOption.position ?? 'radial';
            const leaderLine = typeof labelOption.leaderLine === 'object'
                ? labelOption.leaderLine
                : {};
            const leaderLineVisible = position === 'outside'
                && labelOption.leaderLine !== false
                && leaderLine.visible !== false;
            const leaderLength = Math.max(0, leaderLine.length ?? 18);

            group.selectAll<SVGPolylineElement, LabelLayout>(`polyline.${selector}-label-line`)
                .data(leaderLineVisible ? labelLayouts : [])
                .join('polyline')
                .attr('class', `${selector}-label-line`)
                .attr('points', (layout) => {
                    const midAngle = (layout.segment.startAngle + layout.segment.endAngle) / 2;
                    const start = pointOnCircle(centerX, centerY, outerRadius + 2, midAngle);
                    const elbow = pointOnCircle(
                        centerX,
                        centerY,
                        outerRadius + leaderLength * 0.65,
                        midAngle
                    );
                    const endX = layout.x - layout.side * 6;
                    return `${start[0]},${start[1]} ${elbow[0]},${elbow[1]} ${endX},${layout.y}`;
                })
                .style('fill', 'none')
                .style('stroke', (layout) => leaderLine.color ?? layout.context.color)
                .style('stroke-width', leaderLine.width ?? 1)
                .style('stroke-opacity', progress);

            const labelSelection = group.selectAll<SVGTextElement, LabelLayout>(`text.${selector}-label`)
                .data(labelLayouts)
                .join('text')
                .attr('class', `${selector}-label`)
                .attr('data-index', (layout) => layout.context.index)
                .attr('x', (layout) => layout.x)
                .attr('y', (layout) => layout.y)
                .attr('text-anchor', (layout) => position === 'outside'
                    ? layout.side > 0 ? 'start' : 'end'
                    : 'middle')
                .attr('dominant-baseline', 'middle')
                .style('fill', 'rgba(231, 244, 255, 0.86)')
                .style('font-size', '11px')
                .style('font-weight', 700)
                .style('opacity', progress)
                .text((layout) => layout.lines.length === 1 ? layout.lines[0] : '');

            labelSelection
                .filter((layout) => layout.lines.length > 1)
                .selectAll<SVGTSpanElement, {text: string; x: number; index: number; count: number}>('tspan')
                .data((layout) => layout.lines.map((text, index) => ({
                    text,
                    x: layout.x,
                    index,
                    count: layout.lines.length
                })))
                .join('tspan')
                .attr('x', (line) => line.x)
                .attr('dy', (line) => line.index === 0
                    ? `${-(line.count - 1) * 0.55}em`
                    : '1.1em')
                .text((line) => line.text);
        },
        tooltip({data, plotSize, seriesGroup, mouseX, mouseY}) {
            const centerX = plotSize.width / 2;
            const centerY = plotSize.height / 2 + 8;
            const outerRadius = Math.max(88, Math.min(plotSize.width, plotSize.height) * 0.34);
            const innerRadius = outerRadius * (option.innerRadiusRatio ?? 0);
            const distance = Math.hypot(mouseX - centerX, mouseY - centerY);
            const angle = normalizeAngle(Math.atan2(mouseY - centerY, mouseX - centerX));
            const segments = createSegments(data);
            const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

            seriesGroup.selectAll<SVGPathElement, Segment>(`path.${selector}`)
                .style('fill-opacity', 0.84)
                .style('stroke', '#101720');

            if (distance > outerRadius || distance < innerRadius) {
                return undefined;
            }

            const segment = segments.find((item) => angle >= item.startAngle && angle <= item.endAngle);
            if (!segment) {
                return undefined;
            }

            seriesGroup.selectAll<SVGPathElement, Segment>(`path.${selector}`)
                .filter((item) => item.point === segment.point)
                .style('fill-opacity', 1)
                .style('stroke', '#f8fbff');

            const midAngle = (segment.startAngle + segment.endAngle) / 2;
            const tooltipRadius = innerRadius > 0 ? (innerRadius + outerRadius) / 2 : outerRadius * 0.62;
            const [x, y] = pointOnCircle(centerX, centerY, tooltipRadius, midAngle);
            const share = Math.round(segment.value / total * 100);

            return {
                data: segment.point,
                x,
                y,
                distance: 0,
                color: segment.color,
                html: `<strong style="color:${segment.color}">${segment.label}</strong><br/>value: ${segment.value.toFixed(1)}<br/>share: ${share}%`
            };
        },
        clearTooltip({seriesGroup}) {
            seriesGroup.selectAll<SVGPathElement, Segment>(`path.${selector}`)
                .style('fill-opacity', 0.84)
                .style('stroke', '#101720');
        }
    });
};

const createLinePresetSeries = <T>(
    selector: string,
    xField: keyof T & string,
    yField: keyof T & string,
    options: KChartLinePresetOptions<T>,
    strictOptions = false
): KChartSeries<T> => {
    options = snapshotSeriesOptions('line', options);
    const renderer = validateLineRenderer(options, strictOptions);
    return renderer === 'canvas'
        ? createCanvasLineSeries<T>({
            selector,
            displayName: options.displayName ?? String(yField),
            xField,
            yField,
            color: options.color,
            lineWidth: options.lineWidth ?? options.strokeWidth,
            canvasName: options.canvasName,
            downsample: options.downsample
        })
        : renderer === 'webgl'
            ? createWebglLineSeries<T>({
                selector,
                displayName: options.displayName ?? String(yField),
                xField,
                yField,
                color: options.color,
                lineWidth: options.lineWidth ?? options.strokeWidth,
                canvasName: options.canvasName,
                downsample: options.downsample
            })
            : createLineSeries<T>({
                selector,
                displayName: options.displayName ?? String(yField),
                xField,
                yField,
                color: options.color,
                strokeWidth: options.strokeWidth ?? options.lineWidth,
                curve: options.curve ?? true,
                dot: options.dot ?? true,
                downsample: options.downsample
            });

};

export const createLineChart = <T = any>(
    options: KChartLineChartOptions<T>
): KChartController<T> => {
    validateStandaloneOptions('line', options);
    const xAxis = normalizeAxis(options.x, 'bottom', 'point');
    const yAxis = normalizeAxis(options.y, 'left', 'number');
    const series = createLinePresetSeries<T>(
        safeSelector(`${String(yAxis.field)}-${options.renderer ?? 'svg'}-line`),
        xAxis.field,
        yAxis.field,
        options,
        options.strictOptions
    );
    const config = buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series]);
    return createKChart(config).render();
};

export const createColumnChart = <T = any>(
    options: KChartColumnChartOptions<T>
): KChartController<T> => {
    validateStandaloneOptions('column', options);
    const xAxis = normalizeAxis(options.x, 'bottom', 'point');
    const yAxis = normalizeAxis(options.y, 'left', 'number');
    const series = createColumnPresetSeries<T>(
        safeSelector(`${String(yAxis.field)}-column`),
        xAxis.field,
        yAxis.field,
        options
    );
    const config = buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series]);
    return createKChart(config).render();
};

export const createAreaChart = <T = any>(options: KChartAreaChartOptions<T>): KChartController<T> => {
    const xAxis = normalizeAxis(options.x, 'bottom', 'point');
    const yAxis = normalizeAxis(options.y, 'left', 'number');
    const series = createAreaSeries<T>({
        ...snapshotSeriesOptions('area', options),
        selector: safeSelector(`${String(yAxis.field)}-area`),
        displayName: options.displayName ?? String(yAxis.field),
        xField: xAxis.field,
        yField: yAxis.field
    });
    return createKChart(buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series])).render();
};

export const createScatterChart = <T = any>(options: KChartScatterChartOptions<T>): KChartController<T> => {
    const xAxis = normalizeAxis(options.x, 'bottom', 'number');
    const yAxis = normalizeAxis(options.y, 'left', 'number');
    const series = createScatterSeries<T>({
        ...snapshotSeriesOptions('scatter', options),
        selector: safeSelector(`${String(yAxis.field)}-scatter`),
        displayName: options.displayName ?? String(yAxis.field),
        xField: xAxis.field,
        yField: yAxis.field
    });
    return createKChart(buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series])).render();
};

export const createBubbleChart = <T = any>(options: KChartBubbleChartOptions<T>): KChartController<T> => {
    const xAxis = normalizeAxis(options.x, 'bottom', 'number');
    const yAxis = normalizeAxis(options.y, 'left', 'number');
    const series = createBubbleSeries<T>({
        ...snapshotSeriesOptions('bubble', options),
        selector: safeSelector(`${String(yAxis.field)}-bubble`),
        displayName: options.displayName ?? String(yAxis.field),
        xField: xAxis.field,
        yField: yAxis.field
    });
    return createKChart(buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series])).render();
};

export const createBarChart = <T = any>(options: KChartBarChartOptions<T>): KChartController<T> => {
    const xAxis = normalizeAxis(options.x, 'bottom', 'number');
    const yAxis = normalizeAxis(options.y, 'left', 'point');
    const series = createBarSeries<T>({
        ...snapshotSeriesOptions('bar', options),
        selector: safeSelector(`${String(xAxis.field)}-bar`),
        displayName: options.displayName ?? String(xAxis.field),
        xField: xAxis.field,
        yField: yAxis.field
    });
    return createKChart(buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series])).render();
};

export const createCandlestickChart = <T = any>(options: KChartCandlestickChartOptions<T>): KChartController<T> => {
    const xAxis = normalizeAxis(options.x, 'bottom', 'point');
    const yAxis = candlestickAxis(normalizeAxis(options.y ?? options.closeField, 'left', 'number'), options);
    const series = createCanvasCandlestickSeries<T>({
        ...snapshotSeriesOptions('candlestick', options),
        selector: safeSelector(`${String(options.closeField)}-candlestick`),
        displayName: options.displayName ?? String(options.closeField),
        xField: xAxis.field
    });
    return createKChart(buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series])).render();
};

export const createPieChart = <T = any>(
    options: KChartPieChartOptions<T>
): KChartController<T> => {
    validateStandaloneOptions('pie', options);
    const series = createPiePresetSeries<T>(
        safeSelector(`${String(options.value)}-pie`),
        options.label,
        options.value,
        options
    );
    const config = buildSimpleBaseConfiguration(options, [], [series]);
    return createKChart(config).render();
};

export const createDoughnutChart = <T = any>(
    options: KChartPieChartOptions<T>
): KChartController<T> => createPieChart({
    ...options,
    innerRadiusRatio: options.innerRadiusRatio ?? 0.56
});

export function chartConfig<T = any>(data: T[], options: {strictOptions?: boolean} = {}): KChartConfigBuilder<T> {
    const inferredCandlestickAxes = new WeakSet<KChartAxis<T>>();
    const draft: {
        selector?: string | HTMLElement;
        width?: number;
        height?: number;
        margin?: Partial<KChartMargin>;
        title?: string | KChartTitleConfiguration;
        grid?: boolean | KChartGridConfiguration;
        legend?: boolean | KChartLegendConfiguration;
        tooltip?: boolean | KChartTooltipConfiguration<T>;
        animation?: boolean | KChartAnimationConfiguration;
        axes: KChartAxis<T>[];
        series: KChartSeries<T>[];
        options: KChartOption<T>[];
    } = {
        axes: [],
        series: [],
        options: []
    };

    const upsertAxis = (
        axis: KChartAxis<T>
    ): void => {
        const index = draft.axes.findIndex((item) => item.placement === axis.placement);
        if (index >= 0) {
            draft.axes[index] = axis;
            return;
        }
        draft.axes.push(axis);
    };

    const getAxis = (
        placement: KChartAxis<T>['placement']
    ): KChartAxis<T> | undefined => draft.axes.find((axis) => axis.placement === placement);

    const nextSelector = (name: string): string => {
        const base = safeSelector(name);
        let selector = base;
        let index = 2;
        while (draft.series.some((series) => series.selector === selector)) {
            selector = `${base}-${index++}`;
        }
        return selector;
    };

    const cartesianAxes = (kind: string): [KChartAxis<T>, KChartAxis<T>] => {
        const xAxis = getAxis('bottom');
        const yAxis = getAxis('left');
        if (!xAxis || !yAxis) {
            throw new Error(`chartConfig(...).${kind}() requires x(...) and y(...) first.`);
        }
        return [xAxis, yAxis];
    };

    const builder: KChartConfigBuilder<T> = {
        selector(selector) {
            draft.selector = selector;
            return builder;
        },
        size(width, height) {
            draft.width = width;
            draft.height = height;
            return builder;
        },
        margin(margin) {
            draft.margin = margin;
            return builder;
        },
        title(title) {
            draft.title = title;
            return builder;
        },
        grid(grid = true) {
            draft.grid = grid;
            return builder;
        },
        legend(legend = true) {
            draft.legend = legend;
            return builder;
        },
        tooltip(tooltip = true) {
            draft.tooltip = tooltip;
            return builder;
        },
        animation(animation = true) {
            draft.animation = animation;
            return builder;
        },
        x(field, type = 'point', option = {}) {
            upsertAxis({
                ...option,
                field,
                type,
                placement: 'bottom'
            });
            return builder;
        },
        y(field, type = 'number', option = {}) {
            upsertAxis({
                ...option,
                field,
                type,
                placement: 'left'
            });
            return builder;
        },
        line(option: Partial<KChartLineChartOptions<T>> = {}) {
            if (options.strictOptions) validateSeriesOptions('line', option);
            const [xAxis, yAxis] = cartesianAxes('line');
            const renderer = validateLineRenderer(option, options.strictOptions);
            const selector = option.displayName
                ? `${String(option.displayName).toLowerCase().replace(/\s+/g, '-')}-line`
                : `${String(yAxis.field)}-${renderer}-line`;
            draft.series.push(createLinePresetSeries(nextSelector(selector), xAxis.field, yAxis.field, option, options.strictOptions));
            return builder;
        },
        column(option: Partial<KChartColumnChartOptions<T>> = {}) {
            if (options.strictOptions) validateSeriesOptions('column', option);
            const [xAxis, yAxis] = cartesianAxes('column');
            draft.series.push(createColumnPresetSeries<T>(
                nextSelector(`${String(yAxis.field)}-column`),
                xAxis.field,
                yAxis.field,
                option
            ));
            return builder;
        },
        area(option = {}) {
            validateSeriesOptions('area', option);
            const [xAxis, yAxis] = cartesianAxes('area');
            draft.series.push(createAreaSeries<T>({
                ...snapshot(option),
                selector: nextSelector(`${String(yAxis.field)}-area`),
                displayName: option.displayName ?? String(yAxis.field),
                xField: xAxis.field,
                yField: yAxis.field
            }));
            return builder;
        },
        scatter(option = {}) {
            validateSeriesOptions('scatter', option);
            const [xAxis, yAxis] = cartesianAxes('scatter');
            draft.series.push(createScatterSeries<T>({
                ...snapshot(option),
                selector: nextSelector(`${String(yAxis.field)}-scatter`),
                displayName: option.displayName ?? String(yAxis.field),
                xField: xAxis.field,
                yField: yAxis.field
            }));
            return builder;
        },
        bubble(option = {}) {
            validateSeriesOptions('bubble', option);
            const [xAxis, yAxis] = cartesianAxes('bubble');
            draft.series.push(createBubbleSeries<T>({
                ...snapshot(option),
                selector: nextSelector(`${String(yAxis.field)}-bubble`),
                displayName: option.displayName ?? String(yAxis.field),
                xField: xAxis.field,
                yField: yAxis.field
            }));
            return builder;
        },
        bar(option = {}) {
            validateSeriesOptions('bar', option);
            const [xAxis, yAxis] = cartesianAxes('bar');
            draft.series.push(createBarSeries<T>({
                ...snapshotSeriesOptions('bar', option),
                selector: nextSelector(`${String(xAxis.field)}-bar`),
                displayName: option.displayName ?? String(xAxis.field),
                xField: xAxis.field,
                yField: yAxis.field
            }));
            return builder;
        },
        candlestick(option) {
            validateSeriesOptions('candlestick', option);
            const [xAxis, yAxis] = cartesianAxes('candlestick');
            const inferred = yAxis.domainFields === undefined || inferredCandlestickAxes.has(yAxis);
            const axis = candlestickAxis(yAxis, option, inferred);
            draft.series.push(createCanvasCandlestickSeries<T>({
                ...snapshotSeriesOptions('candlestick', option),
                selector: nextSelector(`${String(option.closeField)}-candlestick`),
                displayName: option.displayName ?? String(option.closeField),
                xField: xAxis.field
            }));
            if (inferred) {
                inferredCandlestickAxes.add(axis);
            }
            upsertAxis(axis);
            return builder;
        },
        pie(option) {
            if (options.strictOptions) validateSeriesOptions('pie', option);
            draft.axes = [];
            draft.series.push(createPiePresetSeries<T>(
                nextSelector(`${String(option.value)}-pie`),
                option.label,
                option.value,
                option
            ));
            return builder;
        },
        doughnut(option) {
            if (options.strictOptions) validateSeriesOptions('pie', option);
            draft.axes = [];
            draft.series.push(createPiePresetSeries<T>(
                nextSelector(`${String(option.value)}-doughnut`),
                option.label,
                option.value,
                {
                    ...option,
                    innerRadiusRatio: option.innerRadiusRatio ?? 0.56
                }
            ));
            return builder;
        },
        series(series) {
            draft.series.push(...(Array.isArray(series) ? series : [series]));
            return builder;
        },
        option(option) {
            draft.options.push(...(Array.isArray(option) ? option : [option]));
            return builder;
        },
        build(overrides = {}) {
            if (!draft.selector && !overrides.selector) {
                throw new Error('chartConfig(...).build() requires selector(...) or build({ selector }).');
            }
            if (draft.series.length === 0 && !overrides.series) {
                throw new Error('chartConfig(...).build() requires at least one series method.');
            }

            const {data: builtData, series: builtSeries, ...configuration} = {
                selector: (overrides.selector ?? draft.selector) as string | HTMLElement,
                data,
                axes: draft.axes,
                series: draft.series,
                margin: draft.margin,
                title: normalizeTitle(draft.title),
                grid: normalizeGrid(draft.grid ?? true),
                legend: normalizeLegend(draft.legend ?? true),
                tooltip: normalizeTooltip(draft.tooltip ?? true),
                animation: draft.animation,
                options: draft.options,
                width: draft.width,
                height: draft.height,
                ...overrides
            };
            return {...snapshot(configuration), data: builtData, series: builtSeries.slice()};
        },
        render(overrides = {}) {
            return createKChart(builder.build(overrides)).render();
        }
    };

    return builder;
}
