import type {
    KChartAnimationConfiguration,
    KChartAxis,
    KChartConfiguration,
    KChartController,
    KChartGridConfiguration,
    KChartLegendConfiguration,
    KChartMargin,
    KChartOption,
    KChartScaleType,
    KChartSeries,
    KChartSize,
    KChartTitleConfiguration,
    KChartTooltipConfiguration
} from '../core/contracts';
import {createKChart} from '../core/create-kchart';
import {createCanvasLineSeries} from '../series/canvas-line';
import {createCustomSeries} from '../series/custom';
import {createLineSeries} from '../series/svg-line';
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
    tickCount?: number;
    tickFormat?: (value: any) => string;
}

export interface KChartSimpleBaseOptions<T = any> {
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
}

export interface KChartLineChartOptions<T = any> extends KChartSimpleBaseOptions<T> {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y: keyof T & string | KChartSimpleAxisOption<T>;
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

export interface KChartColumnChartOptions<T = any> extends KChartSimpleBaseOptions<T> {
    x: keyof T & string | KChartSimpleAxisOption<T>;
    y: keyof T & string | KChartSimpleAxisOption<T>;
    displayName?: string;
    color?: string;
    barRadius?: number;
    barRatio?: number;
}

export interface KChartPieChartOptions<T = any> extends KChartSimpleBaseOptions<T> {
    label: keyof T & string;
    value: keyof T & string;
    displayName?: string;
    innerRadiusRatio?: number;
    palette?: string[];
    labelVisible?: boolean;
}

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
    line(option?: Partial<KChartLineChartOptions<T>>): KChartConfigBuilder<T>;
    column(option?: Partial<KChartColumnChartOptions<T>>): KChartConfigBuilder<T>;
    pie(option: {
        label: keyof T & string;
        value: keyof T & string;
    } & Partial<KChartPieChartOptions<T>>): KChartConfigBuilder<T>;
    doughnut(option: {
        label: keyof T & string;
        value: keyof T & string;
    } & Partial<KChartPieChartOptions<T>>): KChartConfigBuilder<T>;
    series(series: KChartSeries<T> | KChartSeries<T>[]): KChartConfigBuilder<T>;
    option(option: KChartOption<T> | KChartOption<T>[]): KChartConfigBuilder<T>;
    build(overrides?: KChartSimpleBuildOptions<T>): KChartConfiguration<T>;
    render(overrides?: KChartSimpleBuildOptions<T>): KChartController<T>;
}

const defaultPalette = ['#5db8ff', '#56d08f', '#f3b45b', '#d876ff', '#ff6b8a', '#72e4ff'];

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
    options: options.options
});

const resolveColumnWidth = <T = any>(
    xScale: KChartAxis<T> & {scale: any},
    dataLength: number,
    plotWidth: number,
    barRatio: number
): number => {
    if (typeof xScale.scale.bandwidth === 'function') {
        return xScale.scale.bandwidth() * barRatio;
    }
    return Math.max(8, plotWidth / Math.max(dataLength, 1) * barRatio);
};

const createColumnPresetSeries = <T = any>(
    selector: string,
    xField: keyof T & string,
    yField: keyof T & string,
    option: {
        displayName?: string;
        color?: string;
        barRadius?: number;
        barRatio?: number;
    } = {}
): KChartSeries<T> => createCustomSeries<T>({
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
        const baseline = yScale.scale(0);

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
    } = {}
): KChartSeries<T> => {
    type Segment = {
        point: T;
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
            const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
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

            if (option.labelVisible === false) {
                group.selectAll(`text.${selector}-label`).remove();
                return;
            }

            group.selectAll<SVGTextElement, Segment>(`text.${selector}-label`)
                .data(segments)
                .join('text')
                .attr('class', `${selector}-label`)
                .attr('x', (segment) => pointOnCircle(centerX, centerY, outerRadius + 28, (segment.startAngle + segment.endAngle) / 2)[0])
                .attr('y', (segment) => pointOnCircle(centerX, centerY, outerRadius + 28, (segment.startAngle + segment.endAngle) / 2)[1])
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .style('fill', 'rgba(231, 244, 255, 0.86)')
                .style('font-size', '11px')
                .style('font-weight', 700)
                .style('opacity', progress)
                .text((segment) => `${segment.label} ${Math.round(segment.value / total * 100)}%`);
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

export const createLineChart = <T = any>(
    options: KChartLineChartOptions<T>
): KChartController<T> => {
    const xAxis = normalizeAxis(options.x, 'bottom', 'point');
    const yAxis = normalizeAxis(options.y, 'left', 'number');
    const xField = xAxis.field;
    const yField = yAxis.field;
    const renderer = options.renderer ?? 'svg';
    const selector = `${String(yField)}-${renderer}-line`;
    const series = renderer === 'canvas'
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
                strokeWidth: options.strokeWidth,
                curve: options.curve ?? true,
                dot: options.dot ?? true,
                downsample: options.downsample
            });

    const config = buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series]);
    return createKChart(config).render();
};

export const createColumnChart = <T = any>(
    options: KChartColumnChartOptions<T>
): KChartController<T> => {
    const xAxis = normalizeAxis(options.x, 'bottom', 'point');
    const yAxis = normalizeAxis(options.y, 'left', 'number');
    const series = createColumnPresetSeries<T>(
        `${String(yAxis.field)}-column`,
        xAxis.field,
        yAxis.field,
        options
    );
    const config = buildSimpleBaseConfiguration(options, [xAxis, yAxis], [series]);
    return createKChart(config).render();
};

export const createPieChart = <T = any>(
    options: KChartPieChartOptions<T>
): KChartController<T> => {
    const series = createPiePresetSeries<T>(
        `${String(options.value)}-pie`,
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

export const chartConfig = <T = any>(data: T[]): KChartConfigBuilder<T> => {
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
        line(option = {}) {
            const xAxis = getAxis('bottom');
            const yAxis = getAxis('left');
            if (!xAxis || !yAxis) {
                throw new Error('chartConfig(...).line() requires x(...) and y(...) first.');
            }
            const renderer = option.renderer ?? 'svg';
            const selector = option.displayName
                ? `${String(option.displayName).toLowerCase().replace(/\s+/g, '-')}-line`
                : `${String(yAxis.field)}-${renderer}-line`;
            draft.series.push(renderer === 'canvas'
                ? createCanvasLineSeries<T>({
                    selector,
                    displayName: option.displayName ?? String(yAxis.field),
                    xField: xAxis.field,
                    yField: yAxis.field,
                    color: option.color,
                    lineWidth: option.lineWidth ?? option.strokeWidth,
                    canvasName: option.canvasName,
                    downsample: option.downsample
                })
                : renderer === 'webgl'
                    ? createWebglLineSeries<T>({
                        selector,
                        displayName: option.displayName ?? String(yAxis.field),
                        xField: xAxis.field,
                        yField: yAxis.field,
                        color: option.color,
                        lineWidth: option.lineWidth ?? option.strokeWidth,
                        canvasName: option.canvasName,
                        downsample: option.downsample
                    })
                    : createLineSeries<T>({
                        selector,
                        displayName: option.displayName ?? String(yAxis.field),
                        xField: xAxis.field,
                        yField: yAxis.field,
                        color: option.color,
                        strokeWidth: option.strokeWidth,
                        curve: option.curve ?? true,
                        dot: option.dot ?? true,
                        downsample: option.downsample
                    }));
            return builder;
        },
        column(option = {}) {
            const xAxis = getAxis('bottom');
            const yAxis = getAxis('left');
            if (!xAxis || !yAxis) {
                throw new Error('chartConfig(...).column() requires x(...) and y(...) first.');
            }
            draft.series.push(createColumnPresetSeries<T>(
                `${String(yAxis.field)}-column`,
                xAxis.field,
                yAxis.field,
                option
            ));
            return builder;
        },
        pie(option) {
            draft.axes = [];
            draft.series.push(createPiePresetSeries<T>(
                `${String(option.value)}-pie`,
                option.label,
                option.value,
                option
            ));
            return builder;
        },
        doughnut(option) {
            draft.axes = [];
            draft.series.push(createPiePresetSeries<T>(
                `${String(option.value)}-doughnut`,
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

            return {
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
        },
        render(overrides = {}) {
            return createKChart(builder.build(overrides)).render();
        }
    };

    return builder;
};
