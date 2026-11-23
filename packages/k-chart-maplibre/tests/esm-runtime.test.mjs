import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const entryPath = process.argv[2];
if (!entryPath) {
    throw new Error('Pass the ESM package entry path as the first argument.');
}

const adapter = await import(pathToFileURL(entryPath).href);
assert.equal(typeof adapter.createMapLibreFlatMap, 'function');
assert.equal(typeof adapter.createMapLibreGlobeBridge, 'function');
console.log('MapLibre ESM import passed.');
