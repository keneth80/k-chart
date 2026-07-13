const assert = require('node:assert/strict');
const {resolveTreeData} = require('../lib/series/svg-tree');

const fields = {
    idField: 'id',
    parentField: 'parentId',
    labelField: 'name',
    valueField: 'headcount',
    categoryField: 'team'
};

const rows = [
    {id: 'company', parentId: null, name: 'KChart', headcount: 42, team: 'company'},
    {id: 'product', parentId: 'company', name: 'Product', headcount: 14, team: 'product'},
    {id: 'engineering', parentId: 'company', name: 'Engineering', headcount: 24, team: 'engineering'},
    {id: 'platform', parentId: 'engineering', name: 'Platform', headcount: 8, team: 'engineering'}
];

const tree = resolveTreeData(rows, fields);
const node = (id) => tree.nodes.find((item) => item.id === id);

assert.equal(tree.root.id, 'company', 'the only parentless row should become the root');
assert.equal(tree.nodes.length, rows.length, 'every row should become one tree node');
assert.equal(tree.links.length, rows.length - 1, 'every non-root row should produce one link');
assert.deepEqual(node('company').children.map((child) => child.id), ['product', 'engineering']);
assert.equal(node('platform').parent.id, 'engineering');
assert.equal(node('platform').depth, 2);
assert.equal(node('engineering').label, 'Engineering');
assert.equal(node('engineering').value, 24);
assert.equal(node('engineering').category, 'engineering');

assert.deepEqual(resolveTreeData([], fields), {root: null, nodes: [], links: []});

assert.throws(
    () => resolveTreeData([{id: '', parentId: null}], fields),
    /requires a non-empty id/,
    'blank ids should fail with a row-specific error'
);
assert.throws(
    () => resolveTreeData([{id: 'root', parentId: null}, {id: 'root', parentId: null}], fields),
    /requires unique id values/,
    'duplicate ids should be rejected'
);
assert.throws(
    () => resolveTreeData([{id: 'a', parentId: null}, {id: 'b', parentId: null}], fields),
    /requires a single root node; found 2/,
    'multiple roots should be rejected'
);
assert.throws(
    () => resolveTreeData([{id: 'root', parentId: null}, {id: 'orphan', parentId: 'missing'}], fields),
    /references missing parent "missing"/,
    'missing parent references should be rejected'
);
assert.throws(
    () => resolveTreeData([
        {id: 'root', parentId: null},
        {id: 'a', parentId: 'b'},
        {id: 'b', parentId: 'a'}
    ], fields),
    /must be acyclic; cycle detected/,
    'disconnected cycles should be rejected even when one root exists'
);

const deepRows = Array.from({length: 10_000}, (_, index) => ({
    id: `node-${index}`,
    parentId: index === 0 ? null : `node-${index - 1}`,
    name: `Node ${index}`,
    headcount: 1,
    team: 'deep'
}));
const deepTree = resolveTreeData(deepRows, fields);
assert.equal(deepTree.nodes.length, 10_000, 'deep trees should not overflow the call stack');
assert.equal(deepTree.links.length, 9_999, 'deep trees should preserve every parent-child link');

console.log('tree.test.cjs passed');
