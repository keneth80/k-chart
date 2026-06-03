import { extent } from 'd3-array';
import { axisBottom, axisLeft, axisRight, axisTop } from 'd3-axis';
import { scaleBand, scaleLinear, scalePoint, scaleTime } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';
import { BaseType, pointer, select, Selection } from 'd3-selection';
import { curveMonotoneX, line as d3Line } from 'd3-shape';

export type KChartScaleType = 'number' | 'time' | 'string' | 'point';
export type KChartPlacement = 'top' | 'right' | 'bottom' | 'left';
export type KChartTextAlign = 'left' | 'center' | 'right';
export type KChartLegendPlacement = 'top' | 'right' | 'bottom';

export interface KChartAxis<T = any> {
    field: keyof T & string;
    type: KChartScaleType;
    placement: KChartPlacement;
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

export interface KChartSeries<T = any> {
    selector: string;
    displayName?: string;
    xField?: keyof T & string;
    yField?: keyof T & string;
    color?: string;
    render(context: KChartRenderContext<T>): void;
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
}

export interface KChartCanvasLineSeriesConfiguration<T = any> {
    selector: string;
    displayName?: string;
    xField: keyof T & string;
    yField: keyof T & string;
    color?: string;
    lineWidth?: number;
    canvasName?: string;
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
    series: KChartSeries<T>[];
    size: KChartSize;
    plotSize: KChartSize;
    margin: KChartMargin;
    colors: string[];
    scales: KChartResolvedScale<T>[];
    layers: KChartLayerContext;
    hiddenSeries: Set<string>;
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
    const canvas = container.selectAll<HTMLCanvasElement, unknown>(`canvas.${className}`)
        .data([undefined])
        .join('canvas')
        .attr('class', className)
        .style('position', 'absolute')
        .style('z-index', 1)
        .style('pointer-events', 'none')
        .style('left', `${margin.left}px`)
        .style('top', `${margin.top}px`)
        .style('width', `${Math.max(size.width - margin.left - margin.right, 0)}px`)
        .style('height', `${Math.max(size.height - margin.top - margin.bottom, 0)}px`)
        .node();

    canvas.width = Math.max(size.width - margin.left - margin.right, 0);
    canvas.height = Math.max(size.height - margin.top - margin.bottom, 0);

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

    const values = data.map((item: T) => {
        const value = item[axis.field];
        return axis.type === 'time'
            ? new Date(value as any)
            : Number(value);
    });
    const [minValue, maxValue] = extent(values as any[]);

    return [
        axis.min ?? minValue ?? 0,
        axis.max ?? maxValue ?? 1
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
    const position = scale.scale(value);

    return typeof scale.scale.bandwidth === 'function'
        ? position + scale.scale.bandwidth() / 2
        : position;
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

const renderTooltip = <T = any>(state: KChartState<T>): void => {
    const tooltipEnabled = state.config.tooltip?.visible === true;
    const cursorGuide = getCursorGuide(state);
    const guideEnabled = cursorGuide?.visible === true;
    const enabled = tooltipEnabled || guideEnabled;
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
                            color: series.color ?? state.colors[index % state.colors.length],
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
                                    color: series.color ?? state.colors[index % state.colors.length],
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
                .html(formatTooltip(state, nearest.data, nearest.series, nearest.color))
                .style('left', `${state.margin.left + nearest.x + 12}px`)
                .style('top', `${state.margin.top + nearest.y + 12}px`)
                .style('opacity', 1);
        })
        .on('mouseleave', () => {
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

        series.render({
            ...state.layers,
            group: seriesGroup,
            seriesGroup,
            data: state.data,
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
    render({ getCanvas, data, xScale, yScale, color }) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getCanvas(configuration.canvasName ?? configuration.selector);
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
        const parent = svg.node()?.parentElement;
        if (parent) {
            select(parent).selectAll(`canvas.kchart-2d-canvas-${configuration.canvasName ?? configuration.selector}`).remove();
        }
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
        const parent = svg.node()?.parentElement;
        if (parent) {
            select(parent).selectAll(`canvas.kchart-2d-canvas-${configuration.canvasName ?? configuration.selector}`).remove();
        }
    }
});

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

        const vertices: number[] = [];
        const sizes: number[] = [];
        data.forEach((point: T) => {
            if (point[configuration.xField] === undefined || point[configuration.yField] === undefined) {
                return;
            }

            const x = resolveScalePosition(xScale, point[configuration.xField]);
            const y = resolveScalePosition(yScale, point[configuration.yField]);
            vertices.push((x / canvas.width) * 2 - 1, 1 - (y / canvas.height) * 2);
            sizes.push(typeof configuration.pointSize === 'function'
                ? configuration.pointSize(point)
                : configuration.pointSize ?? 8);
        });

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const sizeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.STATIC_DRAW);
        const sizeLocation = gl.getAttribLocation(program, 'a_size');
        gl.enableVertexAttribArray(sizeLocation);
        gl.vertexAttribPointer(sizeLocation, 1, gl.FLOAT, false, 0, 0);

        const colorLocation = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(colorLocation, new Float32Array(parseColor(configuration.color ?? color)));
        gl.drawArrays(gl.POINTS, 0, sizes.length);
    },
    destroy({ svg }) {
        const parent = svg.node()?.parentElement;
        if (parent) {
            select(parent).selectAll(`canvas.kchart-webgl-canvas-${configuration.canvasName ?? configuration.selector}`).remove();
        }
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

        const vertices: number[] = [];
        data.forEach((point: T) => {
            if (point[configuration.xField] === undefined || point[configuration.yField] === undefined) {
                return;
            }

            const x = resolveScalePosition(xScale, point[configuration.xField]);
            const y = resolveScalePosition(yScale, point[configuration.yField]);
            vertices.push((x / canvas.width) * 2 - 1, 1 - (y / canvas.height) * 2);
        });

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.lineWidth(configuration.lineWidth ?? 1);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        const colorLocation = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(colorLocation, new Float32Array(parseColor(configuration.color ?? color)));
        gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);
    },
    destroy({ svg }) {
        const parent = svg.node()?.parentElement;
        if (parent) {
            select(parent).selectAll(`canvas.kchart-webgl-canvas-${configuration.canvasName ?? configuration.selector}`).remove();
        }
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
        axes: config.axes,
        series: config.series,
        size: sizes.size,
        plotSize: sizes.plotSize,
        margin: sizes.margin,
        colors: config.colors ?? schemeCategory10.slice(),
        scales: [],
        layers: undefined as any,
        hiddenSeries: new Set<string>()
    };
    state.layers = createLayers(container, config, () => state.size, () => state.margin);

    const controller: KChartController<T> = {
        render() {
            render(state);
            return controller;
        },
        updateData(data: T[]) {
            state.data = data;
            return controller.render();
        },
        updateAxes(axes: KChartAxis<T>[]) {
            state.axes = axes;
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
