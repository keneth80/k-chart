const assert = require('node:assert/strict');
const {createZoomRenderScheduler} = require('../lib/core/create-kchart');

const frames = new Map();
let nextFrame = 1;
const requestFrame = (callback) => {
    const frame = nextFrame++;
    frames.set(frame, callback);
    return frame;
};
const cancelFrame = (frame) => {
    frames.delete(frame);
};

let latestZoom = 0;
const renderedZooms = [];
const scheduler = createZoomRenderScheduler(
    () => renderedZooms.push(latestZoom),
    requestFrame,
    cancelFrame
);

scheduler.start();
for (let zoom = 1; zoom <= 20; zoom += 1) {
    latestZoom = zoom;
    scheduler.schedule();
}

assert.equal(frames.size, 1, 'zoom events should share one pending animation frame');
assert.deepEqual(renderedZooms, [], 'zoom rendering should wait for the animation frame');

const firstFrame = frames.entries().next().value;
frames.delete(firstFrame[0]);
firstFrame[1](16);

assert.deepEqual(renderedZooms, [20], 'the frame should render the latest zoom state');

latestZoom = 21;
scheduler.schedule();
assert.equal(frames.size, 1, 'a later zoom state should schedule the next frame');
scheduler.end();

assert.equal(frames.size, 0, 'zoom end should clear the pending frame');
assert.deepEqual(renderedZooms, [20, 21], 'zoom end should flush the latest pending state');

scheduler.start();
latestZoom = 22;
scheduler.schedule();
const overlappingFrame = frames.entries().next().value;
scheduler.start();

assert.equal(frames.size, 1, 'a new gesture must retain the previous latest-state frame');

latestZoom = 23;
scheduler.end();
overlappingFrame[1](32);

assert.deepEqual(renderedZooms, [20, 21, 23], 'overlapping gesture boundaries must not lose the latest state');

scheduler.start();
latestZoom = 24;
scheduler.schedule();
const cancelledFrame = frames.entries().next().value;
scheduler.cancel();
cancelledFrame[1](48);

assert.deepEqual(renderedZooms, [20, 21, 23], 'cancelled zoom frames must not render');

latestZoom = 25;
scheduler.schedule();
const resumedFrame = frames.entries().next().value;
frames.delete(resumedFrame[0]);
resumedFrame[1](64);

assert.deepEqual(renderedZooms, [20, 21, 23, 25], 'cancelled schedulers should remain reusable');

latestZoom = 26;
scheduler.schedule();
const destroyedFrame = frames.entries().next().value;
scheduler.destroy();
destroyedFrame[1](80);
scheduler.schedule();
scheduler.end();

assert.deepEqual(renderedZooms, [20, 21, 23, 25], 'destroyed schedulers must not render pending or future zooms');

const synchronousZooms = [];
latestZoom = 27;
const synchronousScheduler = createZoomRenderScheduler(
    () => synchronousZooms.push(latestZoom),
    null
);
synchronousScheduler.start();
synchronousScheduler.schedule();

assert.deepEqual(synchronousZooms, [27], 'missing requestAnimationFrame should render synchronously');

console.log('zoom-scheduling.test.cjs passed');
