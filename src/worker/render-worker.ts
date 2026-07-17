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
        positionBuffer?: WebGLBuffer;
    }

    const canvases = new Map<string, WorkerCanvasEntry>();

    const resolveWorkerProgram = (
        entry: WorkerCanvasEntry
    ): WebGLProgram | null => {
        // Shader compilation is cached per offscreen canvas. In streaming
        // charts, recompiling every tick would move cost back into the hot path.
        if (entry.program) {
            return entry.program;
        }
        if (!entry.gl) {
            return null;
        }

        entry.program = createProgram(entry.gl, `
            attribute vec2 a_position;
            uniform vec2 u_resolution;
            void main() {
                vec2 clipPosition = vec2(
                    (a_position.x / u_resolution.x) * 2.0 - 1.0,
                    1.0 - (a_position.y / u_resolution.y) * 2.0
                );
                gl_Position = vec4(clipPosition, 0.0, 1.0);
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

    const resolveWorkerPositionBuffer = (
        entry: WorkerCanvasEntry
    ): WebGLBuffer | null => {
        if (entry.positionBuffer) {
            return entry.positionBuffer;
        }
        if (!entry.gl) {
            return null;
        }

        entry.positionBuffer = entry.gl.createBuffer() ?? undefined;
        return entry.positionBuffer ?? null;
    };

    const releaseWorkerCanvasEntry = (entry: WorkerCanvasEntry): void => {
        if (!entry.gl) {
            return;
        }
        if (entry.positionBuffer) {
            entry.gl.deleteBuffer(entry.positionBuffer);
            entry.positionBuffer = undefined;
        }
        if (entry.program) {
            entry.gl.deleteProgram(entry.program);
            entry.program = undefined;
        }
    };

    const drawCanvasLine = (
        entry: WorkerCanvasEntry,
        message: KChartLineRenderPayload
    ): void => {
        const context = entry.context2d;
        if (!context) {
            return;
        }

        const width = Math.max(0, Math.round(message.width));
        const height = Math.max(0, Math.round(message.height));
        if (entry.canvas.width !== width) {
            entry.canvas.width = width;
        }
        if (entry.canvas.height !== height) {
            entry.canvas.height = height;
        }
        context.clearRect(0, 0, width, height);
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

        const width = Math.max(0, Math.round(message.width));
        const height = Math.max(0, Math.round(message.height));
        if (entry.canvas.width !== width) {
            entry.canvas.width = width;
        }
        if (entry.canvas.height !== height) {
            entry.canvas.height = height;
        }

        const program = resolveWorkerProgram(entry);
        const positionBuffer = resolveWorkerPositionBuffer(entry);
        if (!program || !positionBuffer) {
            return;
        }

        gl.viewport(0, 0, width, height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.lineWidth(message.lineWidth);

        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, message.points, gl.DYNAMIC_DRAW);
        const positionLocation = gl.getAttribLocation(program, 'a_position');
        const resolutionLocation = gl.getUniformLocation(
            program,
            'u_resolution'
        );
        if (positionLocation < 0 || !resolutionLocation) {
            return;
        }
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
        gl.uniform2f(resolutionLocation, message.width, message.height);
        gl.uniform4fv(
            colorLocation,
            parseColor(message.color)
        );
        gl.drawArrays(gl.LINE_STRIP, 0, message.points.length / 2);
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
            const entry = canvases.get(message.canvasId);
            if (entry) {
                releaseWorkerCanvasEntry(entry);
                canvases.delete(message.canvasId);
            }
            workerScope.postMessage({
                type: 'kchart:destroy-complete',
                canvasId: message.canvasId
            });
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
            // The main thread uses this as the product-level "visual render is
            // done" signal, so benchmarks do not stop before worker drawing.
            workerScope.postMessage({
                type: 'kchart:render-complete',
                canvasId: message.canvasId,
                requestId: message.requestId
            });
        }
    };
};
