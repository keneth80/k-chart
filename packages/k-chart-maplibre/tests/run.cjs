const {spawnSync} = require('node:child_process');
const {mkdtempSync, rmSync} = require('node:fs');
const {tmpdir} = require('node:os');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '..');
const tscBin = require.resolve('typescript/bin/tsc', {paths: [packageRoot]});
const outputDirectory = mkdtempSync(path.join(tmpdir(), 'kchart-maplibre-tests-'));

const run = (command, args) => {
    const result = spawnSync(command, args, {
        cwd: packageRoot,
        stdio: 'inherit'
    });
    if (result.status !== 0) {
        process.exitCode = result.status ?? 1;
        throw new Error(`${path.basename(command)} failed with exit code ${result.status}.`);
    }
};

try {
    run(process.execPath, [tscBin, '-p', 'tests/tsconfig.json']);
    run(process.execPath, [
        tscBin,
        '-p',
        'tsconfig.json',
        '--outDir',
        outputDirectory,
        '--declaration',
        'false',
        '--declarationMap',
        'false',
        '--sourceMap',
        'false'
    ]);
    run(process.execPath, [
        path.join(__dirname, 'runtime.test.cjs'),
        path.join(outputDirectory, 'index.js')
    ]);
} finally {
    rmSync(outputDirectory, {recursive: true, force: true});
}
