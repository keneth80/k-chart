'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const outputDirectory = path.join(root, 'ai');
const {
    kChartAICatalog,
    kChartAIPlanJsonSchema
} = require(path.join(root, 'lib', 'ai'));

const artifacts = [
    {
        path: path.join(outputDirectory, 'catalog.json'),
        content: `${JSON.stringify(kChartAICatalog, null, 2)}\n`
    },
    {
        path: path.join(outputDirectory, 'chart-plan.schema.json'),
        content: `${JSON.stringify(kChartAIPlanJsonSchema, null, 2)}\n`
    }
];

const checkOnly = process.argv.includes('--check');
const stale = [];

for (const artifact of artifacts) {
    if (checkOnly) {
        const current = fs.existsSync(artifact.path)
            ? fs.readFileSync(artifact.path, 'utf8')
            : '';
        if (current !== artifact.content) {
            stale.push(path.relative(root, artifact.path));
        }
        continue;
    }

    fs.mkdirSync(path.dirname(artifact.path), {recursive: true});
    fs.writeFileSync(artifact.path, artifact.content);
    process.stdout.write(`generated ${path.relative(root, artifact.path)}\n`);
}

if (stale.length > 0) {
    process.stderr.write(
        `AI artifacts are stale: ${stale.join(', ')}. Run npm run generate:ai.\n`
    );
    process.exitCode = 1;
}
