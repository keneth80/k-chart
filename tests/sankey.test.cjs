const assert = require('node:assert/strict');
const {resolveSankeyData} = require('../lib/series/svg-sankey');

const rows = [
    {source: 'Visit', target: 'Signup', metric: 10, category: 'acquisition'},
    {source: 'Visit', target: 'Signup', metric: 5, category: 'acquisition'},
    {source: 'Signup', target: 'Paid', metric: 8, category: 'conversion'},
    {source: 'Signup', target: 'Drop off', metric: 7, category: 'conversion'},
    {source: '', target: 'Ignored', metric: 100, category: 'ignored'}
];

const graph = resolveSankeyData(rows, {
    sourceField: 'source',
    targetField: 'target',
    valueField: 'metric',
    categoryField: 'category',
    categorySide: 'source'
});

const node = (id) => graph.nodes.find((item) => item.id === id);
const link = (source, target) => graph.links.find((item) => item.source.id === source && item.target.id === target);

assert.equal(graph.nodes.length, 4, 'blank node ids should be ignored');
assert.equal(graph.links.length, 3, 'duplicate source-target rows should aggregate');
assert.equal(link('Visit', 'Signup').value, 15, 'duplicate flow metrics should sum');
assert.equal(link('Visit', 'Signup').rows.length, 2, 'aggregated flow should preserve source rows');
assert.equal(node('Visit').value, 15, 'source node value should equal total outgoing flow');
assert.equal(node('Signup').value, 15, 'middle node value should use the larger incoming/outgoing total');
assert.equal(node('Visit').category, 'acquisition', 'source category should bind to the source node');

const normalized = resolveSankeyData(
    [{source: 'A', target: 'B', metric: -4}, {source: 'B', target: 'C', metric: 'invalid'}],
    {sourceField: 'source', targetField: 'target', valueField: 'metric'}
);
assert.equal(normalized.links[0].value, 0, 'negative metrics should clamp to zero');
assert.equal(normalized.links[1].value, 0, 'invalid metrics should become zero');

assert.throws(
    () => resolveSankeyData(
        [{source: 'A', target: 'B', metric: 1}, {source: 'B', target: 'A', metric: 1}],
        {sourceField: 'source', targetField: 'target', valueField: 'metric'}
    ),
    /requires an acyclic flow/,
    'cycles should fail with a clear Sankey-specific error'
);

const deepDagRows = Array.from({length: 10_000}, (_, index) => ({
    source: `node-${index}`,
    target: `node-${index + 1}`,
    metric: 1
}));
const deepDag = resolveSankeyData(deepDagRows, {
    sourceField: 'source',
    targetField: 'target',
    valueField: 'metric'
});
assert.equal(deepDag.links.length, 10_000, 'deep acyclic flows should not overflow the call stack');
assert.equal(deepDag.nodes.length, 10_001, 'deep acyclic flows should preserve every node');

console.log('sankey.test.cjs passed');
