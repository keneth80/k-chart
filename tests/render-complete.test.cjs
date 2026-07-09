const assert = require('node:assert/strict');
const {renderLineWithWorker} = require('../lib/series/support/canvas');

class FakeWorker {
    constructor() {
        this.messages = [];
        this.onmessage = undefined;
        this.onerror = undefined;
    }

    postMessage(message) {
        this.messages.push(message);
        if (message.type !== 'kchart:render-line') {
            return;
        }

        setTimeout(() => {
            this.onmessage?.({
                data: {
                    type: 'kchart:render-complete',
                    canvasId: message.canvasId,
                    requestId: message.requestId
                }
            });
        }, 0);
    }

    terminate() {
        this.terminated = true;
    }
}

const worker = new FakeWorker();
const canvas = {
    transferControlToOffscreen() {
        return {};
    }
};

const completion = renderLineWithWorker(
    canvas,
    '2d',
    {
        enabled: true,
        workerFactory: () => worker
    },
    {
        width: 100,
        height: 50,
        color: '#fff',
        lineWidth: 2,
        points: new Float32Array([0, 0, 10, 10])
    }
);

assert.ok(completion && typeof completion.then === 'function', 'worker render should return completion promise');
assert.equal(worker.messages[0].type, 'kchart:init-canvas', 'worker should receive canvas init first');
assert.equal(worker.messages[1].type, 'kchart:render-line', 'worker should receive render request');
assert.equal(typeof worker.messages[1].requestId, 'number', 'render request should include request id');

let completed = false;
completion.then(() => {
    completed = true;
});

setTimeout(() => {
    assert.equal(completed, true, 'completion promise should resolve after worker completion message');
    console.log('render-complete.test.cjs passed');
}, 10);
