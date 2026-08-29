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

const createContinuousScale = (domain, width, type = 'number') => {
    const scale = (value) => {
        const numeric = value instanceof Date ? value.getTime() : value;
        const first = domain[0] instanceof Date ? domain[0].getTime() : domain[0];
        const last = domain[1] instanceof Date ? domain[1].getTime() : domain[1];
        return ((numeric - first) / (last - first)) * width;
    };
    scale.domain = () => domain;
    return {field: 'x', placement: 'bottom', type, scale};
};

const resolveMinMaxData = (data, options = {}, domain = [data[0]?.x ?? 0, data.at(-1)?.x ?? 1], width = 4) =>
    resolveSeriesRenderData(
        data,
        {width, height: 320},
        createSeries({strategy: 'min-max', pointsPerPixel: 1, ...options}),
        createContinuousScale(domain, width, options.scaleType ?? 'number')
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

const extremeData = Array.from({length: 40}, (_, index) => ({x: index, y: 20 + index / 10}));
extremeData[2].y = 120;
extremeData[7].y = -80;
const extremeSample = resolveMinMaxData(extremeData, {}, [0, 39], 4);
assert.ok(extremeSample.includes(extremeData[2]), 'min-max should preserve a same-column maximum');
assert.ok(extremeSample.includes(extremeData[7]), 'min-max should preserve a same-column minimum');
assert.deepEqual(
    extremeSample.map((point) => extremeData.indexOf(point)),
    [...extremeSample.map((point) => extremeData.indexOf(point))].sort((a, b) => a - b),
    'min-max candidates should remain in original source order'
);
assert.ok(extremeSample.length <= 4 * 4, 'gap-free min-max output should be capped at four points per pixel column');
const autoSample = resolveSeriesRenderData(
    extremeData,
    {width: 4, height: 320},
    createSeries({strategy: 'auto', pointsPerPixel: 1}),
    createContinuousScale([0, 39], 4)
);
assert.deepEqual(autoSample, extremeSample, 'auto should select pixel min-max for safe dense continuous data');
const sparseDensitySample = resolveMinMaxData(extremeData, {pointsPerPixel: 1_000}, [0, 39], 4);
assert.strictEqual(
    sparseDensitySample,
    extremeData,
    'pointsPerPixel should keep sparse-enough input unchanged'
);

let unusedThresholdCalls = 0;
const thresholdIndependentSample = resolveSeriesRenderData(
    extremeData,
    {width: 4, height: 320},
    createSeries({
        strategy: 'min-max',
        pointsPerPixel: 1,
        threshold: () => {
            unusedThresholdCalls += 1;
            return 7;
        }
    }),
    createContinuousScale([0, 39], 4)
);
assert.equal(unusedThresholdCalls, 0, 'min-max should not evaluate the LTTB-only threshold option');
assert.deepEqual(thresholdIndependentSample, extremeSample, 'min-max output should be independent from LTTB threshold');

const timeStart = Date.UTC(2026, 7, 1);
const timeMinMaxData = Array.from({length: 40}, (_, index) => ({
    x: new Date(timeStart + index * 60_000),
    y: index === 12 ? 500 : Math.cos(index / 4) * 10
}));
const timeSample = resolveMinMaxData(
    timeMinMaxData,
    {scaleType: 'time'},
    [timeMinMaxData[0].x, timeMinMaxData.at(-1).x],
    5
);
assert.ok(timeSample.includes(timeMinMaxData[12]), 'time-axis min-max should preserve local extrema');
assert.ok(timeSample.length <= 5 * 4, 'time-axis output should remain proportional to plot width');

const isoTimeData = Array.from({length: 200}, (_, index) => ({
    x: new Date(timeStart + index * 60_000).toISOString(),
    y: index === 105 ? 700 : Math.sin(index / 6) * 10
}));
const isoTimeSample = resolveMinMaxData(
    isoTimeData,
    {scaleType: 'time'},
    [new Date(isoTimeData[80].x), new Date(isoTimeData[120].x)],
    5
);
assert.ok(isoTimeSample.includes(isoTimeData[105]), 'ISO time-axis min-max should preserve a visible spike');
assert.ok(
    isoTimeSample.every((point) => point.x >= isoTimeData[79].x && point.x <= isoTimeData[121].x),
    'ISO time-axis sampling should stay within the visible window and its neighbors'
);

const zoomData = Array.from({length: 80}, (_, index) => ({x: index, y: Math.sin(index)}));
const zoomSample = resolveMinMaxData(zoomData, {}, [30, 49], 4);
assert.equal(zoomSample[0].x, 29, 'zoom sampling should retain one left boundary neighbor');
assert.equal(zoomSample.at(-1).x, 50, 'zoom sampling should retain one right boundary neighbor');
assert.ok(zoomSample.every((point) => point.x >= 29 && point.x <= 50), 'zoom sampling should scan only the visible window');

const edgeExtremeData = Array.from({length: 30}, (_, index) => ({x: index, y: index}));
edgeExtremeData[9].y = 1_000;
edgeExtremeData[15].y = 500;
edgeExtremeData[20].y = -1_000;
const edgeExtremeSample = resolveMinMaxData(edgeExtremeData, {}, [10, 19], 1);
assert.ok(edgeExtremeSample.includes(edgeExtremeData[15]), 'offscreen neighbors must not displace a visible edge-column maximum');
assert.equal(edgeExtremeSample[0], edgeExtremeData[9], 'left continuity neighbor should remain first');
assert.equal(edgeExtremeSample.at(-1), edgeExtremeData[20], 'right continuity neighbor should remain last');
assert.ok(edgeExtremeSample.length <= 1 * 4 + 2, 'boundary neighbors should add at most two points to the pixel-column bound');

const unsortedData = Array.from({length: 30}, (_, index) => ({x: index, y: index % 7}));
[unsortedData[8], unsortedData[9]] = [unsortedData[9], unsortedData[8]];
assert.deepEqual(
    resolveSeriesRenderData(
        unsortedData,
        {width: 4, height: 320},
        createSeries({strategy: 'auto', threshold: 7, pointsPerPixel: 1}),
        createContinuousScale([0, 29], 4)
    ),
    downsampleLTTB(unsortedData, 7, (point) => point.x, (point) => point.y),
    'auto should fall back to LTTB for unsorted X data'
);
assert.strictEqual(
    resolveSeriesRenderData(
        unsortedData,
        {width: 4, height: 320},
        createSeries({strategy: 'min-max', threshold: 7, pointsPerPixel: 1}),
        createContinuousScale([0, 29], 4)
    ),
    unsortedData,
    'explicit min-max should preserve input instead of silently changing algorithms'
);

const categoricalScale = {field: 'x', placement: 'bottom', type: 'point', scale: () => 0};
assert.deepEqual(
    resolveSeriesRenderData(
        extremeData,
        {width: 4, height: 320},
        createSeries({strategy: 'auto', threshold: 7, pointsPerPixel: 1}),
        categoricalScale
    ),
    downsampleLTTB(extremeData, 7, (point) => point.x, (point) => point.y),
    'auto should fall back to LTTB for categorical axes'
);

const gapData = Array.from({length: 40}, (_, index) => ({x: index, y: index + 1}));
gapData[6].y = undefined;
gapData[22].y = null;
assert.deepEqual(
    resolveSeriesRenderData(
        gapData,
        {width: 4, height: 320},
        createSeries({strategy: 'auto', threshold: 7, pointsPerPixel: 1}),
        createContinuousScale([0, 39], 4)
    ),
    resolveRenderData(gapData, 7, {strategy: 'lttb'}),
    'auto should fall back to LTTB when missing values require renderer-specific gap handling'
);

const invalidAfterZoomData = Array.from({length: 60}, (_, index) => ({x: index, y: index % 11}));
[invalidAfterZoomData[48], invalidAfterZoomData[49]] = [invalidAfterZoomData[49], invalidAfterZoomData[48]];
const invalidAfterZoomSample = resolveSeriesRenderData(
    invalidAfterZoomData,
    {width: 4, height: 320},
    createSeries({strategy: 'auto', threshold: 7, pointsPerPixel: 1}),
    createContinuousScale([5, 20], 4)
);
assert.ok(
    invalidAfterZoomSample.every((point) => point.x >= 4 && point.x <= 21),
    'offscreen ordering should not replace a valid visible min-max window with global LTTB'
);

const missingAfterZoomData = Array.from({length: 60}, (_, index) => ({x: index, y: index % 13}));
missingAfterZoomData[52].y = undefined;
const missingAfterZoomSample = resolveSeriesRenderData(
    missingAfterZoomData,
    {width: 4, height: 320},
    createSeries({strategy: 'auto', threshold: 7, pointsPerPixel: 1}),
    createContinuousScale([5, 20], 4)
);
assert.ok(
    missingAfterZoomSample.every((point) => point.x >= 4 && point.x <= 21),
    'offscreen missing data should not replace a valid visible min-max window with global LTTB'
);

const deepZoomFallbackData = Array.from({length: 10_000}, (_, index) => ({x: index, y: index % 17}));
deepZoomFallbackData[1_050].y = undefined;
const deepZoomFallbackSample = resolveSeriesRenderData(
    deepZoomFallbackData,
    {width: 100, height: 320},
    createSeries({strategy: 'auto', threshold: 100, pointsPerPixel: 1}),
    createContinuousScale([1_000, 1_100], 100)
);
assert.ok(
    deepZoomFallbackSample.filter((point) => point.x >= 1_000 && point.x <= 1_100).length > 2,
    'visible-window LTTB fallback should retain a drawable line at deep zoom'
);
assert.ok(
    deepZoomFallbackSample.every((point) => point.x >= 999 && point.x <= 1_101),
    'continuous-axis LTTB fallback should exclude unrelated offscreen points'
);

const deepIsoFallbackData = Array.from({length: 10_000}, (_, index) => ({
    x: new Date(timeStart + index * 1_000).toISOString(),
    y: index % 19
}));
deepIsoFallbackData[1_050].y = undefined;
const deepIsoFallbackSample = resolveSeriesRenderData(
    deepIsoFallbackData,
    {width: 100, height: 320},
    createSeries({strategy: 'auto', threshold: 100, pointsPerPixel: 1}),
    createContinuousScale(
        [new Date(deepIsoFallbackData[1_000].x), new Date(deepIsoFallbackData[1_100].x)],
        100,
        'time'
    )
);
assert.ok(
    deepIsoFallbackSample.filter((point) => point.x >= deepIsoFallbackData[1_000].x && point.x <= deepIsoFallbackData[1_100].x).length > 2,
    'ISO time visible-window LTTB fallback should retain a drawable line at deep zoom'
);
assert.ok(
    deepIsoFallbackSample.every((point) => point.x >= deepIsoFallbackData[999].x && point.x <= deepIsoFallbackData[1_101].x),
    'ISO time LTTB fallback should exclude unrelated offscreen points'
);

const customAutoX = (point) => point.x;
const customAutoY = (point) => point.y;
assert.deepEqual(
    resolveSeriesRenderData(
        extremeData,
        {width: 4, height: 320},
        createSeries({
            strategy: 'auto',
            threshold: 7,
            pointsPerPixel: 1,
            xAccessor: customAutoX,
            yAccessor: customAutoY
        }),
        createContinuousScale([0, 39], 4)
    ),
    downsampleLTTB(extremeData, 7, customAutoX, customAutoY),
    'auto should preserve custom accessor semantics through the LTTB fallback'
);

assert.deepEqual(
    resolveRenderData(extremeData, 7, {strategy: 'lttb'}),
    downsampleLTTB(extremeData, 7, (point) => point.x, (point) => point.y),
    'explicit LTTB strategy should preserve the existing sampler result'
);

console.log('downsample-lttb.test.cjs passed');
