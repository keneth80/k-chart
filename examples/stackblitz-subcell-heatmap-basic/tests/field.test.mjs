import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCell,
  validateFrame,
  sampleCell,
  sampleFrame,
  frameStats,
  mixFrames,
  approximateCellKm,
  unionBounds
} from '../.test-build/model.js';
import {makeFrame, SELECTED_CELL_ID} from '../.test-build/synthetic.js';
import {colorFor, rasterPixels, geoToUV, uvToGeo} from '../.test-build/raster.js';

const constant = (value = 0) => ({
  id: 'a',
  bounds: {west: 126.5, south: 37.5, east: 127, north: 38},
  rows: 2,
  columns: 2,
  values: [value, value, value, value]
});
const frameOf = (cell) => ({
  time: '2026-01-01T00:00:00Z',
  metric: {name: 'test', unit: 'index-0-100', range: [0, 100]},
  provenance: 'synthetic',
  cells: [cell]
});
const a = makeFrame(0);
const b = makeFrame(1);

test('nine half-degree cells with 2601 values each', () => {
  assert.equal(a.cells.length, 9);
  assert.ok(a.cells.every((cell) => cell.values.length === 2601));
  validateFrame(a);
});
test('numeric 0 is a valid observation', () => assert.equal(sampleCell(constant(0), 126.75, 37.75), 0));
test('null is not converted to zero', () => assert.equal(sampleCell(constant(null), 126.75, 37.75), null));
test('bilinear interpolation of scalar values', () => assert.equal(sampleCell({...constant(), values: [0, 20, 60, 100]}, 126.75, 37.75), 45));
test('north/west sample is row zero column zero', () => assert.equal(sampleCell({...constant(), values: [10, 20, 30, 40]}, 126.5, 38), 10));
test('south/east corner orientation', () => assert.equal(sampleCell({...constant(), values: [10, 20, 30, 40]}, 127, 37.5), 40));
test('do not interpolate through missing neighbours', () => assert.equal(sampleCell({...constant(), values: [0, 100, 100, null]}, 126.75, 37.75), null));
test('known corner is not erased by zero-weight missing neighbour', () => assert.equal(sampleCell({...constant(), values: [10, null, null, null]}, 126.5, 38), 10));
test('outside-cell query has no fabricated value', () => assert.equal(sampleCell(constant(45), 130, 40), null));
test('raster zero alpha differs from null alpha', () => {
  assert.equal(colorFor(null)[3], 0);
  assert.ok(colorFor(0)[3] > 0);
});
test('low-value background can fade without changing the colour scale', () => {
  assert.equal(colorFor(null, false)[3], 0);
  assert.equal(colorFor(0, false)[3], 0);
  assert.equal(colorFor(50, false)[3], 112);
  assert.equal(colorFor(100, false)[3], 224);
});
test('invalid numbers rejected', () => {
  for (const value of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => validateCell({...constant(), values: [value, 0, 0, 0]}));
  }
});
test('dimensions and sample lengths validated', () => assert.throws(() => validateCell({...constant(), rows: 51})));
test('half-degree alignment required', () => assert.throws(() => validateCell({...constant(), bounds: {west: 126.6, south: 37.5, east: 127.1, north: 38}})));
test('antimeridian wrapping rejected explicitly', () => assert.throws(() => validateCell({...constant(), bounds: {west: 179.75, south: 0, east: -179.75, north: 0.5}})));
test('polar bounds rejected explicitly', () => assert.throws(() => validateCell({...constant(), bounds: {west: 0, south: 89.5, east: 0.5, north: 90}})));
test('duplicate ids or locations rejected', () => assert.throws(() => validateFrame({...a, cells: [a.cells[0], a.cells[0]]})));
test('mixing preserves geometry and original samples', () => {
  const before = JSON.stringify(a);
  const mixed = mixFrames(a, b, 0.5);
  assert.equal(JSON.stringify(a), before);
  assert.equal(mixed.cells[0].values[0], (a.cells[0].values[0] + b.cells[0].values[0]) / 2);
});
test('no 0 fill during missing-to-known transition', () => {
  assert.equal(mixFrames(frameOf(constant(null)), frameOf(constant(50)), 0.5).cells[0].values[0], null);
  assert.equal(mixFrames(frameOf(constant(null)), frameOf(constant(50)), 1).cells[0].values[0], 50);
});
test('mismatched geometry cannot animate', () => assert.throws(() => mixFrames(a, {...b, cells: [...b.cells].reverse()}, 0.5)));
test('shared border is sampled continuously', () => {
  const left = a.cells.find((cell) => cell.id === SELECTED_CELL_ID);
  const right = a.cells.find((cell) => cell.id === 'cell:127:37.5');
  assert.ok(Math.abs(sampleCell(left, 127, 37.7) - sampleCell(right, 127, 37.7)) < 1e-8);
});
test('independent internal hotspots exist and change', () => {
  const first = sampleFrame(a, 126.66, 37.69);
  const second = sampleFrame(a, 126.85, 37.83);
  assert.ok(first > second);
  assert.ok(sampleFrame(b, 126.66, 37.69) < sampleFrame(b, 126.85, 37.83));
});
test('Mercator coordinates round trip', () => {
  const bounds = constant().bounds;
  const point = [126.78, 37.81];
  const uv = geoToUV(bounds, ...point);
  const result = uvToGeo(bounds, ...uv);
  assert.ok(Math.abs(point[0] - result[0]) < 1e-9);
  assert.ok(Math.abs(point[1] - result[1]) < 1e-9);
});
test('raster extent and scalar colours deterministic', () => {
  const bytes = rasterPixels(frameOf(constant(50)), constant().bounds, 8, 8);
  assert.equal(bytes.length, 256);
  assert.deepEqual(Array.from(bytes.slice(0, 4)), colorFor(50));
  assert.deepEqual(bytes, rasterPixels(frameOf(constant(50)), constant().bounds, 8, 8));
});
test('raster outside cell stays transparent', () => {
  const bytes = rasterPixels(frameOf(constant(100)), {west: 125, south: 36, east: 126, north: 37}, 4, 4);
  assert.ok(bytes.every((value) => value === 0));
});
test('one scalar is not interpreted as a spatial distribution', () => assert.throws(() => validateCell({...constant(), values: [78]})));
test('km estimate around 37.75 degrees north', () => {
  const distance = approximateCellKm(constant().bounds);
  assert.ok(distance.heightKm > 55 && distance.heightKm < 56);
  assert.ok(distance.widthKm > 43 && distance.widthKm < 45);
});
test('summary count handles missing samples', () => {
  const summary = frameStats({...constant(), values: [0, 50, 100, null]});
  assert.equal(summary.count, 3);
  assert.equal(summary.sampleMean, 50);
});
test('one region bbox, not global full-grid allocation', () => assert.deepEqual(unionBounds(a.cells), {west: 126, south: 37, east: 127.5, north: 38.5}));
test('raster pixel budget enforced', () => assert.throws(() => rasterPixels(a, unionBounds(a.cells), 2048, 2048)));
test('sparse matrix is rejected rather than silently treated as valid', () => assert.throws(() => validateCell({...constant(), values: new Array(4)})));
