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
    active?: KChartLineRenderJob;
    queued?: KChartLineRenderJob;
}

interface KChartLineRenderWaiter {
    resolve: () => void;
    reject: (error?: unknown) => void;
}

interface KChartLineRenderJob {
    message: KChartLineRenderPayload;
    waiters: KChartLineRenderWaiter[];
}

const transferredCanvases = new WeakSet<HTMLCanvasElement>();
const asyncCanvasEntries = new WeakMap<HTMLCanvasElement, KChartAsyncCanvasEntry>();
let asyncCanvasId = 0;

const resolveLineRenderJob = (job: KChartLineRenderJob | undefined): void => {
    job?.waiters.splice(0).forEach((waiter) => waiter.resolve());
};

const rejectLineRenderJob = (
    job: KChartLineRenderJob | undefined,
    error?: unknown
): void => {
    job?.waiters.splice(0).forEach((waiter) => waiter.reject(error));
};

const dispatchLineRenderJob = (
    entry: KChartAsyncCanvasEntry,
    job: KChartLineRenderJob
): void => {
    entry.active = job;
    try {
        entry.worker.postMessage(job.message, [job.message.points.buffer]);
    } catch (error) {
        entry.active = undefined;
        entry.failed = true;
        rejectLineRenderJob(job, error);
        rejectLineRenderJob(entry.queued, error);
        entry.queued = undefined;
    }
};

const terminateAsyncCanvasEntry = (entry: KChartAsyncCanvasEntry): void => {
    if (entry.terminated) {
        return;
    }
    entry.terminated = true;
    if (entry.destroyTimer) {
        clearTimeout(entry.destroyTimer);
        entry.destroyTimer = undefined;
    }
    rejectLineRenderJob(entry.active);
    rejectLineRenderJob(entry.queued);
    entry.active = undefined;
    entry.queued = undefined;
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
            active: undefined,
            queued: undefined
        };

        worker.onerror = () => {
            entry.failed = true;
            rejectLineRenderJob(entry.active);
            rejectLineRenderJob(entry.queued);
            entry.active = undefined;
            entry.queued = undefined;
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
            const active = entry.active;
            if (!active || active.message.requestId !== message.requestId) {
                return;
            }
            entry.active = undefined;
            resolveLineRenderJob(active);

            const queued = entry.queued;
            entry.queued = undefined;
            if (queued && !entry.failed && !entry.destroying) {
                dispatchLineRenderJob(entry, queued);
            } else {
                resolveLineRenderJob(queued);
            }
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
    rejectLineRenderJob(entry.active);
    rejectLineRenderJob(entry.queued);
    entry.active = undefined;
    entry.queued = undefined;
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
    let job: KChartLineRenderJob | undefined;
    const completion = new Promise<void>((resolve, reject) => {
        job = {
            message,
            waiters: [{resolve, reject}]
        };
    });
    if (!job) {
        return completion;
    }

    if (entry.active) {
        // A chart needs the newest visual state, not a replay of stale frames.
        // Keep one active worker message and one latest queued frame. Waiters
        // from superseded frames follow that newest frame so render completion
        // still means the requested state has reached a committed visual.
        if (entry.queued) {
            job.waiters.unshift(...entry.queued.waiters.splice(0));
        }
        entry.queued = job;
        return completion;
    }

    // points.buffer is transferred only when the job becomes active. A queued
    // frame can therefore be replaced without filling the worker message queue.
    dispatchLineRenderJob(entry, job);
    return completion;
};
