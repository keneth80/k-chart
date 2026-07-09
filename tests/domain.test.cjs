const assert = require('node:assert/strict');
const {
    resolveAxisDomain,
    resolveDownsampleAccessor
} = require('../lib/core/domain');

const toTime = (domain) => domain.map((value) => value instanceof Date ? value.getTime() : value);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'x', type: 'number', placement: 'bottom', min: 10, max: 20},
        [{x: -100}, {x: 100}]
    ),
    [10, 20],
    'explicit min/max should skip scanning'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'x', type: 'number', placement: 'bottom', min: 10, max: 20, padding: 0.5},
        [{x: -100}, {x: 100}]
    ),
    [10, 20],
    'explicit min/max should keep existing no-padding behavior'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'x', type: 'number', placement: 'bottom', min: 10},
        [{x: -100}, {x: 42}]
    ),
    [10, 42],
    'single explicit min should still scan max'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'x', type: 'number', placement: 'bottom', max: 10},
        [{x: -12}, {x: 42}]
    ),
    [-12, 10],
    'single explicit max should still scan min'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'x', type: 'number', placement: 'bottom'},
        [{x: 3}, {x: -2}, {x: 9}]
    ),
    [-2, 9],
    'automatic number domain should scan min/max'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'low', domainFields: ['low', 'high'], type: 'number', placement: 'left'},
        [{low: 3, high: 8}, {low: -2, high: 4}]
    ),
    [-2, 8],
    'domainFields should scan multiple fields'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'x', type: 'number', placement: 'bottom'},
        [{x: null}, {x: undefined}, {x: NaN}, {x: 4}]
    ),
    [0, 4],
    'number filtering should match previous Number()+finite semantics'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'x', type: 'number', placement: 'bottom'},
        []
    ),
    [0, 1],
    'empty data should keep default number domain'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'x', type: 'number', placement: 'bottom', padding: 0.1},
        [{x: 5}]
    ),
    [4.9, 5.1],
    'single point padding should keep one-unit span fallback'
);

const first = new Date('2026-01-01T00:00:00Z');
const second = new Date('2026-01-03T00:00:00Z');
assert.deepEqual(
    toTime(resolveAxisDomain(
        {field: 'x', type: 'time', placement: 'bottom'},
        [{x: second}, {x: first}]
    )),
    [first.getTime(), second.getTime()],
    'time domain should preserve Date values'
);

assert.deepEqual(
    resolveAxisDomain(
        {field: 'name', type: 'point', placement: 'bottom'},
        [{name: 'A'}, {name: 'B'}]
    ),
    ['A', 'B'],
    'point axis should keep categorical map behavior'
);

const numberAccessor = resolveDownsampleAccessor('x', {field: 'x', type: 'number'}, [{x: 1}, {x: 2}]);
assert.equal(numberAccessor({x: 7}), 7, 'number downsample accessor should use raw numeric fast path');

const timeAccessor = resolveDownsampleAccessor('x', {field: 'x', type: 'time'}, [{x: '2026-01-01T00:00:00Z'}]);
assert.equal(
    timeAccessor({x: '2026-01-01T00:00:00Z'}),
    Date.parse('2026-01-01T00:00:00Z'),
    'time string downsample accessor should preserve conversion semantics'
);

console.log('domain.test.cjs passed');
