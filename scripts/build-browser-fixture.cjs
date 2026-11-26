const path = require('node:path');
const webpack = require('webpack');
const root = path.resolve(__dirname, '..');
webpack({
    mode: 'development', devtool: false,
    entry: path.join(root, 'tests/browser/fixture-entry.cjs'),
    output: {path: path.join(root, '.browser-fixture'), filename: 'runtime.js', library: {name: 'KChartFixture', type: 'var'}}
}, (error, stats) => {
    if (error || stats.hasErrors()) {
        console.error(error || stats.toString({all: false, errors: true}));
        process.exitCode = 1;
    }
});
