const assert = require('node:assert/strict');
const {axisBottom} = require('d3-axis');
const {scaleBand, scalePoint, scaleTime} = require('d3-scale');
const {
    applyAxisTickCount,
    resolveCategoricalTickValues
} = require('../lib/core/ticks');

const thirtyDays = Array.from({length: 30}, (_, index) => `2026-07-${String(index + 1).padStart(2, '0')}`);
const sampledDays = resolveCategoricalTickValues('point', thirtyDays, 6);

assert.deepEqual(
    sampledDays,
    [thirtyDays[0], thirtyDays[6], thirtyDays[12], thirtyDays[17], thirtyDays[23], thirtyDays[29]],
    'point axis should evenly sample the requested number of labels'
);
assert.equal(sampledDays[0], thirtyDays[0], 'categorical ticks should preserve the first label');
assert.equal(sampledDays.at(-1), thirtyDays.at(-1), 'categorical ticks should preserve the last label');
assert.equal(thirtyDays.length, 30, 'sampling should not mutate the scale domain');

assert.deepEqual(
    resolveCategoricalTickValues('string', ['A', 'B', 'C', 'D'], 3),
    ['A', 'C', 'D'],
    'band axis should use the same categorical sampling rule'
);
assert.deepEqual(
    resolveCategoricalTickValues('point', ['A', 'B', 'C'], 1),
    ['A', 'C'],
    'a single requested tick should keep both categorical endpoints'
);
assert.equal(
    resolveCategoricalTickValues('point', ['A', 'B'], 2),
    undefined,
    'all labels should remain visible when tickCount covers the domain'
);
assert.equal(
    resolveCategoricalTickValues('point', ['A', 'B'], undefined),
    undefined,
    'missing tickCount should preserve the existing all-label behavior'
);
for (const invalidTickCount of [0, -1, NaN, Infinity]) {
    assert.equal(
        resolveCategoricalTickValues('point', ['A', 'B', 'C'], invalidTickCount),
        undefined,
        `invalid tickCount ${String(invalidTickCount)} should preserve all labels`
    );
}
assert.equal(
    resolveCategoricalTickValues('point', [], 3),
    undefined,
    'empty categorical domains should preserve the default axis behavior'
);
assert.equal(
    resolveCategoricalTickValues('point', ['A'], 3),
    undefined,
    'single-value categorical domains should keep their only label'
);
assert.deepEqual(
    resolveCategoricalTickValues('point', ['A', 'B', 'C', 'D', 'E'], 3.8),
    ['A', 'C', 'E'],
    'fractional categorical tickCount should use its integer portion'
);
assert.equal(
    resolveCategoricalTickValues('point', ['A', 'B', 'C'], 99),
    undefined,
    'tickCount above the domain length should preserve all labels'
);
assert.equal(
    resolveCategoricalTickValues('time', thirtyDays, 6),
    undefined,
    'continuous axes should remain delegated to D3 ticks'
);

const pointCalls = [];
applyAxisTickCount(
    {
        ticks: (count) => pointCalls.push(['ticks', count]),
        tickValues: (values) => pointCalls.push(['tickValues', values])
    },
    {
        type: 'point',
        tickCount: 3,
        scale: {domain: () => ['A', 'B', 'C', 'D', 'E']}
    }
);
assert.deepEqual(
    pointCalls,
    [['tickValues', ['A', 'C', 'E']]],
    'categorical axes should configure explicit tickValues instead of ineffective ticks()'
);

const numberCalls = [];
applyAxisTickCount(
    {
        ticks: (count) => numberCalls.push(['ticks', count]),
        tickValues: (values) => numberCalls.push(['tickValues', values])
    },
    {
        type: 'number',
        tickCount: 5,
        scale: {domain: () => [0, 100]}
    }
);
assert.deepEqual(numberCalls, [['ticks', 5]], 'number axis should keep the existing D3 tick hint');

const d3PointScale = scalePoint().domain(thirtyDays).range([0, 600]);
const pointDomainBefore = d3PointScale.domain();
const pointPositionsBefore = pointDomainBefore.map((value) => d3PointScale(value));
const d3PointAxis = axisBottom(d3PointScale);
applyAxisTickCount(d3PointAxis, {type: 'point', tickCount: 6, scale: d3PointScale});
assert.deepEqual(
    d3PointAxis.tickValues(),
    sampledDays,
    'the real D3 axis should receive sampled categorical tickValues'
);
assert.deepEqual(d3PointScale.domain(), pointDomainBefore, 'point tick sampling should not shrink the scale domain');
assert.deepEqual(
    pointDomainBefore.map((value) => d3PointScale(value)),
    pointPositionsBefore,
    'point tick sampling should not move any category position'
);

const d3BandScale = scaleBand().domain(['A', 'B', 'C', 'D', 'E']).range([0, 500]);
const bandDomainBefore = d3BandScale.domain();
const bandPositionsBefore = bandDomainBefore.map((value) => d3BandScale(value));
const d3BandAxis = axisBottom(d3BandScale);
applyAxisTickCount(d3BandAxis, {type: 'string', tickCount: 3, scale: d3BandScale});
assert.deepEqual(d3BandAxis.tickValues(), ['A', 'C', 'E'], 'the real D3 band axis should receive sampled ticks');
assert.deepEqual(d3BandScale.domain(), bandDomainBefore, 'band tick sampling should not shrink the scale domain');
assert.deepEqual(
    bandDomainBefore.map((value) => d3BandScale(value)),
    bandPositionsBefore,
    'band tick sampling should not move any category position'
);

const timeDomain = [new Date('2026-07-01T00:00:00Z'), new Date('2026-07-30T00:00:00Z')];
const d3TimeScale = scaleTime().domain(timeDomain).range([0, 600]);
const d3TimeAxis = axisBottom(d3TimeScale);
applyAxisTickCount(d3TimeAxis, {type: 'time', tickCount: 5, scale: d3TimeScale});
assert.deepEqual(d3TimeAxis.tickArguments(), [5], 'time axis should retain the D3 tick count hint');
assert.equal(d3TimeAxis.tickValues(), null, 'time axis should not receive categorical tickValues');

console.log('ticks.test.cjs passed');
