import type {
    KChartCanvasPointSeriesConfiguration,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {resolveScalePosition} from './support/scale';

export const createCanvasPointSeries = <T = any>(
    configuration: KChartCanvasPointSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    render({getCanvas, data, xScale, yScale, color}) {
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
            if (
                point[configuration.xField] === undefined ||
                point[configuration.yField] === undefined
            ) {
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
    destroy({svg}) {
        const parent = svg.node()?.parentElement;
        if (parent) {
            parent.querySelector(
                `canvas.kchart-2d-canvas-${configuration.canvasName ?? configuration.selector}`
            )?.remove();
        }
    }
});
