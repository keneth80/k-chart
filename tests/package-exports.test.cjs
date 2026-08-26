const assert = require('node:assert/strict');

const {createKChart} = require('@keneth80/k-chart/core/create-kchart');
const contracts = require('@keneth80/k-chart/core/contracts');
const {createLineSeries} = require('@keneth80/k-chart/series/svg-line');
const {createCanvasLineSeries} = require('@keneth80/k-chart/series/canvas-line');
const {createWebglLineSeries} = require('@keneth80/k-chart/series/webgl-line');
const {createRangeNavigatorOption} = require('@keneth80/k-chart/options/range-navigator');

assert.equal(typeof createKChart, 'function');
assert.equal(typeof contracts, 'object');
assert.equal(typeof createLineSeries, 'function');
assert.equal(typeof createCanvasLineSeries, 'function');
assert.equal(typeof createWebglLineSeries, 'function');
assert.equal(typeof createRangeNavigatorOption, 'function');
assert.throws(
    () => require('@keneth80/k-chart/internal/downsample'),
    (error) => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    'numeric LTTB dispatch must remain an internal implementation detail'
);

console.log('Granular package export tests passed.');
