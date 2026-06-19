import type {
    KChartSeries,
    KChartWebglPointSeriesConfiguration
} from '../core/contracts';
import {createCustomSeries} from './custom';
import {destroyCanvasByClass} from './support/canvas';
import {
    createProgram,
    parseColor,
    resolveWebglPointInterleavedData
} from './support/webgl';

export const createWebglPointSeries = <T = any>(
    configuration: KChartWebglPointSeriesConfiguration<T>
): KChartSeries<T> => createCustomSeries<T>({
    selector: configuration.selector,
    displayName: configuration.displayName,
    xField: configuration.xField,
    yField: configuration.yField,
    color: configuration.color,
    render({getWebglCanvas, data, xScale, yScale, color}) {
        if (!xScale || !yScale) {
            return;
        }

        const canvas = getWebglCanvas(
            configuration.canvasName ?? configuration.selector
        );
        const gl = canvas.getContext('webgl', {alpha: true});
        if (!gl) {
            return;
        }

        const program = createProgram(gl, `
            attribute vec2 a_position;
            attribute float a_size;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                gl_PointSize = a_size;
            }
        `, `
            precision mediump float;
            uniform vec4 u_color;
            void main() {
                vec2 point = gl_PointCoord - vec2(0.5);
                if (length(point) > 0.5) {
                    discard;
                }
                gl_FragColor = u_color;
            }
        `);
        if (!program) {
            return;
        }

        const {buffer, count} = resolveWebglPointInterleavedData(
            data,
            xScale,
            yScale,
            configuration.xField,
            configuration.yField,
            canvas.width,
            canvas.height,
            (point: T) => typeof configuration.pointSize === 'function'
                ? configuration.pointSize(point)
                : configuration.pointSize ?? 8
        );

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        const interleavedBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, interleavedBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
        const stride = 3 * Float32Array.BYTES_PER_ELEMENT;
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);

        const sizeLocation = gl.getAttribLocation(program, 'a_size');
        gl.enableVertexAttribArray(sizeLocation);
        gl.vertexAttribPointer(
            sizeLocation,
            1,
            gl.FLOAT,
            false,
            stride,
            2 * Float32Array.BYTES_PER_ELEMENT
        );

        const colorLocation = gl.getUniformLocation(program, 'u_color');
        gl.uniform4fv(
            colorLocation,
            new Float32Array(parseColor(configuration.color ?? color))
        );
        gl.drawArrays(gl.POINTS, 0, count);
        gl.deleteBuffer(interleavedBuffer);
        gl.deleteProgram(program);
    },
    destroy({svg}) {
        destroyCanvasByClass(
            svg.node(),
            `kchart-webgl-canvas-${configuration.canvasName ?? configuration.selector}`
        );
    }
});
