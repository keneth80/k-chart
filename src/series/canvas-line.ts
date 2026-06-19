import type {
    KChartCanvasLineSeriesConfiguration,
    KChartSeries
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {
    destroyCanvasByClass,
    renderLineWithWorker,
    resolveCanvasPixelSize,
    resolveLinePoints
} from './support/canvas';
import {resolveScalePosition} from './support/scale';

export const createCanvasLineSeries = <T = any>(
    configuration: KChartCanvasLineSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    downsample: configuration.downsample,
    render({getCanvas, data, xScale, yScale, color}) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getCanvas(configuration.canvasName ?? configuration.selector);
        const canvasSize = resolveCanvasPixelSize(canvas);
        const points = resolveLinePoints(
            data,
            xScale,
            yScale,
            configuration.xField,
            configuration.yField
        );
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
            if (
                point[configuration.xField] === undefined ||
                point[configuration.yField] === undefined
            ) {
                return;
            }

            const x = resolveScalePosition(xScale, point[configuration.xField]);
            const y = resolveScalePosition(yScale, point[configuration.yField]);
            if (!hasPoint) {
                context.moveTo(x, y);
                hasPoint = true;
            } else {
                context.lineTo(x, y);
            }
        });

        context.stroke();
    },
    destroy({svg}) {
        destroyCanvasByClass(
            svg.node(),
            `kchart-2d-canvas-${configuration.canvasName ?? configuration.selector}`
        );
    }
});
