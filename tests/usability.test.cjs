const assert = require('node:assert/strict');
const {
    resolveContainerSize,
    resolveResponsiveTickCount,
    resolveTooltipPosition,
    activateLegendFromKeyboard,
    resolveChartTheme,
    resolveChartAccessibility,
    resolveChartStatus,
    resolveLegendLayout,
    truncateLegendLabel
} = require(process.env.KCHART_USABILITY_MODULE || '../lib/core/usability');

assert.deepEqual(resolveContainerSize({width: 180, height: 96}), {width: 180, height: 96});
assert.deepEqual(resolveContainerSize({width: 0, height: 0}), {width: 320, height: 240});
assert.deepEqual(resolveContainerSize({width: 0, height: 80}), {width: 320, height: 80});
assert.deepEqual(resolveContainerSize({width: NaN, height: Infinity}), {width: 320, height: 240});
assert.deepEqual(resolveContainerSize({width: 200, height: 100}, {width: 640}), {width: 640, height: 100});
assert.deepEqual(resolveContainerSize({width: 200, height: 100}, {width: 0, height: 0}), {width: 0, height: 0},
    'explicit dimensions preserve the existing nullish-default contract');

const size = {width: 292, height: 180};
const axis = {placement: 'bottom'};
assert.equal(resolveResponsiveTickCount(axis, size), 3);
assert.equal(resolveResponsiveTickCount({placement: 'top'}, size), 3);
assert.equal(resolveResponsiveTickCount({placement: 'left'}, size), 3);
assert.equal(resolveResponsiveTickCount({placement: 'right'}, {width: 900, height: 96}), 2);
assert.equal(resolveResponsiveTickCount(axis, {width: 10000, height: 180}), 10);
assert.equal(resolveResponsiveTickCount(axis, {width: 0, height: 0}), 2);
assert.equal(resolveResponsiveTickCount(axis, {width: NaN, height: Infinity}), 2);
for (const tickCount of [1, 5, 17, 3.8, 0, -1, Infinity, NaN]) {
    assert.equal(resolveResponsiveTickCount({...axis, tickCount}, size), tickCount,
        'explicit tickCount must remain authoritative, including legacy invalid hints');
}
assert.deepEqual(axis, {placement: 'bottom'}, 'responsive budgets must not mutate axes');
assert.deepEqual(size, {width: 292, height: 180});

assert.deepEqual(resolveTooltipPosition({x: 30, y: 40}, {width: 80, height: 50}, {width: 300, height: 200}),
    {left: 42, top: 52});
assert.deepEqual(resolveTooltipPosition({x: 290, y: 190}, {width: 80, height: 50}, {width: 300, height: 200}),
    {left: 198, top: 128}, 'edge tooltips flip inward');
assert.deepEqual(resolveTooltipPosition({x: -50, y: -10}, {width: 80, height: 50}, {width: 300, height: 200}),
    {left: 8, top: 8});
assert.deepEqual(resolveTooltipPosition({x: 1000, y: 1000}, {width: 80, height: 50}, {width: 300, height: 200}),
    {left: 212, top: 142});
assert.deepEqual(resolveTooltipPosition({x: 20, y: 20}, {width: 400, height: 300}, {width: 100, height: 80}),
    {left: 0, top: 0}, 'oversized content remains anchored at the container origin');
assert.deepEqual(resolveTooltipPosition({x: NaN, y: Infinity}, {width: NaN, height: -1}, {width: 0, height: 0}),
    {left: 0, top: 0});
for (const width of [8, 30, 100, 360]) {
    for (const height of [8, 40, 200]) {
        for (const x of [-100, 0, width / 2, width, 1000]) {
            const tooltipSize = {width: Math.min(width, 80), height: Math.min(height, 50)};
            const position = resolveTooltipPosition({x, y: x}, tooltipSize, {width, height});
            assert(position.left >= 0 && position.left + tooltipSize.width <= width);
            assert(position.top >= 0 && position.top + tooltipSize.height <= height);
        }
    }
}

let activations = 0;
const eventFor = (key, options = {}) => ({
    key, repeat: false, altKey: false, ctrlKey: false, metaKey: false,
    defaultPrevented: false, prevented: false,
    preventDefault() { this.prevented = true; }, ...options
});
for (const key of ['Enter', ' ', 'Spacebar']) {
    const event = eventFor(key);
    assert.equal(activateLegendFromKeyboard(event, () => activations++), true);
    assert.equal(event.prevented, true);
}
assert.equal(activations, 3);
for (const options of [{repeat: true}, {altKey: true}, {ctrlKey: true}, {metaKey: true},
    {defaultPrevented: true}, {isComposing: true}]) {
    const event = eventFor(' ', options);
    assert.equal(activateLegendFromKeyboard(event, () => activations++), false);
    assert.equal(event.prevented, options.repeat === true);
}
const disabled = eventFor('Enter');
assert.equal(activateLegendFromKeyboard(disabled, () => activations++, false), false);
assert.equal(disabled.prevented, false);
const unrelated = eventFor('ArrowRight');
assert.equal(activateLegendFromKeyboard(unrelated, () => activations++), false);
assert.equal(unrelated.prevented, false);
assert.equal(activations, 3);

assert.deepEqual(resolveChartTheme(), {
    text: 'var(--kchart-text, #edf3f8)',
    muted: 'var(--kchart-muted, #b6c4cf)',
    grid: 'var(--kchart-grid, rgba(188, 206, 218, 0.18))'
});
const theme = {text: '#111', muted: '#555', grid: '#ddd'};
assert.deepEqual(resolveChartTheme(theme), theme);
assert.equal(resolveChartTheme({text: '#111'}).muted, resolveChartTheme().muted);
assert.deepEqual(resolveChartAccessibility(), {label: 'Chart', description: undefined});
assert.deepEqual(resolveChartAccessibility(undefined, ' Revenue '), {label: 'Revenue', description: undefined});
assert.deepEqual(resolveChartAccessibility({label: ' Sales ', description: ' Monthly totals '}),
    {label: 'Sales', description: 'Monthly totals'});
assert.equal(resolveChartAccessibility({label: ' ', description: ' '}, 'Revenue').label, 'Revenue');
assert.equal(resolveChartStatus(), undefined, 'status UI remains opt-in');
assert.equal(resolveChartStatus({state: 'ready'}), undefined);
assert.deepEqual(resolveChartStatus({state: 'loading'}), {state: 'loading', message: 'Loading...', role: 'status'});
assert.deepEqual(resolveChartStatus({state: 'empty'}), {state: 'empty', message: 'No data available', role: 'status'});
assert.deepEqual(resolveChartStatus({state: 'error', message: '<b>Offline</b>'}),
    {state: 'error', message: '<b>Offline</b>', role: 'alert'}, 'status messages stay plain text for the renderer');
assert.equal(resolveChartStatus({state: 'empty', message: ''}).message, '');

assert.deepEqual(resolveLegendLayout(100, 3), {
    itemWidth: 100, itemHeight: 22, columns: 1, rows: 3, height: 66, textWidth: 72
});
assert.equal(resolveLegendLayout(444, 7).rows, 3);
assert.equal(resolveLegendLayout(444, 7, 'right').columns, 1);
assert.equal(resolveLegendLayout(0, 2).textWidth, 0);
assert.equal(truncateLegendLabel('Revenue', 100), 'Revenue');
assert.equal(truncateLegendLabel('Revenue in North America', 70), 'Revenue...');
assert.equal(truncateLegendLabel('Revenue', 10), '');
assert.equal(truncateLegendLabel('Revenue', 30, (text) => text.length * 5), 'Rev...');

const path = require('node:path');
const {createContainer} = require('./helpers/core-dom.cjs');
const {createKChart} = require(path.join(process.env.KCHART_TEST_LIB || path.resolve(__dirname, '../lib'), 'core/create-kchart'));
const originalObserver = global.ResizeObserver;
const originalRequestFrame = global.requestAnimationFrame;
const originalCancelFrame = global.cancelAnimationFrame;
const observers = [];
const frames = new Map();
let nextFrame = 0;
global.ResizeObserver = class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
};
global.requestAnimationFrame = (callback) => { frames.set(++nextFrame, callback); return nextFrame; };
global.cancelAnimationFrame = (frame) => frames.delete(frame);
const configFor = (container, extra = {}) => ({
    selector: container,
    data: Array.from({length: 10}, (_, index) => ({x: `Month ${index}`, y: index})),
    axes: [{field: 'x', type: 'point', placement: 'bottom'}, {field: 'y', type: 'number', placement: 'left'}],
    series: [{selector: 'revenue', displayName: 'Revenue in North America', xField: 'x', yField: 'y', render() {}}],
    tooltip: {visible: true}, ...extra
});
try {
    const container = createContainer();
    let measured = {width: 240, height: 320};
    container.getBoundingClientRect = () => measured;
    const chart = createKChart(configFor(container, {
        accessibility: {label: 'Revenue', description: 'Monthly revenue totals'},
        status: {state: 'error', message: '<b>Offline</b>'}
    })).render();
    assert.equal(chart.getState().size.width, 240, 'runtime preserves sub-320 containers');
    const svg = container.querySelector('svg.kchart-svg');
    assert.equal(svg.getAttribute('aria-label'), 'Revenue');
    assert.equal(svg.querySelector('desc.kchart-description').textContent, 'Monthly revenue totals');
    assert.equal(svg.querySelector('text.kchart-status').textContent, '<b>Offline</b>');
    assert.equal(svg.querySelector('text.kchart-status').getAttribute('role'), 'alert');
    assert.equal(svg.querySelector('b'), null, 'status messages must not be interpreted as HTML');
    const legend = container.querySelector('g.kchart-legend-item');
    assert.equal(legend.getAttribute('tabindex'), '0');
    assert.equal(legend.getAttribute('aria-pressed'), 'true');
    assert.equal(legend.querySelector('title').textContent, 'Revenue in North America');
    assert(legend.querySelector('text').textContent.endsWith('...'));
    legend.listeners.get('keydown').call(legend, eventFor('Enter'));
    assert.equal(legend.getAttribute('aria-pressed'), 'false');
    legend.listeners.get('keydown').call(legend, eventFor(' '));
    assert.equal(legend.getAttribute('aria-pressed'), 'true');

    const overlay = container.querySelector('rect.kchart-tooltip-overlay');
    assert.equal(overlay.getAttribute('tabindex'), '0');
    overlay.listeners.get('focus').call(overlay, {});
    const tooltip = container.querySelector('div.kchart-tooltip');
    assert.equal(tooltip.getAttribute('aria-hidden'), 'false');
    const content = tooltip.querySelector('div.kchart-tooltip-content');
    assert(content.innerHTML.includes('Month 0'));
    overlay.listeners.get('keydown').call(overlay, eventFor('ArrowRight'));
    assert(content.innerHTML.includes('Month 1'));
    overlay.listeners.get('keydown').call(overlay, eventFor('End'));
    assert(content.innerHTML.includes('Month 9'));
    overlay.listeners.get('keydown').call(overlay, eventFor('Escape'));
    assert.equal(tooltip.getAttribute('aria-hidden'), 'true');

    const observer = observers.at(-1);
    measured = {width: 180, height: 260};
    observer.callback();
    observer.callback();
    assert.equal(frames.size, 1, 'resize observations share one animation frame');
    const [frameId, frame] = frames.entries().next().value;
    frames.delete(frameId);
    frame();
    assert.equal(chart.getState().size.width, 180);
    assert.equal(chart.getState().config.width, undefined, 'automatic resize must not pin measured width');
    measured = {width: 160, height: 240};
    observer.callback();
    const staleFrame = frames.values().next().value;
    chart.destroy();
    assert.equal(observer.disconnected, true);
    assert.equal(frames.size, 0, 'destroy cancels scheduled resize');
    staleFrame();
    observer.callback();
    assert.equal(frames.size, 0);
    assert.equal(chart.getState().size.width, 180, 'late resize callbacks cannot revive destroyed charts');

    const count = observers.length;
    const manual = createKChart(configFor(createContainer(), {autoResize: false}));
    assert.equal(observers.length, count);
    manual.destroy();
    const fixed = createKChart(configFor(createContainer(), {width: 640, height: 400}));
    assert.equal(observers.length, count, 'fully fixed dimensions need no resize observer');
    fixed.destroy();

    const many = Array.from({length: 7}, (_, index) => ({selector: `item-${index}`, render() {}}));
    for (const placement of ['top', 'bottom']) {
        const one = createKChart(configFor(createContainer(), {series: many.slice(0, 1), legend: {placement}, title: {text: 'Revenue'}}));
        const multi = createKChart(configFor(createContainer(), {series: many, legend: {placement}, title: {text: 'Revenue'}}));
        assert(multi.getState().margin[placement] > one.getState().margin[placement], `${placement} legends reserve all rows`);
        one.destroy();
        multi.destroy();
    }
    const canvasContainer = createContainer();
    const canvasChart = createKChart(configFor(canvasContainer));
    const canvas = canvasChart.getState().layers.getCanvas('special.[x] name');
    canvas.setAttribute('class', `${canvas.getAttribute('class')} consumer-style`);
    assert.equal(canvasChart.getState().layers.getCanvas('special.[x] name'), canvas);
    assert(canvas.getAttribute('class').includes('consumer-style'));
    assert.equal(canvasContainer.querySelectorAll('canvas').length, 1, 'consumer classes must not create duplicate canvases');
    canvasChart.destroy();

    let indexedReads = 0;
    const largeData = new Proxy({length: 5000000}, {
        get(target, key) {
            if (['map', 'filter', 'forEach'].includes(key)) {
                throw new Error(`Keyboard UI must not call data.${key}`);
            }
            if (/^\d+$/.test(String(key))) {
                indexedReads++;
                return {x: Number(key), y: 1};
            }
            return target[key];
        }
    });
    const largeContainer = createContainer();
    const largeChart = createKChart(configFor(largeContainer, {
        data: largeData,
        axes: [
            {field: 'x', type: 'number', placement: 'bottom', domain: [0, 4999999]},
            {field: 'y', type: 'number', placement: 'left', domain: [0, 2]}
        ]
    })).render();
    assert.equal(indexedReads, 0, 'render must not visit data to determine keyboard focusability');
    const largeOverlay = largeContainer.querySelector('rect.kchart-tooltip-overlay');
    largeOverlay.listeners.get('focus').call(largeOverlay, {});
    largeOverlay.listeners.get('keydown').call(largeOverlay, eventFor('ArrowRight'));
    largeOverlay.listeners.get('keydown').call(largeOverlay, eventFor('End'));
    assert.equal(indexedReads, 3, 'keyboard navigation reads only each requested raw data index');
    largeChart.destroy();

    const padded = createContainer();
    let contentWidth = 600;
    padded.ownerDocument.defaultView = {getComputedStyle: () => ({
        getPropertyValue: (name) => name.startsWith('padding-') ? '10px' : '0px'
    })};
    padded.computedStyleMap = () => new Map([['height', 'auto']]);
    padded.getBoundingClientRect = () => ({
        width: contentWidth + 20,
        height: Number(padded.querySelector('svg')?.getAttribute('height') || 150) + 20
    });
    const paddedChart = createKChart(configFor(padded, {axes: [], data: [], series: [], legend: {visible: false}})).render();
    const paddedObserver = observers.at(-1);
    assert.deepEqual(paddedChart.getState().size, {width: 600, height: 150});
    for (let index = 0; index < 8; index++) {
        paddedObserver.callback();
        const pendingFrames = [...frames.entries()];
        frames.clear();
        pendingFrames.forEach(([, callback]) => callback());
        assert.equal(paddedChart.getState().size.height, 150, 'intrinsic padded height must not feed back into resizing');
    }
    contentWidth = 400;
    paddedObserver.callback();
    const widthFrames = [...frames.values()];
    frames.clear();
    widthFrames.forEach((callback) => callback());
    assert.deepEqual(paddedChart.getState().size, {width: 400, height: 150});
    paddedChart.destroy();

    const sharedContainer = createContainer();
    let retainedCanvas;
    const removed = {selector: 'removed', render: ({getCanvas}) => getCanvas('shared'), destroy: ({svg}) => {
        const {destroyCanvasByClass} = require(path.join(process.env.KCHART_TEST_LIB || path.resolve(__dirname, '../lib'), 'series/support/canvas'));
        destroyCanvasByClass(svg, 'kchart-2d-canvas-shared');
    }};
    const retained = {selector: 'retained', render: ({getCanvas}) => { retainedCanvas ||= getCanvas('shared'); }};
    const sharedChart = createKChart(configFor(sharedContainer, {series: [removed, retained]})).render();
    const originalShared = retainedCanvas;
    sharedChart.updateSeries([retained]);
    assert.equal(retainedCanvas, originalShared);
    assert.equal(retainedCanvas.parentNode, sharedContainer, 'removed cleanup must not detach retained cached shared canvas');
    assert.equal(sharedContainer.querySelectorAll('canvas').length, 1);
    sharedChart.destroy();

    const navConfig = {height: 52, gap: 14};
    const navChart = createKChart(configFor(createContainer(), {
        width: 640, height: 400,
        axes: [{field: 'x', type: 'number', placement: 'bottom'}, {field: 'y', type: 'number', placement: 'left'}],
        legend: {placement: 'bottom'}, rangeNavigator: navConfig
    }));
    const navState = navChart.getState();
    const legendLayout = resolveLegendLayout(navState.plotSize.width, navState.series.length, 'bottom');
    const {resolveRangeNavigatorTopOffset} = require(path.join(process.env.KCHART_TEST_LIB || path.resolve(__dirname, '../lib'), 'options/range-navigator'));
    const navigatorBottom = navState.margin.top + navState.plotSize.height
        + resolveRangeNavigatorTopOffset(navState.margin.bottom, navConfig, legendLayout.height + 12) + navConfig.height;
    const legendTop = navState.size.height - legendLayout.height;
    assert(navigatorBottom < legendTop, 'navigator footer must exclude the separately reserved bottom legend');
    navChart.destroy();
} finally {
    global.ResizeObserver = originalObserver;
    global.requestAnimationFrame = originalRequestFrame;
    global.cancelAnimationFrame = originalCancelFrame;
}

console.log('usability.test.cjs passed');
