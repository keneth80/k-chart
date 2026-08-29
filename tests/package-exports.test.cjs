const assert = require('node:assert/strict');

const {createKChart} = require('@keneth80/k-chart/core/create-kchart');
const contracts = require('@keneth80/k-chart/core/contracts');
const {createLineSeries} = require('@keneth80/k-chart/series/svg-line');
const {createCanvasLineSeries} = require('@keneth80/k-chart/series/canvas-line');
const {createWebglLineSeries} = require('@keneth80/k-chart/series/webgl-line');
const {createRangeNavigatorOption} = require('@keneth80/k-chart/options/range-navigator');
const {chartConfig} = require('@keneth80/k-chart/presets');

assert.equal(typeof createKChart, 'function');
assert.equal(typeof contracts, 'object');
assert.equal(typeof createLineSeries, 'function');
assert.equal(typeof createCanvasLineSeries, 'function');
assert.equal(typeof createWebglLineSeries, 'function');
assert.equal(typeof createRangeNavigatorOption, 'function');
assert.equal(typeof chartConfig, 'function');
assert.throws(
    () => require('@keneth80/k-chart/internal/downsample'),
    (error) => error?.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED',
    'numeric LTTB dispatch must remain an internal implementation detail'
);

const createSelectionRecorder = () => {
    const records = new Map();

    const createSelection = (selector, initialData = []) => {
        let boundData = initialData;
        const selection = {
            data(value) {
                boundData = typeof value === 'function'
                    ? initialData.flatMap((datum, index) => value(datum, index, initialData))
                    : Array.from(value);
                records.set(selector, {data: boundData, attributes: {}, styles: {}});
                return selection;
            },
            join() {
                return selection;
            },
            attr(name, value) {
                const record = records.get(selector);
                if (record) {
                    record.attributes[name] = boundData.map((datum, index) => typeof value === 'function'
                        ? value(datum, index, boundData)
                        : value);
                }
                return selection;
            },
            style(name, value) {
                const record = records.get(selector);
                if (record) {
                    record.styles[name] = boundData.map((datum, index) => typeof value === 'function'
                        ? value(datum, index, boundData)
                        : value);
                }
                return selection;
            },
            text(value) {
                const record = records.get(selector);
                if (record) {
                    record.text = boundData.map((datum, index) => typeof value === 'function'
                        ? value(datum, index, boundData)
                        : value);
                }
                return selection;
            },
            filter(predicate) {
                return createSelection(
                    `${selector}:filtered`,
                    boundData.filter((datum, index) => predicate(datum, index, boundData))
                );
            },
            selectAll(childSelector) {
                return createSelection(`${selector} ${childSelector}`, boundData);
            },
            remove() {
                records.set(selector, {data: [], attributes: {}, styles: {}});
                return selection;
            }
        };
        return selection;
    };

    return {
        records,
        group: {
            selectAll(selector) {
                return createSelection(selector);
            }
        }
    };
};

const pieData = [
    {name: 'Alpha', value: 60},
    {name: 'Beta', value: 30},
    {name: 'Tiny', value: 10}
];
const formatterContexts = [];
const pieConfiguration = chartConfig(pieData)
    .selector('#chart')
    .pie({
        label: 'name',
        value: 'value',
        sliceLabel: {
            position: 'outside',
            minPercentage: 15,
            maxVisible: 2,
            collision: {minGap: 20, padding: 12},
            leaderLine: {visible: true, color: '#fff', width: 2, length: 20},
            formatter(context) {
                formatterContexts.push(context);
                return [context.label, `${context.percentage}%`];
            }
        }
    })
    .build();
const recorder = createSelectionRecorder();
pieConfiguration.series[0].render({
    group: recorder.group,
    data: pieData,
    plotSize: {width: 400, height: 260},
    animation: {enabled: false, progress: 1}
});

assert.equal(formatterContexts.length, 2, 'slice filters should run before formatting labels');
assert.deepEqual(
    formatterContexts[0],
    {
        data: pieData[0],
        datum: pieData[0],
        label: 'Alpha',
        value: 60,
        total: 100,
        percentage: 60,
        index: 0,
        color: '#5db8ff'
    },
    'slice label formatters should receive the complete public context'
);
const outsideLabels = recorder.records.get('text.value-pie-label');
const leaderLines = recorder.records.get('polyline.value-pie-label-line');
const labelLines = recorder.records.get('text.value-pie-label:filtered tspan');
assert.equal(outsideLabels.data.length, 2, 'outside labels should honor minPercentage and maxVisible');
assert.equal(leaderLines.data.length, 2, 'outside labels should render one leader line per visible label');
assert.equal(labelLines.data.length, 4, 'array formatter output should render as separate tspan lines');
assert.ok(
    outsideLabels.attributes.y.every((value) => value >= 18 && value <= 242),
    'multi-line label boxes should remain inside the vertical plot bounds'
);
assert.ok(
    outsideLabels.attributes.x.every((value, index) => {
        const anchor = outsideLabels.attributes['text-anchor'][index];
        return anchor === 'start' ? value <= 363 : value >= 37;
    }),
    'outside label anchors should reserve horizontal room for the rendered text'
);
assert.deepEqual(
    new Set(outsideLabels.attributes['text-anchor']),
    new Set(['start', 'end']),
    'outside labels should be split across the left and right sides'
);

const directFormatterContexts = [];
const directFormatterConfiguration = chartConfig(pieData.slice(0, 1))
    .selector('#chart')
    .pie({
        label: 'name',
        value: 'value',
        sliceLabel(context) {
            directFormatterContexts.push(context);
            return context.label;
        }
    })
    .build();
directFormatterConfiguration.series[0].render({
    group: createSelectionRecorder().group,
    data: pieData.slice(0, 1),
    plotSize: {width: 400, height: 260},
    animation: {enabled: false, progress: 1}
});
assert.equal(directFormatterContexts.length, 1, 'sliceLabel should accept a formatter function directly');

const crowdedData = Array.from({length: 20}, (_, index) => ({
    name: `Slice ${index + 1}`,
    value: 1
}));
const crowdedConfiguration = chartConfig(crowdedData)
    .selector('#chart')
    .pie({
        label: 'name',
        value: 'value',
        sliceLabel: {
            position: 'outside',
            leaderLine: false,
            collision: {minGap: 18, padding: 10},
            formatter: ({label}) => label
        }
    })
    .build();
const crowdedRecorder = createSelectionRecorder();
crowdedConfiguration.series[0].render({
    group: crowdedRecorder.group,
    data: crowdedData,
    plotSize: {width: 400, height: 260},
    animation: {enabled: false, progress: 1}
});
const crowdedLabels = crowdedRecorder.records.get('text.value-pie-label');
for (const anchor of ['start', 'end']) {
    const positions = crowdedLabels.attributes.y
        .filter((_, index) => crowdedLabels.attributes['text-anchor'][index] === anchor)
        .sort((left, right) => left - right);
    positions.slice(1).forEach((position, index) => {
        assert.ok(position - positions[index] >= 18, 'same-side outside labels should keep the minimum gap');
    });
}

let hiddenFormatterCalls = 0;
const hiddenConfiguration = chartConfig(pieData)
    .selector('#chart')
    .pie({
        label: 'name',
        value: 'value',
        labelVisible: false,
        sliceLabel() {
            hiddenFormatterCalls += 1;
            return 'hidden';
        }
    })
    .build();
const hiddenRecorder = createSelectionRecorder();
hiddenConfiguration.series[0].render({
    group: hiddenRecorder.group,
    data: pieData,
    plotSize: {width: 400, height: 260},
    animation: {enabled: false, progress: 1}
});
assert.equal(hiddenFormatterCalls, 0, 'labelVisible false should remain compatible with sliceLabel formatters');
assert.equal(hiddenRecorder.records.get('text.value-pie-label').data.length, 0);

console.log('Granular package export tests passed.');
