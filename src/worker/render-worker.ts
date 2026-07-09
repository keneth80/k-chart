import type {
    KChartLineRenderPayload,
    KChartWorkerRenderer
} from '../series/support/canvas';
import {createProgram, parseColor} from '../series/support/webgl';

export const startKChartRenderWorker = (
    workerScope: Worker = self as any
): void => {
    interface WorkerCanvasEntry {
        canvas: OffscreenCanvas;
        renderer: KChartWorkerRenderer;
        context2d?: OffscreenCanvasRenderingContext2D;
        gl?: WebGLRenderingContext;
        program?: WebGLProgram;
    }

    const canvases = new Map<string, WorkerCanvasEntry>();

    const resolveWorkerProgram = (
        entry: WorkerCanvasEntry
    ): WebGLProgram | null => {
        if (entry.program) {
            return entry.program;
        }
        if (!entry.gl) {
            return null;
        }

        entry.program = createProgram(entry.gl, `
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
        `) ?? undefined;
        return entry.program ?? null;
    };

    const drawCanvasLine = (
        entry: WorkerCanvasEntry,
        message: KChartLineRenderPayload
    ): void => {
        const context = entry.context2d;
        if (!context) {
            return;
        }

        entry.canvas.width = message.width;
        entry.canvas.height = message.height;
        context.clearRect(0, 0, message.width, message.height);
        context.beginPath();
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = message.lineWidth;
        context.strokeStyle = message.color;

        for (let index = 0; index < message.points.length; index += 2) {
            const x = message.points[index];
            const y = message.points[index + 1];
            if (index === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        }
        context.stroke();
    };

    const drawWebglLine = (
        entry: WorkerCanvasEntry,
        message: KChartLineRenderPayload
    ): void => {
        const gl = entry.gl;
        if (!gl) {
            return;
        }

        entry.canvas.width = message.width;
        entry.canvas.height = message.height;
        const vertices = new Float32Array(message.points.length);
        for (let index = 0; index < message.points.length; index += 2) {
            vertices[index] = (message.points[index] / message.width) * 2 - 1;
            vertices[index + 1] =
                1 - (message.points[index + 1] / message.height) * 2;
        }

        const program = resolveWorkerProgram(entry);
        if (!program) {
            return;
        }

        gl.viewport(0, 0, message.width, message.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.lineWidth(message.lineWidth);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
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
            new Float32Array(parseColor(message.color))
        );
        gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);
        gl.deleteBuffer(positionBuffer);
    };

    workerScope.onmessage = (event: MessageEvent<any>) => {
        const message = event.data;

        if (message.type === 'kchart:init-canvas') {
            const canvas = message.canvas as OffscreenCanvas;
            const renderer = message.renderer as KChartWorkerRenderer;
            const entry: WorkerCanvasEntry = {canvas, renderer};

            if (renderer === '2d') {
                entry.context2d = canvas.getContext('2d') ?? undefined;
            } else {
                entry.gl = canvas.getContext('webgl', {
                    alpha: true
                }) as WebGLRenderingContext | null ?? undefined;
            }
            canvases.set(message.canvasId, entry);
            return;
        }

        if (message.type === 'kchart:destroy-canvas') {
            canvases.delete(message.canvasId);
            return;
        }

        if (message.type === 'kchart:render-line') {
            const entry = canvases.get(message.canvasId);
            if (!entry) {
                return;
            }
            if (message.renderer === '2d') {
                drawCanvasLine(entry, message);
            } else {
                drawWebglLine(entry, message);
            }
            workerScope.postMessage({
                type: 'kchart:render-complete',
                canvasId: message.canvasId,
                requestId: message.requestId
            });
        }
    };
};
