const assert = require('node:assert/strict');
const {resolveGraphData} = require('../lib/series/svg-graph');

const rows = [
    {source: 'A', target: 'B', metric: 10, category: 'client'},
    {source: 'A', target: 'B', metric: 5, category: 'client'},
    {source: 'B', target: 'C', metric: 8, category: 'service'},
    {source: 'C', target: 'C', metric: 3, category: 'data'},
    {source: '', target: 'D', metric: 99, category: 'ignored'}
];

const graph = resolveGraphData(rows, {
    sourceField: 'source',
    targetField: 'target',
    valueField: 'metric',
    categoryField: 'category',
    categorySide: 'source'
});

assert.equal(graph.nodes.length, 3, 'blank node ids should be ignored');
assert.equal(graph.edges.length, 3, 'duplicate source-target rows should aggregate');

const node = (id) => graph.nodes.find((item) => item.id === id);
const edge = (source, target) => graph.edges.find((item) => item.source.id === source && item.target.id === target);

assert.equal(edge('A', 'B').value, 15, 'duplicate edge metrics should sum');
assert.equal(edge('A', 'B').rows.length, 2, 'aggregated edge should preserve source rows');
assert.equal(node('A').value, 15, 'source node metric should include outgoing edges');
assert.equal(node('B').value, 23, 'node metric should include incoming and outgoing edges');
assert.equal(node('C').value, 11, 'self-loop metric should only be counted once');
assert.equal(node('A').category, 'client', 'source category should bind to the source node');
assert.equal(node('B').category, 'service', 'later source rows may define a node category');

const missingMetric = resolveGraphData(
    [{source: 'A', target: 'B', metric: 'not-a-number'}],
    {sourceField: 'source', targetField: 'target', valueField: 'metric'}
);
assert.equal(missingMetric.edges[0].value, 0, 'invalid metrics should preserve the edge with a zero value');

console.log('graph.test.cjs passed');
