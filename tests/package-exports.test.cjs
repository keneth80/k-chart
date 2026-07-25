const assert = require('node:assert/strict');

const {createKChart} = require('@keneth80/k-chart/core/create-kchart');
const contracts = require('@keneth80/k-chart/core/contracts');
const {createLineSeries} = require('@keneth80/k-chart/series/svg-line');
const {createCanvasLineSeries} = require('@keneth80/k-chart/series/canvas-line');
const {createWebglLineSeries} = require('@keneth80/k-chart/series/webgl-line');

assert.equal(typeof createKChart, 'function');
assert.equal(typeof contracts, 'object');
assert.equal(typeof createLineSeries, 'function');
assert.equal(typeof createCanvasLineSeries, 'function');
assert.equal(typeof createWebglLineSeries, 'function');

console.log('Granular package export tests passed.');
