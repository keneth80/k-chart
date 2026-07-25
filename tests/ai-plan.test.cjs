'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');

const {
    kChartAICatalog,
    kChartAIPlanJsonSchema,
    validateKChartAIPlan
} = require('../lib/ai');
const publicApi = require('../lib');
const schemaValidator = new Ajv2020({
    allErrors: true,
    strict: false,
    strictNumbers: true
}).compile(kChartAIPlanJsonSchema);

const root = path.resolve(__dirname, '..');

assert.equal(kChartAICatalog.version, 1);
assert.ok(kChartAICatalog.capabilities.length >= 35);

const ids = kChartAICatalog.capabilities.map((capability) => capability.id);
assert.equal(new Set(ids).size, ids.length, 'AI capability ids must be unique');

for (const capability of kChartAICatalog.capabilities) {
    assert.ok(capability.apiKind, `${capability.id} must declare an API kind`);
    assert.ok(capability.apiName, `${capability.id} must declare an API name`);
    assert.ok(capability.importPath, `${capability.id} must declare an import path`);
    assert.ok(capability.repositoryPath, `${capability.id} must cite its repository source`);
    assert.ok(
        fs.existsSync(path.join(root, capability.repositoryPath)),
        `${capability.id} source does not exist: ${capability.repositoryPath}`
    );
    assert.ok(capability.recommendedFor.length > 0, `${capability.id} needs selection guidance`);
    if (
        capability.kind !== 'adapter'
        && capability.apiKind === 'factory'
    ) {
        assert.equal(
            typeof publicApi[capability.apiName],
            'function',
            `${capability.id} references a non-public apiName: ${capability.apiName}`
        );
    }
    if (capability.kind === 'adapter') {
        const packageRoot = path.join(
            root,
            capability.repositoryPath.split('/src/')[0]
        );
        const packageManifest = JSON.parse(
            fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
        );
        assert.equal(packageManifest.name, capability.packageName);
        assert.ok(packageManifest.exports['.']);
        const adapterModule = require(path.join(
            packageRoot,
            packageManifest.exports['.'].default
        ));
        assert.equal(
            typeof adapterModule[capability.apiName],
            'function',
            `${capability.id} API is not exported by its built package`
        );
        assert.deepEqual(
            [...capability.requires].sort(),
            [...Object.keys(packageManifest.peerDependencies)].sort(),
            `${capability.id} dependency metadata must match peerDependencies`
        );
    }
}

const generatedCatalog = JSON.parse(
    fs.readFileSync(path.join(root, 'ai', 'catalog.json'), 'utf8')
);
const generatedSchema = JSON.parse(
    fs.readFileSync(path.join(root, 'ai', 'chart-plan.schema.json'), 'utf8')
);
assert.deepEqual(generatedCatalog, kChartAICatalog);
assert.deepEqual(generatedSchema, kChartAIPlanJsonSchema);

const fixtureLines = fs.readFileSync(
    path.join(root, 'ai', 'examples', 'intent-to-config.jsonl'),
    'utf8'
).split(/\r?\n/).filter(Boolean);

assert.ok(fixtureLines.length >= 30, 'AI intent fixtures must cover at least 30 scenarios');

const fixtureIds = new Set();
for (const line of fixtureLines) {
    const fixture = JSON.parse(line);
    assert.ok(!fixtureIds.has(fixture.id), `duplicate fixture id: ${fixture.id}`);
    fixtureIds.add(fixture.id);
    assert.equal(typeof fixture.prompt, 'string');
    const result = validateKChartAIPlan(fixture.expected);
    assert.equal(
        result.valid,
        true,
        `${fixture.id} should be valid:\n${JSON.stringify(result.issues, null, 2)}`
    );
    assert.equal(
        schemaValidator(fixture.expected),
        true,
        `${fixture.id} should satisfy the JSON Schema:\n${JSON.stringify(schemaValidator.errors, null, 2)}`
    );
}

assert.ok(
    fixtureIds.has('cesium-route-adapter'),
    'AI fixtures must cover an adapter-only plan'
);

const unknownCapability = validateKChartAIPlan({
    version: 1,
    intent: 'unknown chart',
    data: {
        shape: 'records',
        fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
    },
    series: [{
        capability: 'series.unknown',
        renderer: 'svg',
        bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}]
    }]
});
assert.equal(unknownCapability.valid, false);
assert.ok(unknownCapability.issues.some((issue) => issue.code === 'unknown-capability'));

const missingBinding = validateKChartAIPlan({
    version: 1,
    intent: 'line without y',
    data: {
        shape: 'records',
        fields: [{name: 'x', type: 'number'}]
    },
    series: [{
        capability: 'series.line.svg',
        renderer: 'svg',
        bindings: [{role: 'x', field: 'x'}]
    }]
});
assert.equal(missingBinding.valid, false);
assert.ok(missingBinding.issues.some((issue) => issue.code === 'missing-binding'));

const fieldTypeMismatch = validateKChartAIPlan({
    version: 1,
    intent: 'numeric line bound to a label',
    data: {
        shape: 'records',
        fields: [{name: 'x', type: 'number'}, {name: 'label', type: 'string'}]
    },
    series: [{
        capability: 'series.line.svg',
        renderer: 'svg',
        bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'label'}]
    }]
});
assert.equal(fieldTypeMismatch.valid, false);
assert.ok(fieldTypeMismatch.issues.some((issue) => issue.code === 'field-type-mismatch'));

const invalidRenderer = validateKChartAIPlan({
    version: 1,
    intent: 'webgl pie',
    data: {
        shape: 'records',
        fields: [{name: 'label', type: 'string'}, {name: 'value', type: 'number'}]
    },
    series: [{
        capability: 'preset.pie',
        renderer: 'webgl',
        bindings: [{role: 'label', field: 'label'}, {role: 'value', field: 'value'}]
    }]
});
assert.equal(invalidRenderer.valid, false);
assert.ok(invalidRenderer.issues.some((issue) => issue.code === 'invalid-renderer'));

const unknownProperty = validateKChartAIPlan({
    version: 1,
    intent: 'strict plan',
    data: {
        shape: 'records',
        fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
    },
    series: [{
        capability: 'series.line.svg',
        renderer: 'svg',
        bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}]
    }],
    executableCode: 'alert(1)'
});
assert.equal(unknownProperty.valid, false);
assert.ok(unknownProperty.issues.some((issue) => issue.code === 'unknown-property'));

const unknownNestedProperty = validateKChartAIPlan({
    version: 1,
    intent: 'strict nested plan',
    data: {
        shape: 'records',
        fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
    },
    series: [{
        capability: 'series.line.svg',
        renderer: 'svg',
        bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}],
        rawCode: 'alert(1)'
    }]
});
assert.equal(unknownNestedProperty.valid, false);
assert.ok(
    unknownNestedProperty.issues.some(
        (issue) => issue.code === 'unknown-property' && issue.path.includes('rawCode')
    )
);

const invalidStructures = [
    {
        label: 'title',
        plan: {
            version: 1,
            intent: 'invalid title',
            title: 42,
            data: {
                shape: 'records',
                fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
            },
            series: [{
                capability: 'series.line.svg',
                renderer: 'svg',
                bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}]
            }]
        }
    },
    {
        label: 'theme',
        plan: {
            version: 1,
            intent: 'invalid theme',
            theme: 'metallic',
            data: {
                shape: 'records',
                fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
            },
            series: [{
                capability: 'series.line.svg',
                renderer: 'svg',
                bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}]
            }]
        }
    },
    {
        label: 'rowCount',
        plan: {
            version: 1,
            intent: 'invalid row count',
            data: {
                shape: 'records',
                rowCount: 1.5,
                fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
            },
            series: [{
                capability: 'series.line.svg',
                renderer: 'svg',
                bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}]
            }]
        }
    },
    {
        label: 'axis',
        plan: {
            version: 1,
            intent: 'invalid axis',
            data: {
                shape: 'records',
                fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
            },
            axes: [{field: 'x', type: 'number', placement: 'center'}],
            series: [{
                capability: 'series.line.svg',
                renderer: 'svg',
                bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}]
            }]
        }
    },
    {
        label: 'settings',
        plan: {
            version: 1,
            intent: 'invalid settings',
            data: {
                shape: 'records',
                fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
            },
            series: [{
                capability: 'series.line.svg',
                renderer: 'svg',
                bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}],
                settings: 'animate'
            }]
        }
    }
];

for (const fixture of invalidStructures) {
    const runtimeResult = validateKChartAIPlan(fixture.plan);
    assert.equal(runtimeResult.valid, false, `${fixture.label} must fail runtime validation`);
    assert.equal(schemaValidator(fixture.plan), false, `${fixture.label} must fail JSON Schema validation`);
}

const categoricalZoom = {
    version: 1,
    intent: 'categorical zoom should be rejected',
    data: {
        shape: 'records',
        fields: [{name: 'category', type: 'string'}, {name: 'value', type: 'number'}]
    },
    series: [{
        capability: 'series.line.svg',
        renderer: 'svg',
        bindings: [{role: 'x', field: 'category'}, {role: 'y', field: 'value'}]
    }],
    options: [{capability: 'option.zoom'}]
};
const categoricalZoomResult = validateKChartAIPlan(categoricalZoom);
assert.equal(categoricalZoomResult.valid, false);
assert.ok(
    categoricalZoomResult.issues.some((issue) => issue.code === 'incompatible-option')
);

const adapterWithCoreOption = {
    version: 1,
    intent: 'invalid adapter option',
    data: {
        shape: 'records',
        fields: []
    },
    adapters: [{
        capability: 'adapter.three.scene',
        settings: {controls: true}
    }],
    options: [{capability: 'option.zoom'}]
};
const adapterOptionResult = validateKChartAIPlan(adapterWithCoreOption);
assert.equal(adapterOptionResult.valid, false);
assert.ok(
    adapterOptionResult.issues.some((issue) => issue.code === 'incompatible-option')
);

const unsafeSettings = [
    {formatter: () => 'unsafe'},
    {constructor: {prototype: {polluted: true}}},
    {value: Number.NaN},
    {value: new Date()}
];
const circularSettings = {};
circularSettings.self = circularSettings;
unsafeSettings.push(circularSettings);

for (const settings of unsafeSettings) {
    const result = validateKChartAIPlan({
        version: 1,
        intent: 'unsafe settings',
        data: {
            shape: 'records',
            fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
        },
        series: [{
            capability: 'series.line.svg',
            renderer: 'svg',
            bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}],
            settings
        }]
    });
    assert.equal(result.valid, false, 'unsafe settings must fail runtime validation');
}

for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const plan = {
        version: 1,
        intent: 'non-finite settings number',
        data: {
            shape: 'records',
            fields: [{name: 'x', type: 'number'}, {name: 'y', type: 'number'}]
        },
        series: [{
            capability: 'series.line.svg',
            renderer: 'svg',
            bindings: [{role: 'x', field: 'x'}, {role: 'y', field: 'y'}],
            settings: {value}
        }]
    };
    assert.equal(validateKChartAIPlan(plan).valid, false);
    assert.equal(schemaValidator(plan), false);
}

console.log(`AI plan tests passed (${fixtureLines.length} intent fixtures)`);
