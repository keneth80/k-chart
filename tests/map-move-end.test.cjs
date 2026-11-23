const assert = require('node:assert/strict');
const {
    hasNumericViewChanged,
    resolveProjectedMapMoveEndContext
} = require('../lib/internal/map-move-end.js');

const projection = {
    invert: ([x, y]) => [x / 10, y / 10]
};

assert.deepEqual(
    resolveProjectedMapMoveEndContext(projection, 400, 240),
    {lon: 20, lat: 12, x: 200, y: 120}
);

assert.deepEqual(
    resolveProjectedMapMoveEndContext(
        projection,
        400,
        240,
        ([x, y]) => [(x - 40) / 2, (y + 20) / 2]
    ),
    {lon: 8, lat: 7, x: 200, y: 120}
);

assert.deepEqual(
    resolveProjectedMapMoveEndContext({invert: () => null}, 300, 180),
    {lon: null, lat: null, x: 150, y: 90}
);

assert.equal(hasNumericViewChanged([1, 2, 3], [1, 2, 3]), false);
assert.equal(hasNumericViewChanged([1, 2, 3], [1, 2, 4]), true);
assert.equal(hasNumericViewChanged([Number.NaN], [Number.NaN]), false);
assert.equal(hasNumericViewChanged([Number.NaN], [1]), true);

console.log('map-move-end.test.cjs passed');
