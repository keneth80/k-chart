const {mkdirSync, writeFileSync} = require('node:fs');
const path = require('node:path');

const outputDirectory = path.resolve(__dirname, '../lib/esm');
mkdirSync(outputDirectory, {recursive: true});
writeFileSync(
    path.join(outputDirectory, 'package.json'),
    `${JSON.stringify({type: 'module'}, null, 2)}\n`,
    'utf8'
);
