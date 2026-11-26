const assert = require('node:assert/strict');
const {createContainer} = require('./helpers/core-dom.cjs');
const {destroyCanvasByClass} = require('../lib/series/support/canvas');

const container = createContainer();
const svg = container.ownerDocument.createElement('svg');
container.appendChild(svg);
for (const key of ['kchart-2d-canvas-revenue %', 'kchart-2d-canvas-a.b', 'other']) {
    const canvas = container.ownerDocument.createElement('canvas');
    canvas.setAttribute('class', `${key} consumer-class`);
    canvas.setAttribute('data-kchart-canvas-key', key);
    container.appendChild(canvas);
}
destroyCanvasByClass(svg, 'kchart-2d-canvas-revenue %');
assert.equal(container.querySelectorAll('canvas').length, 2);
destroyCanvasByClass(svg, 'kchart-2d-canvas-a.b');
assert.equal(container.querySelectorAll('canvas').length, 1);
assert.equal(container.querySelector('canvas').getAttribute('data-kchart-canvas-key'), 'other');
console.log('canvas-names.test.cjs passed');

const {createCanvasPointSeries} = require('../lib/series/canvas-point');
const {createCanvasCandlestickSeries} = require('../lib/series/canvas-candlestick');
for (const factory of [createCanvasPointSeries, createCanvasCandlestickSeries]) {
    const key = 'kchart-2d-canvas-sales:usd';
    const node = container.ownerDocument.createElement('canvas');
    node.setAttribute('data-kchart-canvas-key', key);
    container.appendChild(node);
    factory({selector:'sales:usd'}).destroy({svg:{node:()=>svg}});
    assert.equal(node.parentNode, null, 'built-in teardown must treat special names as opaque keys');
}
