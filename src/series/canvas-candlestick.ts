import type {
    KChartCanvasCandlestickSeriesConfiguration,
    KChartResolvedScale,
    KChartSeries,
    KChartSize
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {resolveScalePosition} from './support/scale';

const clampNumber = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const resolveCandleWidth = <T>(
    data: T[],
    xScale: KChartResolvedScale<T>,
    xField: keyof T & string,
    plotSize: KChartSize,
    configuration: Pick<
        KChartCanvasCandlestickSeriesConfiguration<T>,
        'candleWidth' | 'minCandleWidth' | 'maxCandleWidth'
    >
): number => {
    if (typeof configuration.candleWidth === 'number') {
        return configuration.candleWidth;
    }
    if (typeof configuration.candleWidth === 'function') {
        return configuration.candleWidth({data, xScale, plotSize});
    }

    const minWidth = configuration.minCandleWidth ?? 3;
    const maxWidth = configuration.maxCandleWidth ?? 18;
    if (typeof xScale.scale.bandwidth === 'function') {
        return clampNumber(xScale.scale.bandwidth() * 0.72, minWidth, maxWidth);
    }

    const positions = data
        .map((point) => resolveScalePosition(xScale, point[xField]))
        .filter(Number.isFinite)
        .sort((left, right) => left - right);
    let minDistance = Number.POSITIVE_INFINITY;

    for (let index = 1; index < positions.length; index += 1) {
        const distance = positions[index] - positions[index - 1];
        if (distance > 0 && distance < minDistance) {
            minDistance = distance;
        }
    }

    const availableWidth = Number.isFinite(minDistance)
        ? minDistance
        : plotSize.width / Math.max(data.length, 1);
    return clampNumber(availableWidth * 0.72, minWidth, maxWidth);
};

const resolveCandleColor = <T>(
    point: T,
    previousPoint: T | undefined,
    configuration: Pick<
        KChartCanvasCandlestickSeriesConfiguration<T>,
        | 'openField'
        | 'closeField'
        | 'colorMode'
        | 'previousCloseField'
        | 'upColor'
        | 'downColor'
        | 'neutralColor'
    >,
    fallbackColor: string
): string => {
    const previousCloseFromField = configuration.previousCloseField
        ? Number(point[configuration.previousCloseField])
        : undefined;
    const previousCloseFromPoint = previousPoint
        ? Number(previousPoint[configuration.closeField])
        : undefined;
    const open = configuration.colorMode === 'previous-close'
        ? (
            Number.isFinite(previousCloseFromField)
                ? previousCloseFromField
                : previousCloseFromPoint
        )
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

const formatTooltipValue = (value: any): string => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue)
        ? numberValue.toLocaleString(undefined, {maximumFractionDigits: 4})
        : String(value);
};

export const createCanvasCandlestickSeries = <T = any>(
    configuration: KChartCanvasCandlestickSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.closeField,
    color: configuration.neutralColor,
    render({getCanvas, data, xScale, yScale, color, plotSize}) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getCanvas(configuration.canvasName ?? configuration.selector);
        const context = canvas.getContext('2d');
        if (!context) {
            return;
        }

        const candleWidth = resolveCandleWidth(
            data,
            xScale,
            configuration.xField,
            plotSize,
            configuration
        );
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

            if (
                ![open, high, low, close].every(Number.isFinite) ||
                point[configuration.xField] === undefined
            ) {
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

            const candleColor = resolveCandleColor(
                point,
                data[index - 1],
                configuration,
                color
            );
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
    tooltip({data, scales, mouseX, mouseY, color, plotSize}) {
        const xScale = scales.find(
            (scale: KChartResolvedScale<T>) =>
                scale.field === configuration.xField
        );
        const yScale = scales.find(
            (scale: KChartResolvedScale<T>) =>
                scale.field === configuration.closeField
        ) ?? scales.find(
            (scale: KChartResolvedScale<T>) =>
                scale.placement === 'left' || scale.placement === 'right'
        );
        if (!xScale || !yScale) {
            return null;
        }

        const candleWidth = resolveCandleWidth(
            data,
            xScale,
            configuration.xField,
            plotSize,
            configuration
        );
        const hitRadius = Math.max(candleWidth * 0.7, 14);
        let nearest: {
            data: T;
            previousData?: T;
            x: number;
            y: number;
            distance: number;
        } | null = null;

        data.forEach((point: T, index: number) => {
            if (
                point[configuration.xField] === undefined ||
                point[configuration.closeField] === undefined
            ) {
                return;
            }

            const x = resolveScalePosition(xScale, point[configuration.xField]);
            const y = resolveScalePosition(yScale, point[configuration.closeField]);
            const distance = Math.abs(mouseX - x);
            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                distance > hitRadius
            ) {
                return;
            }

            const totalDistance = distance + Math.abs(mouseY - y) * 0.08;
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
        const candleColor = resolveCandleColor(
            point,
            nearest.previousData,
            configuration,
            color
        );
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
                `<strong style="color:${candleColor}">${configuration.displayName ?? configuration.selector}</strong>`,
                `x: ${String(point[configuration.xField])}`,
                configuration.colorMode === 'previous-close'
                    ? `previous close: ${formatTooltipValue(previousClose)}`
                    : '',
                `open: ${formatTooltipValue(point[configuration.openField])}`,
                `high: ${formatTooltipValue(point[configuration.highField])}`,
                `low: ${formatTooltipValue(point[configuration.lowField])}`,
                `close: ${formatTooltipValue(point[configuration.closeField])}`
            ].filter(Boolean).join('<br/>')
        };
    },
    destroy({svg}) {
        const parent = svg.node()?.parentElement;
        if (parent) {
            parent.querySelector(
                `canvas.kchart-2d-canvas-${configuration.canvasName ?? configuration.selector}`
            )?.remove();
        }
    }
});
