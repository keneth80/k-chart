const assert = require('node:assert/strict');
const test = require('node:test');
const {scaleLinear, scalePoint} = require('d3-scale');
const api = require('../lib/index.js');
const presets = require('../lib/presets/index.js');
const core = require('../lib/core/create-kchart.js');
const {resolveAxisDomain} = require('../lib/core/domain.js');
const {chartConfig} = presets;

const data = [{x: 'A', y: 20}, {x: 'B', y: 30}];
const builder = (rows = data, axis = {}) => chartConfig(rows).selector('#chart').x('x').y('y', 'number', axis);
const strictBuilder = () => chartConfig(data, {strictOptions: true}).selector('#chart').x('x').y('y');

const recorder = () => {
    const records = new Map();
    const selection = (key, initial = []) => {
        let rows = initial;
        const result = {
            data(value) {
                rows = typeof value === 'function' ? initial.flatMap(value) : Array.from(value);
                records.set(key, {data: rows, attrs: {}, styles: {}});
                return result;
            },
            join() { return result; },
            attr(name, value) {
                if (records.has(key)) records.get(key).attrs[name] = rows.map((row, index) => typeof value === 'function' ? value(row, index) : value);
                return result;
            },
            style(name, value) {
                if (records.has(key)) records.get(key).styles[name] = rows.map((row, index) => typeof value === 'function' ? value(row, index) : value);
                return result;
            },
            text(value) {
                if (records.has(key)) records.get(key).text = rows.map((row, index) => typeof value === 'function' ? value(row, index) : value);
                return result;
            },
            filter(predicate) { return selection(`${key}:filtered`, rows.filter(predicate)); },
            selectAll(child) { return selection(`${key} ${child}`, rows); },
            remove() { records.delete(key); return result; }
        };
        return result;
    };
    return {records, group: {selectAll: (key) => selection(key)}};
};

const renderSeries = (config, index = 0, domain, progress = 1) => {
    const recording = recorder();
    const xAxis = config.axes[0];
    const yAxis = config.axes[1];
    const xScale = xAxis && {...xAxis, scale: (xAxis.type === 'number' ? scaleLinear() : scalePoint())
        .domain(resolveAxisDomain(xAxis, config.data)).range([20, 180])};
    const yScale = yAxis && {...yAxis, scale: (yAxis.type === 'point' || yAxis.type === 'string' ? scalePoint() : scaleLinear())
        .domain(domain ?? resolveAxisDomain(yAxis, config.data)).range([100, 0])};
    const context = {
        group: recording.group, seriesGroup: recording.group, data: config.data,
        xScale, yScale, scales: [xScale, yScale].filter(Boolean),
        plotSize: {width: 200, height: 100}, color: '#123456',
        animation: {enabled: progress !== 1, progress}
    };
    config.series[index].render(context);
    return {...recording, context};
};

const capture = (callback) => {
    const original = core.createKChart;
    let config;
    let rendered = 0;
    const controller = {render() { rendered += 1; return controller; }};
    core.createKChart = (value) => { config = value; return controller; };
    try {
        assert.equal(callback(), controller);
        assert.equal(rendered, 1);
        return config;
    } finally {
        core.createKChart = original;
    }
};

test('root and preset entrypoints export all existing and new convenience APIs', () => {
    for (const name of ['chartConfig', 'createLineChart', 'createColumnChart', 'createPieChart', 'createDoughnutChart',
        'createAreaChart', 'createScatterChart', 'createBubbleChart', 'createBarChart', 'createCandlestickChart']) {
        assert.equal(typeof presets[name], 'function', name);
        assert.equal(api[name], presets[name], name);
    }
});

test('column automatic numeric domains are unchanged and respect data overrides', () => {
    for (const [rows, expected] of [
        [data, [20, 30]],
        [[{x: 'A', y: -30}, {x: 'B', y: -20}], [-30, -20]],
        [[{x: 'A', y: -20}, {x: 'B', y: 30}], [-20, 30]],
        [[], [0, 1]]
    ]) {
        const config = builder(rows).column().build();
        assert.deepEqual(resolveAxisDomain(config.axes[1], rows), expected);
    }
    const config = builder().column().build({data: [{x: 'N', y: -10}]});
    assert.deepEqual(resolveAxisDomain(config.axes[1], config.data), [-10, -10]);
    const direct = capture(() => presets.createColumnChart({selector: '#chart', data, x: 'x', y: 'y'}));
    assert.deepEqual(resolveAxisDomain(direct.axes[1], data), [20, 30]);
});

test('column axes remain automatic across sign-changing streaming data and render baselines adapt', () => {
    const direct = capture(() => presets.createColumnChart({selector: '#chart', data, x: 'x', y: 'y'}));
    for (const config of [builder().column().build(), direct]) {
        const originalAxes = JSON.stringify(config.axes);
        assert.equal(config.axes[1].min, undefined);
        assert.equal(config.axes[1].max, undefined);
        assert.equal(config.axes[1].domain, undefined);
        for (const [values, expected] of [
            [[20, 30], [20, 30]],
            [[-50, -10], [-50, -10]],
            [[-100, 200], [-100, 200]],
            [[1000, 2000], [1000, 2000]]
        ]) {
            const rows = values.map((y, index) => ({x: String(index), y}));
            assert.deepEqual(resolveAxisDomain(config.axes[1], rows), expected);
            const {records, context} = renderSeries({...config, data: rows});
            const rect = records.get('rect.y-column');
            const baseline = context.yScale.scale(Math.max(expected[0], Math.min(expected[1], 0)));
            assert.deepEqual(rect.attrs.height, values.map((y) => Math.abs(baseline - context.yScale.scale(y))));
            assert.equal(JSON.stringify(config.axes), originalAxes);
        }
    }
});

test('column explicit bounds/domain remain authoritative including one-sided bounds', () => {
    for (const [axis, expected] of [
        [{min: 10, max: 40}, [10, 40]],
        [{min: 10}, [10, 30]],
        [{max: 40}, [20, 40]],
        [{domain: [40, 10]}, [40, 10]],
        [{domain: [-40, -10]}, [-40, -10]]
    ]) {
        const config = builder(data, axis).column().build();
        assert.deepEqual(resolveAxisDomain(config.axes[1], data), expected);
        for (const key of Object.keys(axis)) assert.deepEqual(config.axes[1][key], axis[key]);
    }
    const axes = [{field: 'x', placement: 'bottom', type: 'point'}, {field: 'y', placement: 'left', type: 'number', min: 15}];
    assert.deepEqual(builder().column().build({axes}).axes, axes);
});

test('column baseline uses zero inside domain and nearest boundary outside, reversed or animated', () => {
    const config = builder().column({barRadius: 2, barRatio: 0.5, color: '#f00'}).build();
    for (const domain of [[10, 40], [-40, -10], [-40, 40], [40, 10], [-10, -40]]) {
        const low = Math.min(...domain);
        const high = Math.max(...domain);
        const baselineValue = Math.max(low, Math.min(high, 0));
        for (const progress of [0, 0.5, 1]) {
            const {records, context} = renderSeries(config, 0, domain, progress);
            const rect = records.get('rect.y-column');
            const baseline = context.yScale.scale(baselineValue);
            data.forEach((point, index) => {
                const target = context.yScale.scale(point.y);
                assert.equal(rect.attrs.y[index], Math.min(baseline, baseline + (target - baseline) * progress));
                assert.equal(rect.attrs.height[index], Math.abs((baseline - target) * progress));
            });
            assert.deepEqual(rect.attrs.rx, [2, 2]);
            assert.deepEqual(rect.attrs.width, [50, 50]);
            assert.deepEqual(rect.styles.fill, ['#f00', '#f00']);
        }
    }
});

test('column explicit baseline is literal without changing automatic bounds and rejects nonfinite values', () => {
    const config = builder().column({baseline: 25}).build();
    assert.deepEqual(resolveAxisDomain(config.axes[1], data), [20, 30]);
    const {records, context} = renderSeries(config, 0, [10, 40]);
    const baseline = context.yScale.scale(25);
    assert.equal(records.get('rect.y-column').attrs.height[0], Math.abs(baseline - context.yScale.scale(20)));
    const outside = builder().column({baseline: 50}).build();
    assert.deepEqual(resolveAxisDomain(outside.axes[1], data), [20, 30]);
    const outsideRender = renderSeries(outside);
    assert.equal(outsideRender.records.get('rect.y-column').attrs.height[0],
        Math.abs(outsideRender.context.yScale.scale(50) - outsideRender.context.yScale.scale(20)));
    for (const baseline of [NaN, Infinity, -Infinity]) {
        assert.throws(() => builder().column({baseline}), /finite number/);
        assert.throws(() => presets.createColumnChart({selector: '#chart', data, x: 'x', y: 'y', baseline}), /finite number/);
    }
});

test('all Cartesian builder methods require axes; build still validates selector/series', () => {
    for (const method of ['line', 'column', 'area', 'scatter', 'bubble', 'bar']) {
        assert.throws(() => chartConfig(data)[method](), /requires x\(\.\.\.\) and y\(\.\.\.\) first/);
    }
    assert.throws(() => chartConfig(data).candlestick({openField: 'y', highField: 'y', lowField: 'y', closeField: 'y'}), /requires x\(\.\.\.\) and y\(\.\.\.\) first/);
    assert.throws(() => chartConfig(data).build(), /requires selector/);
    assert.throws(() => chartConfig(data).selector('#chart').build(), /at least one series/);
});

test('strict builder rejects ignored chart and axis options with migration guidance', () => {
    for (const method of ['line', 'column', 'area', 'scatter', 'bubble', 'bar', 'candlestick', 'pie', 'doughnut']) {
        for (const key of ['selector', 'data', 'width', 'height', 'margin', 'title', 'grid', 'legend', 'tooltip', 'animation',
            'options', 'x', 'y', 'autoResize', 'accessibility', 'theme', 'status', 'unknown']) {
            const option = {label: 'x', value: 'y', [key]: 10};
            if (!['pie', 'doughnut'].includes(method)) { delete option.label; delete option.value; }
            assert.throws(() => strictBuilder()[method](option), /unsupported series option.*Use builder methods or build\(overrides\)/);
        }
    }
});

test('legacy builder chart fields remain accepted and ignored unless strict validation is enabled', () => {
    for (const method of ['line', 'column', 'pie', 'doughnut']) {
        const option = {width: 400, height: 900, selector: '#ignored', data: [{x: 'other', y: 99}],
            x: 'missing', y: 'missing', title: 'ignored', unknown: true};
        if (['pie', 'doughnut'].includes(method)) Object.assign(option, {label: 'x', value: 'y'});
        const config = builder()[method](option).build();
        assert.equal(config.width, undefined);
        assert.equal(config.height, undefined);
        assert.equal(config.title, undefined);
        assert.equal(config.selector, '#chart');
        assert.equal(config.data, data);
        assert.equal(config.series[0].xField, 'x');
        assert.equal(config.series[0].yField, 'y');
        if (['line', 'column'].includes(method)) assert.deepEqual(config.axes.map((axis) => axis.field), ['x', 'y']);
    }
    assert.equal(builder().line({width: 400}).build().width, undefined);
    assert.throws(() => strictBuilder().line({width: 400}), /unsupported series option.*width/);
    assert.equal(chartConfig(data, {strictOptions: false}).selector('#chart').x('x').y('y').line({width: 400}).build().width, undefined);
});

test('line renderer combinations validate only in strict mode; legacy width aliases work', () => {
    assert.throws(() => strictBuilder().line({renderer: 'bogus'}), /Unsupported line renderer/);
    assert.throws(() => strictBuilder().line({canvasName: 'layer'}), /requires the canvas or webgl/);
    assert.doesNotThrow(() => builder().line({canvasName: 'ignored'}));
    for (const config of [builder().line({renderer: 'bogus'}).build(),
        capture(() => presets.createLineChart({selector: '#chart', data, x: 'x', y: 'y', renderer: 'bogus'}))]) {
        assert.ok(renderSeries(config).records.has('.y-bogus-line'));
    }
    assert.throws(() => presets.createLineChart({selector: '#chart', data, x: 'x', y: 'y', renderer: 'bogus', strictOptions: true}), /Unsupported line renderer/);
    assert.throws(() => presets.createLineChart({selector: '#chart', data, x: 'x', y: 'y', canvasName: 'ignored', strictOptions: true}), /requires the canvas or webgl/);
    for (const renderer of ['canvas', 'webgl']) {
        for (const option of [{curve: false}, {dot: false}, {curve: true}, {dot: {radius: 4}}, {dot: false, curve: false}]) {
            assert.doesNotThrow(() => builder().line({renderer, ...option}).build());
            const direct = capture(() => presets.createLineChart({selector: '#chart', data, x: 'x', y: 'y', renderer, ...option}));
            assert.equal(direct.series.length, 1);
            assert.throws(() => strictBuilder().line({renderer, ...option}), /require the svg renderer/);
            assert.throws(() => presets.createLineChart({selector: '#chart', data, x: 'x', y: 'y', renderer, ...option, strictOptions: true}), /require the svg renderer/);
        }
    }
    const svg = builder().line({lineWidth: 7, dot: false}).build();
    assert.deepEqual(renderSeries(svg).records.get('.y-svg-line').styles['stroke-width'], [7]);
    const precedence = builder().line({lineWidth: 7, strokeWidth: 3, dot: false}).build();
    assert.deepEqual(renderSeries(precedence).records.get('.y-svg-line').styles['stroke-width'], [3]);
    const canvas = builder().line({renderer: 'canvas', strokeWidth: 6, canvasName: 'named', color: '#f00'}).build();
    const {context} = renderSeries({...canvas, series: [{render() {}}]});
    let canvasName;
    const drawing = {clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}};
    canvas.series[0].render({...context, getCanvas(name) { canvasName = name; return {width: 200, height: 100, dataset: {}, getContext: () => drawing}; }});
    assert.equal(canvasName, 'named');
    assert.equal(drawing.lineWidth, 6);
    assert.equal(drawing.strokeStyle, '#f00');
});

test('generated selectors are safe, deterministic, collision-free, and leave field names unchanged', () => {
    const fields = ['sales total', 'sales%', 'sales.total', '12sales', 'a:b#c', 'a-u20-b', '_kchart_61', 'sales-total'];
    for (const method of ['line', 'column', 'area', 'scatter', 'bubble', 'pie', 'doughnut']) {
        const selectors = [];
        for (const field of fields) {
            const rows = [{x: 'A', [field]: 10}, {x: 'B', [field]: 20}];
            const make = () => {
                const result = chartConfig(rows).selector('#chart').x('x').y(field);
                return ['pie', 'doughnut'].includes(method)
                    ? result[method]({label: 'x', value: field}).build()
                    : result[method]().build();
            };
            const config = make();
            const series = config.series[0];
            assert.match(series.selector, /^[A-Za-z_][A-Za-z0-9_-]*$/);
            assert.equal(series.selector, make().series[0].selector);
            assert.equal(series.yField, field);
            renderSeries(config);
            selectors.push(series.selector);
        }
        assert.equal(new Set(selectors).size, fields.length);
    }
    const repeated = builder().line({displayName: 'Profit %.'}).line({displayName: 'Profit %.'}).column().column().pie({label: 'x', value: 'y'}).pie({label: 'x', value: 'y'}).build();
    assert.equal(new Set(repeated.series.map((series) => series.selector)).size, 6);
    assert.equal(builder().line().build().series[0].selector, 'y-svg-line');
});

test('snapshots detach config records and outer arrays but preserve data and renderer identity', () => {
    const custom = {selector: 'custom', render() {}};
    const options = {type: 'spec-area', areas: [{start: 1, end: 2, color: '#f00'}]};
    const original = [{x: 'A', y: 10}];
    const fluent = chartConfig(original).selector('#chart').x('x').y('y', 'number', {domain: [0, 30]})
        .margin({left: 20}).title({text: 'Before'}).series(custom).option(options);
    const first = fluent.build();
    const second = fluent.build();
    assert.equal(first.data, original);
    assert.equal(first.data[0], original[0]);
    assert.equal(first.series[0], custom);
    assert.equal(second.series[0], custom);
    assert.notEqual(first.series, second.series);
    first.axes[1].domain[0] = -100;
    first.margin.left = 99;
    first.title.text = 'Changed';
    first.options[0].areas[0].color = '#000';
    first.series.push({selector: 'extra', render() {}});
    fluent.column().option({type: 'guide-line'}).y('y', 'number', {min: -10});
    assert.deepEqual(second.axes[1].domain, [0, 30]);
    assert.equal(second.margin.left, 20);
    assert.equal(second.title.text, 'Before');
    assert.equal(second.options[0].areas[0].color, '#f00');
    assert.equal(second.series.length, 1);
    assert.equal(second.options.length, 1);
    const overrideData = [];
    const overrideSeries = [custom];
    const override = {data: overrideData, series: overrideSeries, theme: {text: '#000'}, status: {state: 'loading'}};
    const built = fluent.build(override);
    assert.equal(built.data, overrideData);
    assert.equal(built.series[0], custom);
    assert.notEqual(built.series, overrideSeries);
    assert.notEqual(built.theme, override.theme);
});

test('line/simple preset snapshots never traverse data, including five-million-length sparse arrays', () => {
    const huge = new Proxy(new Array(5_000_000), {
        ownKeys() { throw new Error('data must not be cloned'); },
        get(target, key) {
            if (key !== 'length') throw new Error(`data must not be traversed: ${String(key)}`);
            return target.length;
        }
    });
    assert.equal(chartConfig(huge).selector('#chart').x('x').y('y').line().build().data, huge);
    assert.equal(chartConfig(huge).selector('#chart').x('x').y('y').column().build().data, huge);
    for (const name of ['createLineChart', 'createColumnChart', 'createAreaChart', 'createScatterChart', 'createBubbleChart', 'createBarChart', 'createCandlestickChart', 'createPieChart', 'createDoughnutChart']) {
        const config = capture(() => presets[name]({selector: '#chart', data: huge, x: 'x', y: 'y', label: 'x', value: 'y', openField: 'y', highField: 'y', lowField: 'y', closeField: 'y'}));
        assert.equal(config.data, huge);
    }
});

test('nested preset options are captured without mutating their caller', () => {
    const dot = {radius: 8, fill: '#f00'};
    const config = builder().line({dot, downsample: {enabled: true, threshold: 100}}).build();
    dot.radius = 99;
    assert.deepEqual(renderSeries(config).records.get('.y-svg-line-dot').attrs.r, [8, 8]);
    const columnOption = {barRadius: 2};
    const column = builder().column(columnOption).build();
    columnOption.barRadius = 90;
    assert.deepEqual(renderSeries(column).records.get('rect.y-column').attrs.rx, [2, 2]);
    const palette = ['#f00', '#0f0'];
    const pie = builder().pie({label: 'x', value: 'y', palette, labelVisible: false}).build();
    palette[0] = '#000';
    assert.equal(renderSeries(pie).records.get('path.y-pie').styles.fill[0], '#f00');
});

test('area builder renders existing factory styling/baseline and standalone defaults', () => {
    const config = builder().area({baseline: 10, fill: '#f00', fillOpacity: 0.4, stroke: '#0f0', strokeWidth: 4, curve: true}).build();
    const {records} = renderSeries(config);
    assert.deepEqual(records.get('path.y-area').styles.fill, ['#f00']);
    assert.deepEqual(records.get('path.y-area').styles['fill-opacity'], [0.4]);
    assert.deepEqual(records.get('path.y-area-line').styles.stroke, ['#0f0']);
    assert.deepEqual(records.get('path.y-area-line').styles['stroke-width'], [4]);
    assert.doesNotMatch(records.get('path.y-area').attrs.d[0], /NaN/);
    const standalone = capture(() => presets.createAreaChart({selector: '#chart', data, x: 'x', y: 'y', fillOpacity: 0.7}));
    assert.equal(standalone.axes[0].type, 'point');
    assert.equal(standalone.series[0].displayName, 'y');
    assert.deepEqual(renderSeries(standalone).records.get('path.y-area').styles['fill-opacity'], [0.7]);
});

test('scatter and bubble builders render radius/style callbacks and animation', () => {
    const rows = [{x: 1, y: 2, size: 10}, {x: 2, y: 4, size: 20}];
    const scatter = builder(rows).x('x', 'number').scatter({radius: (_, i) => 4 + i, fill: (_, i) => i ? '#0f0' : '#f00', opacity: 0.6, stroke: '#000', strokeWidth: 3}).build();
    const circles = renderSeries(scatter).records.get('circle.y-scatter');
    assert.deepEqual(circles.attrs.r, [4, 5]);
    assert.deepEqual(circles.styles.fill, ['#f00', '#0f0']);
    assert.deepEqual(circles.styles['fill-opacity'], [0.6, 0.6]);
    assert.deepEqual(circles.styles['stroke-width'], [3, 3]);
    const bubble = builder(rows).x('x', 'number').bubble({radiusField: 'size', minRadius: 5, maxRadius: 15}).build();
    assert.deepEqual(renderSeries(bubble).records.get('circle.y-bubble').attrs.r, [5, 15]);
    assert.deepEqual(renderSeries(bubble, 0, undefined, 0.5).records.get('circle.y-bubble').attrs.r, [2.5, 7.5]);
    for (const name of ['createScatterChart', 'createBubbleChart']) {
        const direct = capture(() => presets[name]({selector: '#chart', data: rows, x: 'x', y: 'y', radiusField: 'size', minRadius: 5, maxRadius: 15, radius: 7}));
        assert.deepEqual(direct.axes.map((axis) => axis.type), ['number', 'number']);
        const result = renderSeries(direct).records.get(`circle.y-${name === 'createScatterChart' ? 'scatter' : 'bubble'}`);
        assert.deepEqual(result.attrs.r, name === 'createScatterChart' ? [7, 7] : [5, 15]);
    }
});

test('all standalone presets forward base options and new usability configuration', () => {
    const common = {
        selector: '#chart', data, x: {field: 'x', title: 'Category'}, y: {field: 'y', min: 10, max: 40},
        label: 'x', value: 'y', width: 640, height: 320, margin: {left: 60}, colors: ['#f00'], className: 'chart',
        title: 'Title', grid: false, legend: false, tooltip: false, animation: false, options: [],
        autoResize: false, accessibility: {label: 'Chart'}, theme: {text: '#111'}, status: {state: 'loading', message: 'Loading'}
    };
    for (const name of ['createLineChart', 'createColumnChart', 'createAreaChart', 'createScatterChart', 'createBubbleChart', 'createBarChart', 'createCandlestickChart', 'createPieChart', 'createDoughnutChart']) {
        const config = capture(() => presets[name]({...common, openField: 'y', highField: 'y', lowField: 'y', closeField: 'y'}));
        assert.equal(config.data, data);
        for (const key of ['width', 'height', 'margin', 'colors', 'className', 'animation', 'options', 'autoResize', 'accessibility', 'theme', 'status']) {
            assert.deepEqual(config[key], common[key], `${name}: ${key}`);
        }
        assert.deepEqual(config.title, {text: 'Title', align: 'left'});
        for (const key of ['grid', 'legend', 'tooltip']) assert.deepEqual(config[key], {visible: false});
    }
    const config = capture(() => builder().line().render({autoResize: false, status: {state: 'empty'}, accessibility: {label: 'Empty'}, theme: {grid: '#eee'}}));
    assert.equal(config.autoResize, false);
    assert.deepEqual(config.status, {state: 'empty'});
    assert.deepEqual(config.accessibility, {label: 'Empty'});
    assert.deepEqual(config.theme, {grid: '#eee'});
});

test('pie/doughnut existing defaults, custom labels, and tooltip datum identity remain intact', () => {
    const pie = capture(() => presets.createPieChart({selector: '#chart', data, label: 'x', value: 'y'}));
    const doughnut = capture(() => presets.createDoughnutChart({selector: '#chart', data, label: 'x', value: 'y'}));
    const piePath = renderSeries(pie).records.get('path.y-pie').attrs.d[0];
    const doughnutPath = renderSeries(doughnut).records.get('path.y-pie').attrs.d[0];
    assert.notEqual(piePath, doughnutPath);
    assert.match(piePath, /^M100,58 L/);
    const {context} = renderSeries(pie);
    const hit = pie.series[0].tooltip({...context, mouseX: 150, mouseY: 58});
    assert.equal(hit.data, data[0]);
    const configured = builder().pie({label: 'x', value: 'y', sliceLabel: ({label}) => `Slice ${label}`}).build();
    assert.deepEqual(renderSeries(configured).records.get('text.y-pie-label').text, ['Slice A', 'Slice B']);
});

test('horizontal bar wrappers preserve axes/data and delegate styles, geometry, tooltip to the existing factory', () => {
    const rows = [{category: 'A', amount: 10}, {category: 'B', amount: -5}];
    const options = {baseline: 0, barHeight: 24, radius: 2, opacity: 0.7, fill: (_, index) => index ? '#f00' : '#0f0'};
    const direct = capture(() => presets.createBarChart({selector: '#chart', data: rows, x: 'amount', y: 'category', ...options}));
    assert.equal(direct.data, rows);
    assert.deepEqual(direct.axes.map(({type, placement}) => [type, placement]), [['number', 'bottom'], ['point', 'left']]);
    const fluent = chartConfig(rows).selector('#chart').x('amount', 'number', {min: -20, max: 20})
        .y('category', 'point', {domain: ['B', 'A']}).bar(options).bar().build();
    assert.deepEqual(fluent.axes[1].domain, ['B', 'A']);
    assert.equal(fluent.axes[0].min, -20);
    assert.equal(fluent.axes[0].max, 20);
    assert.equal(new Set(fluent.series.map((series) => series.selector)).size, 2);
    const {records, context} = renderSeries(fluent);
    const rect = records.get('rect.amount-bar');
    assert.deepEqual(rect.attrs.height, [24, 24]);
    assert.deepEqual(rect.attrs.rx, [2, 2]);
    assert.deepEqual(rect.styles.fill, ['#0f0', '#f00']);
    assert.deepEqual(rect.styles['fill-opacity'], [0.7, 0.7]);
    assert.deepEqual(rect.attrs.width, rows.map((row) => Math.abs(context.xScale.scale(row.amount) - context.xScale.scale(0))));
    const hit = fluent.series[0].tooltip({...context, mouseX: context.xScale.scale(5), mouseY: context.yScale.scale('A')});
    assert.equal(hit.data, rows[0]);
    const unsafe = capture(() => presets.createBarChart({selector: '#chart', data: [], x: 'Amount %.', y: 'Category'}));
    assert.match(unsafe.series[0].selector, /^[A-Za-z_][A-Za-z0-9_-]*$/);
    assert.equal(unsafe.series[0].xField, 'Amount %.');
});

test('bar implicit baselines clamp to live domains for geometry and tooltip hits; explicit baselines stay literal', () => {
    const {createBarSeries} = require('../lib/series/svg-bar');
    for (const domain of [[20, 30], [-30, -20], [-30, 30], [30, 20], [-20, -30]]) {
        const values = [domain[0], (domain[0] + domain[1]) / 2];
        const rows = values.map((amount, index) => ({category: String(index), amount}));
        const direct = capture(() => presets.createBarChart({selector: '#chart', data: rows,
            x: {field: 'amount', domain}, y: 'category', barHeight: 20}));
        for (const config of [direct, {...direct, series: [createBarSeries({
            selector: direct.series[0].selector, xField: 'amount', yField: 'category', barHeight: 20
        })]}]) {
            for (const progress of [0.5, 1]) {
                const result = renderSeries({...config, series: [{render() {}}]}, 0, undefined, progress);
                result.context.xScale.scale.range([0, 500]);
                config.series[0].render(result.context);
                const baselineValue = Math.max(Math.min(...domain), Math.min(Math.max(...domain), 0));
                const baseline = result.context.xScale.scale(baselineValue);
                const rect = result.records.get('rect.amount-bar');
                rect.attrs.x.forEach((x, index) => {
                    assert.ok(x >= 0 && x <= 500);
                    assert.ok(rect.attrs.width[index] >= 0 && x + rect.attrs.width[index] <= 500);
                    const target = result.context.xScale.scale(rows[index].amount);
                    assert.equal(x, Math.min(baseline, target));
                    assert.equal(rect.attrs.width[index], Math.abs(baseline - target));
                });
                if (progress === 1) {
                    const valueX = result.context.xScale.scale(rows[1].amount);
                    const hit = config.series[0].tooltip({...result.context,
                        mouseX: (baseline + valueX) / 2, mouseY: result.context.yScale.scale('1')});
                    assert.equal(hit.data, rows[1]);
                    assert.equal(config.series[0].tooltip({...result.context, mouseX: -100,
                        mouseY: result.context.yScale.scale('1')}), undefined);
                }
            }
            assert.deepEqual(config.axes[0].domain, domain);
        }
    }
    const rows = [{category: 'A', amount: 25}];
    for (const baseline of [0, 40]) {
        const config = capture(() => presets.createBarChart({selector: '#chart', data: rows,
            x: {field: 'amount', domain: [20, 30]}, y: 'category', baseline, barHeight: 20}));
        const result = renderSeries({...config, series: [{render() {}}]});
        result.context.xScale.scale.range([0, 500]);
        config.series[0].render(result.context);
        const baselinePixel = result.context.xScale.scale(baseline);
        const target = result.context.xScale.scale(25);
        const rect = result.records.get('rect.amount-bar');
        assert.equal(rect.attrs.x[0], Math.min(baselinePixel, target));
        assert.equal(rect.attrs.width[0], Math.abs(baselinePixel - target));
        const hit = config.series[0].tooltip({...result.context, mouseX: (baselinePixel + target) / 2,
            mouseY: result.context.yScale.scale('A')});
        assert.equal(hit.data, rows[0]);
    }
});

test('multiple candles union only inferred OHLC fields and keep earlier build snapshots stable', () => {
    const rows = [{t: 'A', open: 10, highA: 20, lowA: 5, highB: 100, lowB: -10, close: 15}];
    const first = {openField: 'open', highField: 'highA', lowField: 'lowA', closeField: 'close'};
    const second = {...first, highField: 'highB', lowField: 'lowB'};
    const fluent = chartConfig(rows).selector('#chart').x('t').y('close').candlestick(first);
    const before = fluent.build();
    const after = fluent.candlestick(second).candlestick(first).build();
    assert.deepEqual(after.axes[1].domainFields, ['open', 'highA', 'lowA', 'close', 'highB', 'lowB']);
    assert.deepEqual(resolveAxisDomain(after.axes[1], rows), [-10, 100]);
    assert.deepEqual(before.axes[1].domainFields, ['open', 'highA', 'lowA', 'close']);
    assert.deepEqual(resolveAxisDomain(before.axes[1], rows), [5, 20]);
    assert.equal(after.data, rows);
    assert.equal(after.data[0], rows[0]);
    for (const domainFields of [['lowA', 'highA'], []]) {
        const explicit = chartConfig(rows).selector('#chart').x('t').y('close', 'number', {domainFields})
            .candlestick(first).candlestick(second).build();
        assert.deepEqual(explicit.axes[1].domainFields, domainFields);
        assert.deepEqual(domainFields, domainFields.length ? ['lowA', 'highA'] : []);
    }
    const reset = fluent.y('close', 'number', {domainFields: ['close']}).candlestick(second).build();
    assert.deepEqual(reset.axes[1].domainFields, ['close']);
});

test('candlestick wrappers infer OHLC domains, preserve explicit axes, and reject incompatible bindings', () => {
    const rows = [{time: 'A', open: 10, high: 25, low: 2, close: 15}];
    const fields = {openField: 'open', highField: 'high', lowField: 'low', closeField: 'close'};
    const direct = capture(() => presets.createCandlestickChart({selector: '#chart', data: rows, x: 'time', ...fields}));
    assert.equal(direct.data, rows);
    assert.deepEqual(direct.axes[1].domainFields, ['open', 'high', 'low', 'close']);
    assert.deepEqual(resolveAxisDomain(direct.axes[1], rows), [2, 25]);
    assert.equal(direct.axes[0].type, 'point');
    assert.equal(direct.axes[1].field, 'close');
    assert.equal(direct.axes[1].min, undefined);
    assert.equal(direct.axes[1].max, undefined);
    const explicit = {field: 'close', domainFields: ['low', 'high'], min: -10, max: 50, title: 'Price'};
    const configured = capture(() => presets.createCandlestickChart({selector: '#chart', data: rows, x: 'time', y: explicit, ...fields}));
    assert.deepEqual(configured.axes[1].domainFields, explicit.domainFields);
    assert.equal(configured.axes[1].title, 'Price');
    assert.deepEqual(resolveAxisDomain(configured.axes[1], rows), [-10, 50]);
    assert.deepEqual(explicit, {field: 'close', domainFields: ['low', 'high'], min: -10, max: 50, title: 'Price'});
    const fluent = chartConfig(rows).selector('#chart').x('time', 'point', {domain: ['A']})
        .y('close', 'number', {domainFields: ['low', 'high'], domain: [0, 40]})
        .candlestick(fields).candlestick(fields).build();
    assert.deepEqual(fluent.axes.map((axis) => axis.placement), ['bottom', 'left']);
    assert.deepEqual(fluent.axes[1].domainFields, ['low', 'high']);
    assert.deepEqual(fluent.axes[1].domain, [0, 40]);
    assert.notEqual(fluent.series[0].selector, fluent.series[1].selector);
    assert.throws(() => builder().candlestick(fields), /numeric y axis bound to closeField/);
    assert.throws(() => presets.createCandlestickChart({selector: '#chart', data: rows, x: 'time', y: 'open', ...fields}), /bound to closeField/);
    assert.throws(() => chartConfig(rows).x('time').y('close', 'point').candlestick(fields), /numeric y axis/);
    assert.throws(() => chartConfig(rows).x('time').y('close').candlestick({closeField: 'close'}), /requires openField/);
});

test('candlestick forwards Canvas factory configuration and callbacks without custom rendering', () => {
    const rows = [{time: 'A', open: 10, high: 25, low: 2, close: 15}];
    let widthContext;
    const option = {openField: 'open', highField: 'high', lowField: 'low', closeField: 'close',
        canvasName: 'ohlc', upColor: '#0f0', wickColor: '#abc', borderColor: '#def', strokeWidth: 3,
        candleWidth(context) { widthContext = context; return 12; }};
    for (const config of [
        chartConfig(rows).selector('#chart').x('time').y('close').candlestick(option).build(),
        capture(() => presets.createCandlestickChart({selector: '#chart', data: rows, x: 'time', ...option}))
    ]) {
        const {context} = renderSeries({...config, series: [{render() {}}]});
        const calls = [];
        const drawing = {
            clearRect() {}, beginPath() {}, moveTo(...args) { calls.push(['moveTo', ...args]); }, lineTo(...args) { calls.push(['lineTo', ...args]); },
            rect(...args) { calls.push(['rect', ...args]); }, fill() { calls.push(['fill', this.fillStyle]); }, stroke() { calls.push(['stroke', this.strokeStyle]); }
        };
        config.series[0].render({...context, getCanvas(name) {
            assert.equal(name, 'ohlc');
            return {width: 200, height: 100, getContext(type) { assert.equal(type, '2d'); return drawing; }};
        }});
        assert.equal(widthContext.data, rows);
        assert.equal(widthContext.xScale, context.xScale);
        assert.equal(drawing.lineWidth, 3);
        assert.equal(calls.find((call) => call[0] === 'rect')[3], 12);
        assert.ok(calls.some((call) => call[0] === 'stroke' && call[1] === '#abc'));
        assert.ok(calls.some((call) => call[0] === 'stroke' && call[1] === '#def'));
        assert.ok(calls.some((call) => call[0] === 'fill' && call[1] === '#0f0'));
        const hit = config.series[0].tooltip({...context, mouseX: context.xScale.scale('A'), mouseY: context.yScale.scale(15)});
        assert.equal(hit.data, rows[0]);
    }
    const unsafe = capture(() => presets.createCandlestickChart({selector: '#chart', data: [], x: 'Time',
        openField: 'Open', highField: 'High', lowField: 'Low', closeField: 'Close %.'}));
    assert.match(unsafe.series[0].selector, /^[A-Za-z_][A-Za-z0-9_-]*$/);
    assert.equal(unsafe.series[0].yField, 'Close %.');
});

test('public TypeScript options retain legacy builder fields and support opt-in runtime validation', () => {
    const ts = require('typescript');
    const path = require('node:path');
    const fixture = path.join(__dirname, '__preset_types__.ts');
    const source = `import {chartConfig, createLineChart, createAreaChart, createScatterChart, createBubbleChart, createColumnChart, createBarChart, createCandlestickChart} from '../lib';
        const data = [{x: 1, y: 2, size: 3}];
        const builder = chartConfig(data).selector('#chart').x('x', 'number').y('y');
        builder.area({fillOpacity: .5}).scatter({radius: 3}).bubble({radiusField: 'size'}).column({baseline: 0});
        builder.line({lineWidth: 3});
        builder.bar({barHeight: 20});
        builder.candlestick({openField: 'y', highField: 'y', lowField: 'y', closeField: 'y'});
        // @ts-expect-error OHLC fields are required
        builder.candlestick({closeField: 'y'});
        // @ts-expect-error chart fields are not bar series options
        builder.bar({width: 100});
        builder.line({width: 400});
        builder.column({y: 'y'});
        builder.pie({label: 'x', value: 'y', data});
        builder.doughnut({label: 'x', value: 'y', width: 400});
        chartConfig<typeof data[number]>(data, {strictOptions: true}).x('x').y('y').line({width: 400});
        createLineChart({selector: '#chart', data, x: 'x', y: 'y', renderer: 'canvas', dot: false, curve: false});
        createLineChart({selector: '#chart', data, x: 'x', y: 'y', strictOptions: true});
        // @ts-expect-error invalid radius field
        builder.bubble({radiusField: 'missing'});
        const base = {selector: '#chart', data, x: 'x' as const, y: 'y' as const,
            autoResize: false, accessibility: {label: 'Chart'}, theme: {text: '#111'}, status: {state: 'loading' as const}};
        createAreaChart(base); createScatterChart(base); createBubbleChart({...base, radiusField: 'size'});
        createColumnChart({...base, baseline: 0});
        createBarChart(base);
        createCandlestickChart({...base, openField: 'y', highField: 'y', lowField: 'y', closeField: 'y'});
        builder.build({autoResize: false, status: {state: 'empty'}});`;
    const options = {noEmit: true, strict: true, skipLibCheck: true, target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS, moduleResolution: ts.ModuleResolutionKind.Node10, ignoreDeprecations: '6.0'};
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile.bind(host);
    host.getSourceFile = (file, language, onError, shouldCreate) => file === fixture
        ? ts.createSourceFile(file, source, language, true) : getSourceFile(file, language, onError, shouldCreate);
    const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([fixture], options, host));
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => process.cwd(), getCanonicalFileName: (file) => file, getNewLine: () => '\n'
    }));
});
