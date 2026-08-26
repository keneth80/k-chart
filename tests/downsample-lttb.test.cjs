const assert = require('node:assert/strict');
const {downsampleLTTB} = require('../lib/utils/downsample-lttb');
const {resolveSeriesRenderData} = require('../lib/internal/downsample');

const createSeries = (downsample) => ({
    selector: 'test-series',
    xField: 'x',
    yField: 'y',
    downsample,
    render() {}
});

const resolveRenderData = (data, threshold, downsample = {}) => resolveSeriesRenderData(
    data,
    {width: 640, height: 320},
    createSeries({
        threshold,
        ...downsample
    })
);

const createSeededData = (length, seed) => {
    let state = seed >>> 0;
    const random = () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };

    return Array.from({length}, (_, index) => ({
        id: `${seed}-${index}`,
        x: index + (random() - 0.5) * 0.25,
        y: Math.sin(index / 7) * 40 + (random() - 0.5) * 12
    }));
};

const compareSamplers = (data, thresholds, label) => {
    for (const threshold of thresholds) {
        const generic = downsampleLTTB(data, threshold, (point) => point.x, (point) => point.y);
        const specialized = resolveRenderData(data, threshold);
        const thresholdLabel = Number.isNaN(threshold) ? 'NaN' : String(threshold);

        assert.equal(specialized.length, generic.length, `${label}, threshold ${thresholdLabel}: length`);
        for (let index = 0; index < generic.length; index += 1) {
            assert.strictEqual(
                specialized[index],
                generic[index],
                `${label}, threshold ${thresholdLabel}: point ${index}`
            );
        }
        if (generic === data) {
            assert.strictEqual(
                specialized,
                data,
                `${label}, threshold ${thresholdLabel}: passthrough array`
            );
        }
    }
};

for (const seed of [1, 0x12345678, 0xffffffff]) {
    for (const length of [0, 1, 2, 3, 4, 5, 17, 64, 257]) {
        const data = createSeededData(length, seed);
        compareSamplers(data, [
            -Infinity,
            -3,
            0,
            0.9,
            1,
            1.9,
            2,
            2.9,
            3,
            3.9,
            length / 3,
            length - 1,
            length - 0.1,
            length,
            length + 1,
            NaN,
            Infinity
        ], `seed ${seed}, length ${length}`);
    }
}

const tiedData = Array.from({length: 32}, (_, index) => ({id: index, x: index, y: 5}));
compareSamplers(tiedData, [3, 4, 7, 16, 31], 'equal-area ties');

const nonFiniteData = createSeededData(40, 42);
nonFiniteData[7].y = NaN;
nonFiniteData[15].x = Infinity;
nonFiniteData[29].y = -Infinity;
compareSamplers(nonFiniteData, [3, 8, 19, 39], 'non-finite numeric fields');

const sparseData = createSeededData(48, 77);
sparseData[8].x = null;
sparseData[16].y = undefined;
sparseData[24].x = null;
compareSamplers(sparseData, [3, 9, 23, 47], 'sparse nullish numeric fields');

const duplicateAndExtremeData = createSeededData(48, 91);
duplicateAndExtremeData[10].x = duplicateAndExtremeData[9].x;
duplicateAndExtremeData[20].y = Number.MAX_VALUE;
duplicateAndExtremeData[30].y = -Number.MAX_VALUE;
compareSamplers(duplicateAndExtremeData, [3, 11, 25, 47], 'duplicate x and extreme values');

const dateData = Array.from({length: 12}, (_, index) => ({
    x: new Date(Date.UTC(2026, 0, index + 1)),
    y: String((index * index) % 17)
}));
const dateSample = downsampleLTTB(
    dateData,
    5,
    (point) => point.x.getTime(),
    (point) => Number(point.y)
);
const dateRenderSample = resolveRenderData(dateData, 5);
assert.deepEqual(
    dateRenderSample,
    dateSample,
    'the render-time dispatcher should preserve Date/string conversion and selected references'
);
assert.strictEqual(dateSample[0], dateData[0], 'generic Date/string accessors should preserve the first reference');
assert.strictEqual(
    dateSample[dateSample.length - 1],
    dateData[dateData.length - 1],
    'generic Date/string accessors should preserve the last reference'
);

const numericData = [{x: null, y: undefined}, {x: 1, y: 4}, {x: 2, y: 3}, {x: 3, y: 8}];
const customX = (point) => point.x;
const customY = (point) => -point.y;
const customExpected = downsampleLTTB(numericData, 3, customX, customY);
assert.deepEqual(
    resolveRenderData(numericData, 3, {xAccessor: customX, yAccessor: customY}),
    customExpected,
    'custom accessors should take precedence over the numeric-field fast path'
);

const stringData = [{x: null, y: null}, {x: '1', y: 4}, {x: 2, y: 3}];
assert.deepEqual(
    resolveRenderData(stringData, 2),
    downsampleLTTB(stringData, 2, (point) => Number(point.x), (point) => Number(point.y)),
    'a first non-nullish string should remain on the generic render path'
);

const dateFieldData = [{x: new Date('2026-01-01T00:00:00Z'), y: 1}, {x: 2, y: 2}];
assert.deepEqual(
    resolveRenderData(dateFieldData, 1),
    downsampleLTTB(
        dateFieldData,
        1,
        (point) => point.x instanceof Date ? point.x.getTime() : Number(point.x),
        (point) => Number(point.y)
    ),
    'a first non-nullish Date should remain on the generic render path'
);

const allNullish = [{x: null, y: 1}, {x: undefined, y: 2}, {x: null, y: 3}];
assert.deepEqual(
    resolveRenderData(allNullish, 2),
    downsampleLTTB(allNullish, 2, (point) => Number(point.x), (point) => Number(point.y)),
    'an all-nullish field should remain on the generic render path'
);

let nullishReads = 0;
const countedNullishData = Array.from({length: 20}, () => ({
    get x() {
        nullishReads += 1;
        return null;
    },
    get y() {
        nullishReads += 1;
        return undefined;
    }
}));
assert.strictEqual(
    resolveRenderData(countedNullishData, countedNullishData.length),
    countedNullishData,
    'pass-through sampling should preserve the source array'
);
assert.equal(
    nullishReads,
    countedNullishData.length * 2,
    'render-time field classification should scan each default field only once'
);

const missingFieldSeries = {...createSeries({threshold: 2}), xField: undefined};
assert.strictEqual(
    resolveSeriesRenderData(numericData, {width: 640, height: 320}, missingFieldSeries),
    numericData,
    'missing fields should preserve the original data array'
);

console.log('downsample-lttb.test.cjs passed');
