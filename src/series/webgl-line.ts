import type {
    KChartSeries,
    KChartWebglLineSeriesConfiguration
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {
    destroyCanvasByClass,
    renderLineWithWorker,
    resolveCanvasPixelSize,
    resolveLinePoints
} from './support/canvas';
import {
    createProgram,
    parseColor,
    resolveWebglLineVertices
} from './support/webgl';

export const createWebglLineSeries = <T = any>(
    configuration: KChartWebglLineSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    supportsUpdateAnimation: configuration.asyncRender?.enabled !== true,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    downsample: configuration.downsample,
    render({getWebglCanvas, data, xScale, yScale, color, animation, registerAsyncRenderTask}) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getWebglCanvas(
            configuration.canvasName ?? configuration.selector
        );
        const canvasSize = resolveCanvasPixelSize(canvas);
        const points = resolveLinePoints(
            data,
            xScale,
            yScale,
            configuration.xField,
            configuration.yField
        );
        const pointCount = points.length / 2;
        const visiblePointCount = animation.enabled
            ? Math.min(pointCount, Math.ceil(pointCount * animation.progress))
            : pointCount;
        const renderPoints = visiblePointCount < pointCount
            ? points.slice(0, Math.max(0, visiblePointCount * 2))
            : points;
        // The worker path has the same payload as the fallback path. That keeps
        // the public series API stable while moving heavy drawing off-thread.
        const workerRender = renderLineWithWorker(canvas, 'webgl', configuration.asyncRender, {
            width: canvasSize.width,
            height: canvasSize.height,
            color: configuration.color ?? color,
            lineWidth: configuration.lineWidth ?? 1,
            points: renderPoints
        });
        if (workerRender) {
            registerAsyncRenderTask?.(workerRender);
            return;
        }

        const gl = canvas.getContext('webgl', {alpha: true});
        if (!gl) {
            return;
        }

        const program = createProgram(gl, `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `, `
            precision mediump float;
            uniform vec4 u_color;
            void main() {
                gl_FragColor = u_color;
            }
        `);
        if (!program) {
            return;
        }

        const vertices = resolveWebglLineVertices(
            renderPoints,
            canvas.width,
            canvas.height
        );
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
        // A line series is a single vertex stream; one draw call is enough for
        // very large downsampled lines after coordinates are in clip space.
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(
            positionLocation,
            2,
            gl.FLOAT,
            false,
            0,
            0
        );

        const colorLocation = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(
            colorLocation,
            new Float32Array(parseColor(configuration.color ?? color))
        );
        gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(program);
    },
    destroy({svg}) {
        destroyCanvasByClass(
            svg.node(),
            `kchart-webgl-canvas-${configuration.canvasName ?? configuration.selector}`
        );
    }
});
