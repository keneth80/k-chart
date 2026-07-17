const assert = require('node:assert/strict');
const {scaleLinear, scalePoint, scaleTime} = require('d3-scale');
const {interpolateResolvedScales} = require('../lib/core/animation');
const {createCanvasLineSeries} = require('../lib/series/canvas-line');
const {createLineSeries} = require('../lib/series/svg-line');
const {createWebglLineSeries} = require('../lib/series/webgl-line');

const previousTime = {
    field: 'time',
    type: 'time',
    placement: 'bottom',
    scale: scaleTime()
        .domain([new Date('2026-07-17T00:00:00.000Z'), new Date('2026-07-17T00:00:10.000Z')])
        .range([0, 100])
};
const nextTime = {
    ...previousTime,
    scale: scaleTime()
        .domain([new Date('2026-07-17T00:00:01.000Z'), new Date('2026-07-17T00:00:11.000Z')])
        .range([0, 100])
};
const previousValue = {
    field: 'value',
    type: 'number',
    placement: 'left',
    scale: scaleLinear().domain([0, 100]).range([100, 0])
};
const nextValue = {
    ...previousValue,
    scale: scaleLinear().domain([20, 120]).range([100, 0])
};

const halfway = interpolateResolvedScales(
    [previousTime, previousValue],
    [nextTime, nextValue],
    0.5
);
assert.deepEqual(
    halfway[0].scale.domain().map((value) => value.toISOString()),
    ['2026-07-17T00:00:00.500Z', '2026-07-17T00:00:10.500Z'],
    'time domains should interpolate continuously'
);
assert.deepEqual(
    halfway[1].scale.domain(),
    [10, 110],
    'numeric domains should interpolate continuously'
);
assert.deepEqual(
    previousTime.scale.domain().map((value) => value.toISOString()),
    ['2026-07-17T00:00:00.000Z', '2026-07-17T00:00:10.000Z'],
    'interpolation must not mutate the previous scale'
);
assert.deepEqual(
    nextTime.scale.domain().map((value) => value.toISOString()),
    ['2026-07-17T00:00:01.000Z', '2026-07-17T00:00:11.000Z'],
    'interpolation must not mutate the next scale'
);

const categorical = {
    field: 'category',
    type: 'point',
    placement: 'bottom',
    scale: scalePoint().domain(['A', 'B']).range([0, 100])
};
assert.equal(
    interpolateResolvedScales([categorical], [categorical], 0.5)[0],
    categorical,
    'categorical scales should remain unchanged'
);
assert.equal(
    interpolateResolvedScales([previousTime], [nextTime], 1)[0],
    nextTime,
    'completed transitions should reuse the final resolved scale'
);

const lineConfiguration = {
    selector: 'line',
    xField: 'time',
    yField: 'value'
};
assert.equal(
    createLineSeries(lineConfiguration).supportsUpdateAnimation,
    true,
    'SVG line series should support synchronous update transitions'
);
assert.equal(
    createCanvasLineSeries(lineConfiguration).supportsUpdateAnimation,
    true,
    'main-thread Canvas line series should support update transitions'
);
assert.equal(
    createWebglLineSeries(lineConfiguration).supportsUpdateAnimation,
    true,
    'main-thread WebGL line series should support update transitions'
);
assert.equal(
    createCanvasLineSeries({
        ...lineConfiguration,
        asyncRender: {enabled: true}
    }).supportsUpdateAnimation,
    false,
    'worker-backed Canvas lines should avoid per-frame worker queues'
);
assert.equal(
    createWebglLineSeries({
        ...lineConfiguration,
        asyncRender: {enabled: true}
    }).supportsUpdateAnimation,
    false,
    'worker-backed WebGL lines should avoid per-frame worker queues'
);

console.log('animation.test.cjs passed');
