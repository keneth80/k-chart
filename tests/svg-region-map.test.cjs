const assert = require('node:assert/strict');
const {resolveRegionColorLegend} = require('../lib/series/svg-region-map.js');

const unreadableValue = {};
Object.defineProperty(unreadableValue, 'value', {
    get() {
        throw new Error('disabled legends must not scan region values');
    }
});

const hidden = resolveRegionColorLegend(undefined, [unreadableValue], 320);
assert.equal(hidden.visible, false);
assert.deepEqual(hidden.domain, [0, 1]);

const explicit = resolveRegionColorLegend({
    visible: true,
    domain: [100, 0]
}, [unreadableValue], 320);
assert.deepEqual(explicit.domain, [0, 100]);

const inferred = resolveRegionColorLegend(true, [
    {value: undefined},
    {value: null},
    {value: Number.NaN},
    {value: 12},
    {value: 48}
], 320);
assert.deepEqual(inferred.domain, [12, 48]);
assert.deepEqual(inferred.labels, ['12', '30', '48']);

const equalDomain = resolveRegionColorLegend({
    visible: true,
    domain: [7, 7]
}, [], 320);
assert.deepEqual(equalDomain.domain, [7, 8]);

const narrow = resolveRegionColorLegend({
    visible: true,
    labels: ['low', 'medium', 'high'],
    width: 280,
    offset: 16
}, [{value: 1}, {value: 2}], 100);
assert.equal(narrow.width, 68);
assert.deepEqual(narrow.labels, ['low', 'high']);
assert.ok(narrow.width + narrow.offset * 2 <= 100);

console.log('svg-region-map.test.cjs passed');
