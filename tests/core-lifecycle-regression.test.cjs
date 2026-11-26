const assert = require('node:assert/strict');
const path = require('node:path');
const {createContainer} = require('./helpers/core-dom.cjs');
const {createKChart} = require(path.join(process.env.KCHART_TEST_LIB ?? '../lib', 'core/create-kchart'));

const configuration = (selector, series, extra = {}) => ({
    selector, series, data: [], axes: [], width: 640, height: 400,
    legend: {visible: false}, grid: {visible: false}, ...extra
});
const makeSeries = (selector, canvas = false) => {
    const calls = {render: 0, destroy: 0};
    const series = {
        selector,
        render(context) {
            calls.render += 1;
            if (canvas) context.getCanvas(selector);
        },
        destroy({svg}) {
            calls.destroy += 1;
            if (canvas) {
                const parent = svg.node().parentNode;
                parent?.querySelectorAll('canvas').forEach((node) => {
                    if (node.getAttribute('class') === `kchart-2d-canvas-${selector}`) parent.removeChild(node);
                });
            }
        }
    };
    return {series, calls};
};

async function main() {
    const container = createContainer();
    const first = makeSeries('first');
    const retained = makeSeries('retained');
    const replaced = makeSeries('first');
    const chart = createKChart(configuration(container, [first.series, retained.series]));
    assert.equal(first.calls.render, 0, 'creation must not implicitly render');
    chart.render();
    const next = [retained.series, replaced.series];
    chart.updateSeries(next);
    assert.equal(first.calls.destroy, 1, 'replacement must destroy the old object even with the same selector');
    assert.equal(retained.calls.destroy, 0, 'retained instances must not be destroyed');
    assert.equal(chart.getState().series, next);
    assert.equal(chart.getState().config.series, next, 'layout configuration must follow the current series');
    chart.updateSeries([retained.series]);
    assert.equal(replaced.calls.destroy, 1, 'removed objects must be destroyed');
    chart.updateSeries([retained.series]);
    assert.equal(retained.calls.destroy, 0);

    chart.getState().hiddenSeries.add('retained');
    chart.getState().hiddenSeries.add('stale');
    chart.updateSeries([retained.series]);
    assert.deepEqual([...chart.getState().hiddenSeries], ['retained'], 'only retained identities keep hidden state');
    const replacement = makeSeries('retained');
    chart.updateSeries([replacement.series]);
    assert.equal(chart.getState().hiddenSeries.size, 0, 'replacement identities start visible');
    assert.equal(replacement.calls.render, 1);

    const completionBeforeInvalid = chart.whenRenderComplete();
    const svgBeforeInvalid = chart.getState().layers.svg.node();
    assert.throws(() => chart.updateSeries([replacement.series, makeSeries('retained').series]), /Duplicate KChart series selector/);
    assert.equal(chart.getState().series[0], replacement.series);
    assert.equal(replacement.calls.destroy, 0, 'invalid updates must not destroy existing objects');
    assert.equal(chart.whenRenderComplete(), completionBeforeInvalid, 'invalid updates must not start renders');
    assert.throws(() => createKChart(configuration(container, [replacement.series, replacement.series])), /Duplicate/);
    assert.equal(svgBeforeInvalid.parentNode, container, 'invalid creation must not retire the live chart');

    const special = makeSeries('sales.[a]:#b "quoted" \\ path', true);
    chart.updateSeries([special.series]);
    const canvas = container.querySelector('canvas');
    chart.render();
    assert.equal(container.querySelector('canvas'), canvas, 'opaque canvas names must reuse their canvas');
    assert.equal(chart.getState().layers.seriesGroup.node().firstChild.getAttribute('class'), `${special.series.selector}-group`);

    let detachedCanvasVisits = 0;
    for (let index = 0; index < 40; index += 1) {
        const oldCanvas = container.querySelector('canvas');
        const oldParent = oldCanvas.parentNode;
        const swap = makeSeries(`swap-${index}`, true);
        chart.updateSeries([swap.series]);
        assert.equal(oldCanvas.parentNode, null);
        Object.defineProperty(oldCanvas, 'parentNode', {get() { detachedCanvasVisits += 1; return null; }});
        assert.equal(oldParent.querySelectorAll('canvas').length, 1, 'swaps must not accumulate live canvases');
    }
    assert.equal(detachedCanvasVisits, 0, 'detached canvases must be pruned from ownership tracking');

    const newerSeries = makeSeries('newer', true);
    const newer = createKChart(configuration(container, [newerSeries.series])).render();
    const newerSvg = newer.getState().layers.svg.node();
    const newerCanvas = container.querySelector('canvas');
    chart.destroy();
    chart.destroy();
    assert.equal(newerSvg.parentNode, container, 'old destroy must not erase the new SVG');
    assert.equal(newerCanvas.parentNode, container, 'old destroy must not erase the new canvas');
    const oldState = chart.getState();
    const oldConfig = oldState.config;
    const oldPromise = chart.whenRenderComplete();
    assert.equal(chart.render(), chart);
    assert.equal(chart.updateData([{x: 2}]), chart);
    assert.equal(chart.updateAxes([{field: 'x', type: 'number', placement: 'bottom'}]), chart);
    assert.equal(chart.updateSeries([newerSeries.series, newerSeries.series]), chart);
    assert.equal(chart.resize({width: 900}), chart);
    assert.equal(oldState.config, oldConfig, 'postdestroy mutators must not change state');
    assert.equal(chart.whenRenderComplete(), oldPromise, 'postdestroy must preserve the completion promise');
    newer.destroy();
    newer.destroy();
    assert.equal(newerSeries.calls.destroy, 1, 'destroy must be idempotent');
    assert.equal(container.querySelectorAll('canvas').length, 0);
    assert.equal(container.querySelectorAll('svg.kchart-svg').length, 0);
    assert.equal(container.querySelectorAll('div.kchart-tooltip').length, 0);

    let finishTask;
    const task = new Promise((resolve) => { finishTask = resolve; });
    const events = [];
    const asyncChart = createKChart(configuration(createContainer(), [{
        selector: 'async', render: ({registerAsyncRenderTask}) => registerAsyncRenderTask(task)
    }], {onRenderComplete: (event) => events.push(event)}));
    const initial = await asyncChart.whenRenderComplete();
    assert.equal(initial.renderId, 0);
    asyncChart.render();
    const pending = asyncChart.whenRenderComplete();
    let settled = false;
    pending.then(() => { settled = true; });
    await Promise.resolve();
    assert.equal(settled, false, 'completion must await registered tasks');
    asyncChart.destroy();
    assert.equal(asyncChart.whenRenderComplete(), pending);
    finishTask();
    const event = await pending;
    assert.equal(event.renderId, 1);
    assert.equal(event.asyncTasks, 1);
    assert.deepEqual(events, [event], 'preserve existing completion callback behavior after destroy');
    console.log('core-lifecycle-regression.test.cjs passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
