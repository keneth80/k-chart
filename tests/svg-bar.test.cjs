const assert = require('node:assert/strict');
const {resolveGroupedColumnLayout} = require('../lib/series/svg-bar.js');

const regular = resolveGroupedColumnLayout(100, 500, 3, 0.72, 4);
assert.equal(regular.renderedGroupWidth, 72);
assert.equal(regular.gap, 4);

const narrow = resolveGroupedColumnLayout(12, 20, 10, 0.72, 8);
assert.ok(narrow.renderedGroupWidth <= 8.64 + Number.EPSILON);
assert.ok(narrow.renderedGroupWidth <= 20);
assert.ok(narrow.barWidth >= 0);
assert.ok(narrow.gap >= 0);

const zeroWidth = resolveGroupedColumnLayout(0, 0, 4, 0.72, 4);
assert.deepEqual(zeroWidth, {
    barWidth: 0,
    gap: 0,
    renderedGroupWidth: 0
});

console.log('svg-bar.test.cjs passed');
