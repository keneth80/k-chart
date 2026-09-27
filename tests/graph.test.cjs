const assert = require('node:assert/strict');
const {
    applyForceLayout,
    applyLayeredLayout,
    createGraphSeries,
    resolveGraphData
} = require('../lib/series/svg-graph');

const graphFields = {
    sourceField: 'source',
    targetField: 'target',
    valueField: 'metric'
};

class FakeElement {
    constructor(tagName, datum) {
        this.tagName = tagName;
        this.__data__ = datum;
        this.attributes = {};
        this.styles = {};
        this.events = {};
        this.children = [];
        this.parentNode = null;
        this.textContent = '';
    }

    appendChild(child) {
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    querySelector(selector) {
        return findAll(this, (node) => matchesSimple(node, selector))[0] ?? null;
    }
}

const matchesSimple = (node, selector) => {
    const tag = selector.match(/^[^.#]+/)?.[0];
    const id = selector.match(/#([^.#]+)/)?.[1];
    const className = selector.match(/\.([^.#]+)/)?.[1];
    const classes = String(node.attributes.class ?? '').split(/\s+/).filter(Boolean);
    return (!tag || node.tagName === tag)
        && (!id || node.attributes.id === id)
        && (!className || classes.includes(className));
};

const matchesCompound = (node, selector) => {
    const parts = selector.trim().split(/\s+/);
    if (!matchesSimple(node, parts[parts.length - 1])) return false;
    let ancestor = node.parentNode;
    for (let index = parts.length - 2; index >= 0; index -= 1) {
        while (ancestor && !matchesSimple(ancestor, parts[index])) ancestor = ancestor.parentNode;
        if (!ancestor) return false;
        ancestor = ancestor.parentNode;
    }
    return true;
};

function findAll(root, predicate) {
    const result = [];
    root.children.forEach((child) => {
        if (predicate(child)) result.push(child);
        result.push(...findAll(child, predicate));
    });
    return result;
}

class FakeSelection {
    constructor(nodes, parents = nodes, selector = '') {
        this.nodes = nodes;
        this.parents = parents;
        this.selector = selector;
        this.dataSource = undefined;
        this.key = undefined;
    }

    selectAll(selector) {
        if (selector.includes(' ')) {
            const matches = this.nodes.flatMap((node) => findAll(node, (child) => matchesCompound(child, selector)));
            return new FakeSelection(matches, this.nodes, selector);
        }
        const matches = this.nodes.flatMap((node) => node.children.filter((child) => matchesSimple(child, selector)));
        return new FakeSelection(matches, this.nodes, selector);
    }

    data(source, key) {
        this.dataSource = source;
        this.key = key;
        return this;
    }

    join(tagName) {
        const joined = [];
        this.parents.forEach((parent, parentIndex) => {
            const values = typeof this.dataSource === 'function'
                ? this.dataSource(parent.__data__, parentIndex, this.parents)
                : this.dataSource;
            const data = Array.from(values ?? []);
            const existing = parent.children.filter((child) => matchesSimple(child, this.selector));
            const used = new Set();
            data.forEach((datum, index) => {
                let child;
                if (this.key) {
                    const datumKey = this.key(datum, index, data);
                    child = existing.find((candidate, candidateIndex) => (
                        !used.has(candidate)
                        && this.key(candidate.__data__, candidateIndex, existing) === datumKey
                    ));
                } else {
                    child = existing[index];
                }
                if (!child) child = parent.appendChild(new FakeElement(tagName, datum));
                child.__data__ = datum;
                used.add(child);
                joined.push(child);
            });
            parent.children = parent.children.filter((child) => (
                !matchesSimple(child, this.selector) || used.has(child)
            ));
        });
        return new FakeSelection(joined);
    }

    attr(name, value) {
        return this.applyValue(value, (node, resolved) => {
            if (resolved === null || resolved === undefined) delete node.attributes[name];
            else node.attributes[name] = resolved;
        });
    }

    style(name, value) {
        return this.applyValue(value, (node, resolved) => {
            if (resolved === null || resolved === undefined) delete node.styles[name];
            else node.styles[name] = resolved;
        });
    }

    text(value) {
        return this.applyValue(value, (node, resolved) => {
            node.textContent = String(resolved ?? '');
        });
    }

    on(name, handler) {
        this.nodes.forEach((node) => {
            if (handler === null) delete node.events[name];
            else node.events[name] = handler;
        });
        return this;
    }

    each(callback) {
        this.nodes.forEach((node, index) => callback.call(node, node.__data__, index, this.nodes));
        return this;
    }

    lower() {
        return this;
    }

    node() {
        return this.nodes[0] ?? null;
    }

    applyValue(value, apply) {
        this.nodes.forEach((node, index) => {
            const resolved = typeof value === 'function'
                ? value(node.__data__, index, this.nodes)
                : value;
            apply(node, resolved);
        });
        return this;
    }
}

global.document = {
    createElementNS(_namespace, tagName) {
        return new FakeElement(tagName);
    }
};

const createHarness = (selector) => {
    const outer = new FakeElement('g');
    const group = outer.appendChild(new FakeElement('g'));
    group.attributes.class = selector;
    return {
        group,
        groupSelection: new FakeSelection([group]),
        outerSelection: new FakeSelection([outer])
    };
};

const renderSeries = (series, harness, data, width = 600, height = 420) => {
    series.render({
        group: harness.groupSelection,
        data,
        plotSize: {width, height},
        color: '#336699',
        animation: {enabled: false, progress: 1}
    });
};

const byClass = (root, className) => findAll(root, (node) => (
    String(node.attributes.class ?? '').split(/\s+/).includes(className)
));

const rows = [
    {source: 'A', target: 'B', metric: 10, category: 'client'},
    {source: 'A', target: 'B', metric: 5, category: 'client'},
    {source: 'B', target: 'C', metric: 8, category: 'service'},
    {source: 'C', target: 'C', metric: 3, category: 'data'},
    {source: '', target: 'D', metric: 99, category: 'ignored'}
];

const graph = resolveGraphData(rows, {
    ...graphFields,
    categoryField: 'category',
    categorySide: 'source'
});
const node = (id) => graph.nodes.find((item) => item.id === id);
const edge = (source, target) => graph.edges.find((item) => item.source.id === source && item.target.id === target);

assert.equal(graph.nodes.length, 3, 'blank node ids should be ignored');
assert.equal(graph.edges.length, 3, 'duplicate source-target rows should aggregate');
assert.equal(edge('A', 'B').value, 15, 'duplicate edge metrics should sum');
assert.equal(edge('A', 'B').rows.length, 2, 'aggregated edge should preserve source rows');
assert.equal(node('A').value, 15, 'source node metric should include outgoing edges');
assert.equal(node('B').value, 23, 'node metric should include incoming and outgoing edges');
assert.equal(node('C').value, 11, 'self-loop metric should only be counted once');
assert.equal(node('A').category, 'client', 'source category should bind to the source node');
assert.equal(node('B').category, 'service', 'later source rows may define a node category');

const missingMetric = resolveGraphData(
    [{source: 'A', target: 'B', metric: 'not-a-number'}],
    graphFields
);
assert.equal(missingMetric.edges[0].value, 0, 'invalid metrics should preserve the edge with a zero value');

const forceGraph = resolveGraphData([
    {source: 'A', target: 'B', metric: 4},
    {source: 'B', target: 'C', metric: 3},
    {source: 'C', target: 'D', metric: 2}
], graphFields);
const forceOptions = {
    width: 500,
    height: 320,
    radius: () => 12,
    linkDistance: 90,
    collisionPadding: 8,
    iterations: 100
};
const defaultForce = applyForceLayout(forceGraph.nodes, forceGraph.edges, forceOptions);
const zeroGravityForce = applyForceLayout(forceGraph.nodes, forceGraph.edges, {...forceOptions, gravity: 0});
const gravityForce = applyForceLayout(forceGraph.nodes, forceGraph.edges, {...forceOptions, gravity: 0.25});
assert.deepEqual(defaultForce, zeroGravityForce, 'omitted gravity must preserve the original force layout');
assert.ok(
    gravityForce.positions.some((position, index) => (
        Math.hypot(
            position.x - defaultForce.positions[index].x,
            position.y - defaultForce.positions[index].y
        ) > 1e-6
    )),
    'positive gravity should add centering force'
);
assert.ok(forceGraph.nodes.every((item) => item.x === 0 && item.y === 0), 'force helper must not mutate graph nodes');

const crossingGraph = resolveGraphData([
    {source: 'C', target: 'C', metric: 1},
    {source: 'D', target: 'D', metric: 1},
    {source: 'A', target: 'D', metric: 1},
    {source: 'B', target: 'C', metric: 1}
], graphFields);
const crossingRanks = crossingGraph.nodes.map((item) => item.id === 'A' || item.id === 'B' ? 0 : 1);
const crossingLayout = applyLayeredLayout(crossingGraph.nodes, crossingGraph.edges, {
    width: 420,
    height: 260,
    radius: () => 12,
    ranks: crossingRanks,
    collisionPadding: 6,
    rankGap: 60
});
const crossingPosition = (id) => crossingLayout.positions[crossingGraph.nodes.findIndex((item) => item.id === id)];
assert.equal(crossingPosition('A').y, crossingPosition('B').y, 'same-rank nodes should form a horizontal row');
assert.ok(crossingPosition('A').y < crossingPosition('C').y, 'rank zero should be above later ranks');
assert.ok(crossingPosition('D').x < crossingPosition('C').x, 'barycenter ordering should reduce crossings');
assert.ok(crossingGraph.nodes.every((item) => item.x === 0 && item.y === 0), 'layered helper must not mutate graph nodes');

const denseGraph = resolveGraphData(Array.from({length: 32}, (_, index) => ({
    source: `N${index}`,
    target: `N${index}`,
    metric: index + 1
})), graphFields);
const denseBaseRadii = denseGraph.nodes.map((_item, index) => 6 + index % 5);
const denseLayout = applyLayeredLayout(denseGraph.nodes, denseGraph.edges, {
    width: 150,
    height: 110,
    radius: (_item, index) => denseBaseRadii[index],
    ranks: denseGraph.nodes.map(() => 0),
    collisionPadding: 5,
    rankGap: 40
});
assert.ok(denseLayout.radiusScale < 1, 'dense ranks should uniformly scale node radii');
assert.ok(new Set(denseLayout.positions.map((position) => position.y.toFixed(6))).size > 1, 'dense ranks should wrap');
for (let left = 0; left < denseGraph.nodes.length; left += 1) {
    for (let right = left + 1; right < denseGraph.nodes.length; right += 1) {
        const distance = Math.hypot(
            denseLayout.positions[left].x - denseLayout.positions[right].x,
            denseLayout.positions[left].y - denseLayout.positions[right].y
        );
        const minimum = (denseBaseRadii[left] + denseBaseRadii[right]) * denseLayout.radiusScale;
        assert.ok(distance + 1e-7 >= minimum, `dense nodes ${left} and ${right} must not overlap`);
    }
}

const denseLabelWidths = denseGraph.nodes.map((_item, index) => 52 + index % 4 * 12);
const denseLabelHeight = 22;
const denseLabelLayout = applyLayeredLayout(denseGraph.nodes, denseGraph.edges, {
    width: 180,
    height: 130,
    radius: (_item, index) => denseBaseRadii[index],
    ranks: denseGraph.nodes.map(() => 0),
    collisionPadding: 5,
    rankGap: 40,
    labelWidth: (_item, index) => denseLabelWidths[index],
    labelHeight: () => denseLabelHeight
});
const denseLabelBounds = denseLabelLayout.positions.map((position, index) => {
    const scale = denseLabelLayout.radiusScale;
    const radius = denseBaseRadii[index] * scale;
    const width = Math.max(denseBaseRadii[index] * 2, denseLabelWidths[index]) * scale;
    return {
        left: position.x - width / 2,
        right: position.x + width / 2,
        top: position.y - radius,
        bottom: position.y - radius + (denseBaseRadii[index] * 2 + denseLabelHeight) * scale
    };
});
denseLabelBounds.forEach((bounds) => {
    assert.ok(bounds.left >= -1e-7 && bounds.right <= 180 + 1e-7, 'layered labels must stay inside horizontal bounds');
    assert.ok(bounds.top >= -1e-7 && bounds.bottom <= 130 + 1e-7, 'layered labels must stay inside vertical bounds');
});
for (let left = 0; left < denseLabelBounds.length; left += 1) {
    for (let right = left + 1; right < denseLabelBounds.length; right += 1) {
        const a = denseLabelBounds[left];
        const b = denseLabelBounds[right];
        const overlaps = a.right > b.left + 1e-7
            && a.left < b.right - 1e-7
            && a.bottom > b.top + 1e-7
            && a.top < b.bottom - 1e-7;
        assert.equal(overlaps, false, `dense label footprints ${left} and ${right} must not overlap`);
    }
}

const liveRows = [
    {source: 'A', target: 'B', metric: 4, sourceRank: 0, targetRank: 1, edgeColor: '#aa0000', dash: null, nodeColor: '#110000'},
    {source: 'B', target: 'C', metric: 3, sourceRank: 1, targetRank: 2, edgeColor: '#00aa00', dash: '5 2', nodeColor: '#001100'}
];
const seenEdgeCallbacks = [];
const seenNodeCallbacks = [];
const configuration = {
    selector: 'integration-graph',
    ...graphFields,
    layout: 'layered',
    nodeRank: (graphNode) => {
        const row = graphNode.rows[0];
        return graphNode.id === row.source ? row.sourceRank : row.targetRank;
    },
    nodeColor: (graphNode, index) => {
        seenNodeCallbacks.push({id: graphNode.id, index, row: graphNode.rows[0]});
        return graphNode.id === 'C' ? graphNode.rows[0].nodeColor : ['#101010', '#202020', '#303030'][index];
    },
    edgeColor: (graphEdge, index) => {
        seenEdgeCallbacks.push({id: graphEdge.id, index, row: graphEdge.rows[0]});
        return graphEdge.rows[0].edgeColor;
    },
    edgeDash: (graphEdge) => graphEdge.rows[0].dash,
    linkDistance: 80,
    labels: false,
    roam: 'disabled'
};
const series = createGraphSeries(configuration);
const harness = createHarness(configuration.selector);
renderSeries(series, harness, liveRows);

let renderedNodes = byClass(harness.group, 'kchart-graph-node');
let renderedCircles = byClass(harness.group, 'kchart-graph-node-circle');
let renderedEdges = byClass(harness.group, 'kchart-graph-edge');
assert.deepEqual(renderedEdges.map((item) => item.styles.stroke), ['#aa0000', '#00aa00']);
assert.equal(renderedEdges[0].styles['stroke-dasharray'], undefined, 'null edgeDash should render a solid edge');
assert.equal(renderedEdges[1].styles['stroke-dasharray'], '5 2', 'edgeDash callback should reach SVG');
assert.deepEqual(renderedCircles.map((item) => item.styles.fill), ['#101010', '#202020', '#001100']);
assert.ok(seenEdgeCallbacks.some((call) => call.id.includes('B\u0000C') && call.index === 1), 'edge callbacks need true edge indexes');
assert.ok(seenNodeCallbacks.some((call) => call.id === 'C' && call.index === 2), 'node callbacks need stable indexes');

const renderedNode = (id) => renderedNodes.find((item) => item.__data__.id === id).__data__;
const nodeATooltip = series.tooltip({mouseX: renderedNode('A').x, mouseY: renderedNode('A').y});
assert.equal(nodeATooltip.color, '#101010', 'node tooltip should use the resolved node color');
const edgeBC = renderedEdges[1].__data__;
const edgeBCTooltip = series.tooltip({
    mouseX: (edgeBC.source.x + edgeBC.target.x) / 2,
    mouseY: (edgeBC.source.y + edgeBC.target.y) / 2
});
assert.equal(edgeBCTooltip.color, '#00aa00', 'edge tooltip should resolve color with the true edge index');
assert.equal(edgeBCTooltip.data, liveRows[1]);

renderedEdges.forEach((item) => {
    item.styles.stroke = '#ffffff';
    item.styles['stroke-dasharray'] = '1 1';
});
series.clearTooltip({seriesGroup: harness.outerSelection});
assert.deepEqual(renderedEdges.map((item) => item.styles.stroke), ['#aa0000', '#00aa00']);
assert.equal(renderedEdges[0].styles['stroke-dasharray'], undefined, 'clearTooltip should restore a null dash');
assert.equal(renderedEdges[1].styles['stroke-dasharray'], '5 2', 'clearTooltip should restore callback dash');

const nodeAGroup = renderedNodes.find((item) => item.__data__.id === 'A');
nodeAGroup.events.click({stopPropagation() {}}, nodeAGroup.__data__);
assert.equal(renderedEdges[0].styles.stroke, '#eaf7ff', 'selected node should emphasize connected edges');
assert.equal(renderedEdges[1].styles.stroke, '#00aa00', 'unconnected edges should retain callback color');
series.clearTooltip({seriesGroup: harness.outerSelection});
assert.equal(renderedEdges[0].styles.stroke, '#eaf7ff', 'clearTooltip should preserve selection emphasis');
assert.equal(renderedEdges[1].styles.stroke, '#00aa00');
nodeAGroup.events.click({stopPropagation() {}}, nodeAGroup.__data__);

const replacement = {
    ...liveRows[1],
    edgeColor: '#0000aa',
    dash: '2 3',
    nodeColor: '#000011'
};
liveRows[1] = replacement;
seenEdgeCallbacks.length = 0;
seenNodeCallbacks.length = 0;
renderSeries(series, harness, liveRows);
renderedNodes = byClass(harness.group, 'kchart-graph-node');
renderedCircles = byClass(harness.group, 'kchart-graph-node-circle');
renderedEdges = byClass(harness.group, 'kchart-graph-edge');
assert.equal(renderedEdges[1].styles.stroke, '#0000aa', 'same-array row replacement should rebuild edge rows');
assert.equal(renderedEdges[1].styles['stroke-dasharray'], '2 3');
assert.equal(renderedCircles[2].styles.fill, '#000011', 'node callbacks should receive replacement rows');
assert.ok(seenEdgeCallbacks.some((call) => call.row === replacement));
assert.ok(seenNodeCallbacks.some((call) => call.id === 'C' && call.row === replacement));

replacement.targetRank = 0;
renderSeries(series, harness, liveRows);
renderedNodes = byClass(harness.group, 'kchart-graph-node');
const reranked = new Map(renderedNodes.map((item) => [item.__data__.id, item.__data__]));
assert.equal(reranked.get('A').y, reranked.get('C').y, 'in-place nodeRank changes should rerun layered layout');
assert.ok(reranked.get('A').y < reranked.get('B').y);

const boundaryRows = [{source: 'A', target: 'BC', metric: 1}];
const boundarySeries = createGraphSeries({
    selector: 'boundary-graph',
    ...graphFields,
    layout: 'circular',
    labels: false,
    roam: 'disabled'
});
const boundaryHarness = createHarness('boundary-graph');
renderSeries(boundarySeries, boundaryHarness, boundaryRows);
assert.deepEqual(byClass(boundaryHarness.group, 'kchart-graph-node').map((item) => item.__data__.id), ['A', 'BC']);
boundaryRows[0].source = 'AB';
boundaryRows[0].target = 'C';
renderSeries(boundarySeries, boundaryHarness, boundaryRows);
assert.deepEqual(
    byClass(boundaryHarness.group, 'kchart-graph-node').map((item) => item.__data__.id),
    ['AB', 'C'],
    'field-boundary changes must invalidate the same-array graph cache'
);

const cyclicRows = [
    {source: 'A', target: 'B', metric: 1},
    {source: 'B', target: 'C', metric: 1},
    {source: 'C', target: 'B', metric: 1},
    {source: 'C', target: 'D', metric: 1}
];
const cyclicSeries = createGraphSeries({
    selector: 'cyclic-graph',
    ...graphFields,
    layout: 'layered',
    labels: false,
    roam: 'disabled'
});
const cyclicHarness = createHarness('cyclic-graph');
renderSeries(cyclicSeries, cyclicHarness, cyclicRows);
const cyclicNodes = new Map(byClass(cyclicHarness.group, 'kchart-graph-node').map((item) => [
    item.__data__.id,
    item.__data__
]));
assert.ok(cyclicNodes.get('A').y < cyclicNodes.get('B').y, 'a cycle should retain its incoming DAG rank');
assert.equal(cyclicNodes.get('B').y, cyclicNodes.get('C').y, 'members of a strongly connected component share a rank');
assert.ok(cyclicNodes.get('C').y < cyclicNodes.get('D').y, 'a cycle should retain its outgoing DAG rank');

console.log('graph.test.cjs passed');
