const assert = require('node:assert/strict');
const {
    createRangeNavigatorOption,
    normalizeRangeNavigatorRange,
    reconcileRangeNavigatorRange,
    rangeNavigatorPixelsToRange,
    rangeNavigatorRangeToPixels,
    resolveRangeNavigatorAxis,
    resolveRangeNavigatorConfiguration,
    resolveRangeNavigatorDataDomain,
    resolveRangeNavigatorLayout,
    resolveRangeNavigatorOverview,
    resolveRangeNavigatorTopOffset
} = require('../lib/options/range-navigator');

const option = createRangeNavigatorOption({
    xField: 'week',
    yField: 'commits',
    height: 60,
    gap: 12
});
assert.equal(option.type, 'range-navigator');
assert.equal(option.visible, true);
assert.equal(option.config.xField, 'week');

const direct = {rangeNavigator: {xField: 'x'}};
assert.equal(resolveRangeNavigatorConfiguration(direct).visible, true);
assert.equal(resolveRangeNavigatorConfiguration(direct).xField, 'x');

const fromOption = resolveRangeNavigatorConfiguration({
    rangeNavigator: {xField: 'ignored'},
    options: [createRangeNavigatorOption({xField: 'week', visible: false})]
});
assert.equal(fromOption.xField, 'week');
assert.equal(fromOption.visible, false);

const timeAxis = resolveRangeNavigatorAxis([
    {field: 'category', type: 'point', placement: 'bottom'},
    {field: 'week', type: 'time', placement: 'bottom'}
], 'week');
assert.equal(timeAxis.field, 'week');

const timeData = [
    {week: new Date('2026-06-15T00:00:00Z'), commits: 4},
    {week: new Date('2026-06-01T00:00:00Z'), commits: 8},
    {week: new Date('invalid'), commits: 99},
    {week: new Date('2026-06-08T00:00:00Z'), commits: NaN}
];
const timeDomain = resolveRangeNavigatorDataDomain(timeData, 'week', 'time');
assert.deepEqual(
    timeDomain.map((value) => value.getTime()),
    [Date.parse('2026-06-01T00:00:00Z'), Date.parse('2026-06-15T00:00:00Z')]
);
assert.deepEqual(
    resolveRangeNavigatorOverview(timeData, 'week', 'commits', 'time').map((point) => point.y),
    [8, 4],
    'overview points should ignore invalid values and sort by x'
);

assert.deepEqual(
    normalizeRangeNavigatorRange([-10, 80], [0, 40], 'number'),
    [0, 40],
    'selected ranges should remain inside the full domain'
);
assert.deepEqual(
    rangeNavigatorRangeToPixels([10, 30], [0, 40], 200, 'number'),
    [50, 150]
);
assert.deepEqual(
    rangeNavigatorPixelsToRange([50, 150], [0, 40], 200, 'number'),
    [10, 30]
);
assert.deepEqual(
    normalizeRangeNavigatorRange([80, 20], [100, 0], 'number'),
    [80, 20],
    'reversed domains should retain their direction'
);
assert.deepEqual(
    rangeNavigatorRangeToPixels([80, 20], [100, 0], 200, 'number'),
    [40, 160]
);
assert.deepEqual(
    rangeNavigatorPixelsToRange([40, 160], [100, 0], 200, 'number'),
    [80, 20]
);
assert.deepEqual(
    reconcileRangeNavigatorRange([0, 10], [20, 40], 'number'),
    [20, 40],
    'a disjoint selection should reset to the new full domain'
);
assert.deepEqual(
    reconcileRangeNavigatorRange([10, 30], [20, 40], 'number'),
    [20, 30],
    'a partially overlapping selection should be clamped'
);
assert.deepEqual(
    reconcileRangeNavigatorRange([0, 10], [10, 20], 'number'),
    [10, 20],
    'a selection touching only one endpoint should reset instead of collapsing'
);

assert.deepEqual(resolveRangeNavigatorLayout({height: 60, gap: 12}), {
    height: 60,
    gap: 12,
    reservedSpace: 72
});
assert.deepEqual(resolveRangeNavigatorLayout({height: 4, gap: -5}), {
    height: 24,
    gap: 0,
    reservedSpace: 24
});
assert.equal(
    resolveRangeNavigatorTopOffset(116, {height: 58, gap: 14}),
    58,
    'navigator should start after the axis footer and configured gap'
);
assert.equal(
    resolveRangeNavigatorTopOffset(72, {height: 58, gap: 14}),
    42,
    'navigator should preserve a minimum footer when the base margin is too small'
);

console.log('range-navigator.test.cjs passed');
