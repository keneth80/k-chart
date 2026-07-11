const assert = require('node:assert/strict');
const {
    destroyAsyncCanvas,
    renderLineWithWorker
} = require('../lib/series/support/canvas');

class LifecycleWorker {
    constructor({ackDestroy = true} = {}) {
        this.ackDestroy = ackDestroy;
        this.messages = [];
        this.onmessage = undefined;
        this.onerror = undefined;
        this.terminated = false;
    }

    postMessage(message) {
        this.messages.push(message);
        if (message.type === 'kchart:destroy-canvas' && this.ackDestroy) {
            queueMicrotask(() => this.onmessage?.({
                data: {
                    type: 'kchart:destroy-complete',
                    canvasId: message.canvasId
                }
            }));
        }
    }

    terminate() {
        this.terminated = true;
    }
}

const createCanvas = () => ({
    transferControlToOffscreen() { return {}; }
});

const renderPayload = {
    width: 100,
    height: 50,
    color: '#fff',
    lineWidth: 1,
    points: new Float32Array([0, 0, 10, 10])
};

void (async () => {
    const worker = new LifecycleWorker();
    const canvas = createCanvas();
    const completion = renderLineWithWorker(canvas, 'webgl', {
        enabled: true,
        workerFactory: () => worker
    }, renderPayload);
    assert.ok(completion, 'render should create a pending completion');
    let rejected = false;
    completion.catch(() => { rejected = true; });

    destroyAsyncCanvas(canvas);
    assert.equal(worker.terminated, false, 'worker must not terminate before destroy acknowledgement');
    assert.equal(worker.messages.at(-1).type, 'kchart:destroy-canvas', 'main thread should request worker cleanup');

    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(rejected, true, 'destroy should reject pending render completions');
    assert.equal(worker.terminated, true, 'worker should terminate after cleanup acknowledgement');

    const canvasA = createCanvas();
    const canvasB = createCanvas();
    const workerA = new LifecycleWorker();
    const workerB = new LifecycleWorker();
    renderLineWithWorker(canvasA, 'webgl', {enabled: true, workerFactory: () => workerA}, renderPayload)?.catch(() => undefined);
    renderLineWithWorker(canvasB, 'webgl', {enabled: true, workerFactory: () => workerB}, renderPayload)?.catch(() => undefined);
    destroyAsyncCanvas(canvasA);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(workerA.terminated, true, 'destroy should terminate only the selected canvas worker');
    assert.equal(workerB.terminated, false, 'another canvas worker must remain active');
    destroyAsyncCanvas(canvasB);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(workerB.terminated, true, 'second canvas should clean up independently');

    const fallbackCanvas = createCanvas();
    const fallbackWorker = new LifecycleWorker({ackDestroy: false});
    renderLineWithWorker(
        fallbackCanvas,
        'webgl',
        {enabled: true, workerFactory: () => fallbackWorker},
        renderPayload
    )?.catch(() => undefined);
    destroyAsyncCanvas(fallbackCanvas);
    assert.equal(fallbackWorker.terminated, false, 'fallback should still allow an acknowledgement window');
    await new Promise((resolve) => setTimeout(resolve, 275));
    assert.equal(fallbackWorker.terminated, true, 'unresponsive workers should terminate after the fallback timeout');

    console.log('worker-lifecycle.test.cjs passed');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
