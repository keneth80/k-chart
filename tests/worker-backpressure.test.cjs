const assert = require('node:assert/strict');
const {
    destroyAsyncCanvas,
    renderLineWithWorker
} = require('../lib/series/support/canvas');

class ControlledWorker {
    constructor() {
        this.messages = [];
        this.onmessage = undefined;
        this.onerror = undefined;
    }

    postMessage(message) {
        this.messages.push(message);
        if (message.type === 'kchart:destroy-canvas') {
            queueMicrotask(() => this.onmessage?.({
                data: {
                    type: 'kchart:destroy-complete',
                    canvasId: message.canvasId
                }
            }));
        }
    }

    complete(message) {
        this.onmessage?.({
            data: {
                type: 'kchart:render-complete',
                canvasId: message.canvasId,
                requestId: message.requestId
            }
        });
    }

    terminate() {
        this.terminated = true;
    }
}

const createPayload = (value) => ({
    width: 100,
    height: 50,
    color: '#fff',
    lineWidth: 1,
    points: new Float32Array([0, value, 10, value])
});

void (async () => {
    const worker = new ControlledWorker();
    const canvas = {
        transferControlToOffscreen() {
            return {};
        }
    };
    const asyncRender = {
        enabled: true,
        workerFactory: () => worker
    };

    const completions = [1, 2, 3, 4].map((value) =>
        renderLineWithWorker(canvas, 'webgl', asyncRender, createPayload(value))
    );
    assert.ok(completions.every(Boolean), 'all worker renders should expose completion promises');

    const renderMessages = () => worker.messages.filter(({type}) => type === 'kchart:render-line');
    assert.deepEqual(
        renderMessages().map(({requestId}) => requestId),
        [1],
        'only the first frame should be posted while the worker is busy'
    );

    const resolved = [false, false, false, false];
    completions.forEach((completion, index) => completion.then(() => {
        resolved[index] = true;
    }));

    worker.complete(renderMessages()[0]);
    await Promise.resolve();
    assert.deepEqual(resolved, [true, false, false, false], 'only the committed active frame resolves first');
    assert.deepEqual(
        renderMessages().map(({requestId}) => requestId),
        [1, 4],
        'intermediate frames should be replaced by the newest queued frame'
    );
    assert.equal(
        renderMessages()[1].points[1],
        4,
        'the queued worker payload should contain the newest visual state'
    );

    worker.complete(renderMessages()[1]);
    await Promise.all(completions);
    assert.deepEqual(
        resolved,
        [true, true, true, true],
        'superseded completion promises should settle with the newest committed frame'
    );
    assert.equal(renderMessages().length, 2, 'worker traffic must remain bounded to active plus latest');

    destroyAsyncCanvas(canvas);
    await Promise.resolve();
    assert.equal(worker.terminated, true, 'worker cleanup should remain acknowledged');

    console.log('worker-backpressure.test.cjs passed');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
