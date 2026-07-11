import {select} from 'd3-selection';
import type {
    KChartAsyncRenderConfiguration,
    KChartResolvedScale,
    KChartSize
} from '../../core/contracts';
import {resolveScalePosition} from './scale';

export type KChartWorkerRenderer = '2d' | 'webgl';

export interface KChartLineRenderPayload {
    type: 'kchart:render-line';
    canvasId: string;
    requestId: number;
    renderer: KChartWorkerRenderer;
    width: number;
    height: number;
    color: string;
    lineWidth: number;
    points: Float32Array;
}

interface KChartAsyncCanvasEntry {
    worker: Worker;
    renderer: KChartWorkerRenderer;
    canvasId: string;
    failed: boolean;
    requestId: number;
    destroying?: boolean;
    terminated?: boolean;
    destroyTimer?: ReturnType<typeof setTimeout>;
    pending: Map<number, {
        resolve: () => void;
        reject: () => void;
    }>;
}

const transferredCanvases = new WeakSet<HTMLCanvasElement>();
const asyncCanvasEntries = new WeakMap<HTMLCanvasElement, KChartAsyncCanvasEntry>();
let asyncCanvasId = 0;

const terminateAsyncCanvasEntry = (entry: KChartAsyncCanvasEntry): void => {
    if (entry.terminated) {
        return;
    }
    entry.terminated = true;
    if (entry.destroyTimer) {
        clearTimeout(entry.destroyTimer);
        entry.destroyTimer = undefined;
    }
    entry.pending.forEach((pending) => pending.reject());
    entry.pending.clear();
    entry.worker.terminate();
};

export const isCanvasTransferred = (canvas: HTMLCanvasElement): boolean =>
    transferredCanvases.has(canvas);

export const markCanvasTransferred = (canvas: HTMLCanvasElement): void => {
    transferredCanvases.add(canvas);
};

const getAsyncCanvasEntry = (
    canvas: HTMLCanvasElement,
    renderer: KChartWorkerRenderer,
    asyncRender?: KChartAsyncRenderConfiguration
): KChartAsyncCanvasEntry | null => {
    if (
        !asyncRender?.enabled ||
        !asyncRender.workerFactory ||
        typeof canvas.transferControlToOffscreen !== 'function'
    ) {
        // Unsupported browsers or missing factories fall back to the normal
        // main-thread renderer, so async rendering is an opt-in acceleration.
        return null;
    }

    const existing = asyncCanvasEntries.get(canvas);
    if (existing) {
        return existing.failed || existing.renderer !== renderer
            ? null
            : existing;
    }

    try {
        const worker = asyncRender.workerFactory();
        const canvasId = `kchart-offscreen-${asyncCanvasId += 1}`;
        const offscreenCanvas = canvas.transferControlToOffscreen();
        const entry: KChartAsyncCanvasEntry = {
            worker,
            renderer,
            canvasId,
            failed: false,
            requestId: 0,
            pending: new Map()
        };

        worker.onerror = () => {
            entry.failed = true;
            entry.pending.forEach((pending) => pending.reject());
            entry.pending.clear();
            if (entry.destroying) {
                terminateAsyncCanvasEntry(entry);
            }
        };
        worker.onmessage = (event: MessageEvent<any>) => {
            const message = event.data;
            if (message?.type === 'kchart:destroy-complete' && message.canvasId === canvasId) {
                terminateAsyncCanvasEntry(entry);
                return;
            }
            if (message?.type !== 'kchart:render-complete' || message.canvasId !== canvasId) {
                return;
            }
            const pending = entry.pending.get(message.requestId);
            if (!pending) {
                return;
            }
            entry.pending.delete(message.requestId);
            pending.resolve();
        };
        worker.postMessage({
            type: 'kchart:init-canvas',
            canvasId,
            renderer,
            canvas: offscreenCanvas
        }, [offscreenCanvas]);
        // transferControlToOffscreen can run only once for a canvas. The
        // WeakSet prevents later resize/render code from resetting it.
        markCanvasTransferred(canvas);
        asyncCanvasEntries.set(canvas, entry);
        return entry;
    } catch (_error) {
        return null;
    }
};

export const destroyAsyncCanvas = (canvas: HTMLCanvasElement): void => {
    const entry = asyncCanvasEntries.get(canvas);
    if (!entry || entry.destroying) {
        return;
    }

    entry.destroying = true;
    entry.failed = true;
    entry.pending.forEach((pending) => pending.reject());
    entry.pending.clear();
    asyncCanvasEntries.delete(canvas);
    // Give the worker a chance to delete its WebGL resources before the
    // terminate fallback stops it. The timeout preserves the previous
    // never-hang teardown behavior for failed or non-conforming workers.
    entry.destroyTimer = setTimeout(() => terminateAsyncCanvasEntry(entry), 250);
    try {
        entry.worker.postMessage({
            type: 'kchart:destroy-canvas',
            canvasId: entry.canvasId
        });
    } catch (_error) {
        terminateAsyncCanvasEntry(entry);
    }
};

export const destroyCanvasByClass = (
    svg: SVGSVGElement | null,
    className: string
): void => {
    const parent = svg?.parentElement;
    if (!parent) {
        return;
    }

    select(parent).selectAll<HTMLCanvasElement, unknown>(`canvas.${className}`)
        .each(function destroyCanvas() {
            destroyAsyncCanvas(this);
        })
        .remove();
};

export const resolveLinePoints = <T = any>(
    data: T[],
    xScale: KChartResolvedScale<T>,
    yScale: KChartResolvedScale<T>,
    xField: keyof T & string,
    yField: keyof T & string
): Float32Array => {
    // Renderer-facing data is compact numeric data. Series still accept normal
    // object rows, but Canvas/WebGL receives a transferable Float32Array.
    const points = new Float32Array(data.length * 2);
    let pointIndex = 0;

    data.forEach((point: T) => {
        if (point[xField] === undefined || point[yField] === undefined) {
            return;
        }

        const x = resolveScalePosition(xScale, point[xField]);
        const y = resolveScalePosition(yScale, point[yField]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            points[pointIndex] = x;
            points[pointIndex + 1] = y;
            pointIndex += 2;
        }
    });

    return pointIndex === points.length
        ? points
        : points.slice(0, pointIndex);
};

export const resolveCanvasPixelSize = (
    canvas: HTMLCanvasElement
): KChartSize => ({
    width: Number(canvas.dataset.kchartWidth) || canvas.width,
    height: Number(canvas.dataset.kchartHeight) || canvas.height
});

export const renderLineWithWorker = (
    canvas: HTMLCanvasElement,
    renderer: KChartWorkerRenderer,
    asyncRender: KChartAsyncRenderConfiguration | undefined,
    payload: Omit<KChartLineRenderPayload, 'type' | 'canvasId' | 'requestId' | 'renderer'>
): Promise<void> | null => {
    const entry = getAsyncCanvasEntry(canvas, renderer, asyncRender);
    if (!entry) {
        return null;
    }

    const requestId = entry.requestId += 1;
    const message: KChartLineRenderPayload = {
        type: 'kchart:render-line',
        canvasId: entry.canvasId,
        requestId,
        renderer,
        ...payload
    };
    const completion = new Promise<void>((resolve, reject) => {
        entry.pending.set(requestId, {resolve, reject});
    });
    // points.buffer is transferred to avoid copying large coordinate arrays.
    // The request id lets the core expose a truthful render-complete signal.
    entry.worker.postMessage(message, [message.points.buffer]);
    return completion;
};
