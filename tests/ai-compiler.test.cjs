'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
    KChartAICompileError,
    compileKChartAIPlan,
    validateKChartAIPlan
} = require('../lib/ai');

const root = path.resolve(__dirname, '..');

const linePlan = {
    version: 1,
    intent: 'safe line configuration',
    title: 'Revenue',
    data: {
        shape: 'records',
        fields: [
            {name: 'time', type: 'time'},
            {name: 'value', type: 'number'}
        ]
    },
    axes: [
        {
            field: 'time',
            type: 'time',
            placement: 'bottom',
            min: '2026-01-01T00:00:00.000Z',
            max: '2026-01-02T00:00:00.000Z'
        },
        {field: 'value', type: 'number', placement: 'left'}
    ],
    series: [{
        capability: 'series.line.canvas',
        renderer: 'canvas',
        bindings: [
            {role: 'x', field: 'time'},
            {role: 'y', field: 'value'}
        ],
        settings: {
            selector: 'model-must-not-control-this',
            lineWidth: 3,
            asyncRender: {enabled: true}
        }
    }],
    options: [
        {capability: 'option.grid', settings: {x: true, y: false}},
        {capability: 'option.tooltip'},
        {capability: 'option.zoom', settings: {direction: 'x'}},
        {capability: 'option.render-complete'}
    ],
    theme: 'dark'
};

const lineData = [
    {time: new Date('2026-01-01T00:00:00.000Z'), value: 10},
    {time: new Date('2026-01-01T01:00:00.000Z'), value: 12}
];
const line = compileKChartAIPlan(linePlan, {
    selector: '#chart',
    data: lineData,
    configuration: {
        width: 900,
        title: {text: 'Trusted title', align: 'center'}
    }
});

assert.ok(line.configuration);
assert.equal(line.configuration.selector, '#chart');
assert.equal(line.configuration.data, lineData);
assert.equal(line.configuration.series.length, 1);
assert.notEqual(
    line.configuration.series[0].selector,
    'model-must-not-control-this',
    'model settings must not override the generated selector'
);
assert.equal(line.configuration.series[0].selector, 'kchart-ai-series-line-canvas-1');
assert.equal(line.configuration.width, 900);
assert.deepEqual(line.configuration.title, {text: 'Trusted title', align: 'center'});
assert.equal(line.configuration.className, 'kchart-theme-dark');
assert.ok(line.configuration.axes[0].min instanceof Date);
assert.ok(line.configuration.axes[0].max instanceof Date);
assert.deepEqual(line.configuration.grid, {visible: true, x: true, y: false});
assert.deepEqual(line.configuration.tooltip, {visible: true});
assert.equal(line.configuration.zoom.enabled, true);
assert.equal(line.configuration.zoom.direction, 'x');
assert.ok(line.warnings.some((warning) => warning.includes('whenRenderComplete')));

const grouped = compileKChartAIPlan({
    version: 1,
    intent: 'grouped columns',
    data: {
        shape: 'records',
        fields: [
            {name: 'quarter', type: 'string'},
            {name: 'web', type: 'number'},
            {name: 'app', type: 'number'}
        ]
    },
    series: [{
        capability: 'series.column.grouped.svg',
        renderer: 'svg',
        bindings: [
            {role: 'x', field: 'quarter'},
            {role: 'segments', fields: ['web', 'app']}
        ]
    }]
}, {
    selector: '#grouped',
    data: [{quarter: 'Q1', web: 10, app: 14}]
});

assert.equal(grouped.configuration.axes[0].field, 'quarter');
assert.equal(grouped.configuration.axes[0].type, 'point');
assert.deepEqual(grouped.configuration.axes[1].domainFields, ['web', 'app']);

const candlestick = compileKChartAIPlan({
    version: 1,
    intent: 'candlestick domains',
    data: {
        shape: 'records',
        fields: [
            {name: 'date', type: 'time'},
            {name: 'open', type: 'number'},
            {name: 'high', type: 'number'},
            {name: 'low', type: 'number'},
            {name: 'close', type: 'number'}
        ]
    },
    series: [{
        capability: 'series.candlestick.canvas',
        renderer: 'canvas',
        bindings: [
            {role: 'x', field: 'date'},
            {role: 'open', field: 'open'},
            {role: 'high', field: 'high'},
            {role: 'low', field: 'low'},
            {role: 'close', field: 'close'}
        ]
    }]
}, {
    selector: '#candlestick',
    data: [{date: new Date(), open: 10, high: 13, low: 8, close: 12}]
});

assert.deepEqual(
    candlestick.configuration.axes[1].domainFields,
    ['open', 'high', 'low', 'close']
);

const pie = compileKChartAIPlan({
    version: 1,
    intent: 'pie',
    data: {
        shape: 'records',
        fields: [
            {name: 'label', type: 'string'},
            {name: 'value', type: 'number'}
        ]
    },
    series: [{
        capability: 'preset.pie',
        renderer: 'svg',
        bindings: [
            {role: 'label', field: 'label'},
            {role: 'value', field: 'value'}
        ]
    }]
}, {
    selector: '#pie',
    data: [{label: 'A', value: 10}]
});

assert.deepEqual(pie.configuration.axes, []);
assert.equal(pie.configuration.series.length, 1);

const waterfall = compileKChartAIPlan({
    version: 1,
    intent: 'waterfall',
    data: {
        shape: 'records',
        fields: [
            {name: 'label', type: 'string'},
            {name: 'delta', type: 'number'},
            {name: 'total', type: 'boolean'}
        ]
    },
    series: [{
        capability: 'series.waterfall.svg',
        renderer: 'svg',
        bindings: [
            {role: 'x', field: 'label'},
            {role: 'value', field: 'delta'},
            {role: 'total', field: 'total'}
        ]
    }]
}, {
    selector: '#waterfall',
    data: [
        {label: 'Start', delta: 10, total: true},
        {label: 'Gain', delta: 5, total: false},
        {label: 'Loss', delta: -20, total: false}
    ]
});

assert.equal(waterfall.configuration.axes[1].min, -5);
assert.equal(waterfall.configuration.axes[1].max, 15);

const customPlan = {
    version: 1,
    intent: 'custom circles',
    data: {
        shape: 'records',
        fields: [
            {name: 'x', type: 'number'},
            {name: 'y', type: 'number'}
        ]
    },
    series: [{
        capability: 'series.custom',
        renderer: 'svg',
        bindings: [
            {role: 'x', field: 'x'},
            {role: 'y', field: 'y'}
        ]
    }]
};

assert.throws(
    () => compileKChartAIPlan(customPlan, {
        selector: '#custom',
        data: [{x: 1, y: 2}]
    }),
    (error) =>
        error instanceof KChartAICompileError
        && error.code === 'unsupported-capability'
);

const custom = compileKChartAIPlan(customPlan, {
    selector: '#custom',
    data: [{x: 1, y: 2}],
    seriesCompilers: {
        'series.custom': ({selector}) => ({
            selector,
            xField: 'x',
            yField: 'y',
            render() {}
        })
    }
});
assert.equal(custom.configuration.series[0].selector, 'kchart-ai-series-custom-1');

const regionPlan = {
    version: 1,
    intent: 'region map',
    data: {
        shape: 'records',
        fields: [
            {name: 'region', type: 'string'},
            {name: 'value', type: 'number'}
        ]
    },
    series: [{
        capability: 'series.geo-region-map.svg',
        renderer: 'svg',
        bindings: [
            {role: 'regionKey', field: 'region'},
            {role: 'value', field: 'value'}
        ]
    }]
};

assert.throws(
    () => compileKChartAIPlan(regionPlan, {
        selector: '#region',
        data: [{region: 'Seoul', value: 10}]
    }),
    (error) =>
        error instanceof KChartAICompileError
        && error.code === 'missing-runtime-setting'
);
assert.ok(compileKChartAIPlan(regionPlan, {
    selector: '#region',
    data: [{region: 'Seoul', value: 10}],
    trustedSeriesSettings: {
        'series.geo-region-map.svg': {
            geoJson: {type: 'FeatureCollection', features: []}
        }
    }
}).configuration);

const adapter = compileKChartAIPlan({
    version: 1,
    intent: 'Cesium route',
    data: {
        shape: 'records',
        fields: [
            {name: 'lat', type: 'latitude'},
            {name: 'lon', type: 'longitude'}
        ]
    },
    adapters: [{
        capability: 'adapter.cesium.globe',
        bindings: [
            {role: 'latitude', field: 'lat'},
            {role: 'longitude', field: 'lon'}
        ],
        settings: {
            route: true,
            ionAccessToken: 'model-secret-must-be-removed',
            nested: {
                apiKey: 'nested-secret-must-be-removed',
                label: 'safe'
            }
        }
    }]
}, {
    selector: '#adapter',
    data: [{lat: 37.5, lon: 127}],
    trustedAdapterSettings: {
        'adapter.cesium.globe': {
            ionAccessToken: 'application-owned-token'
        }
    }
});

assert.equal(adapter.configuration, undefined);
assert.equal(adapter.adapters.length, 1);
assert.equal(adapter.adapters[0].data[0].lat, 37.5);
assert.equal(adapter.adapters[0].settings.ionAccessToken, undefined);
assert.equal(adapter.adapters[0].settings.nested.apiKey, undefined);
assert.equal(adapter.adapters[0].settings.nested.label, 'safe');
assert.equal(
    adapter.adapters[0].trustedSettings.ionAccessToken,
    'application-owned-token'
);
assert.ok(adapter.warnings.some((warning) => warning.includes('ionAccessToken')));
assert.ok(adapter.warnings.some((warning) => warning.includes('nested.apiKey')));

const partialAxes = compileKChartAIPlan({
    version: 1,
    intent: 'explicit x axis with inferred multi-field y domain',
    data: {
        shape: 'records',
        fields: [
            {name: 'time', type: 'time'},
            {name: 'temperature', type: 'number'},
            {name: 'pressure', type: 'number'}
        ]
    },
    axes: [{
        field: 'time',
        type: 'time',
        placement: 'bottom'
    }],
    series: [
        {
            capability: 'series.line.svg',
            renderer: 'svg',
            bindings: [
                {role: 'x', field: 'time'},
                {role: 'y', field: 'temperature'}
            ]
        },
        {
            capability: 'series.line.svg',
            renderer: 'svg',
            bindings: [
                {role: 'x', field: 'time'},
                {role: 'y', field: 'pressure'}
            ]
        }
    ]
}, {
    selector: '#partial-axes',
    data: [{
        time: new Date('2026-01-01T00:00:00Z'),
        temperature: 10,
        pressure: 1000
    }]
});

assert.equal(partialAxes.configuration.axes.length, 2);
assert.deepEqual(
    partialAxes.configuration.axes.find((axis) => axis.placement === 'left').domainFields,
    ['temperature', 'pressure']
);

const invalidAxisPlan = {
    version: 1,
    intent: 'invalid explicit axis',
    data: {
        shape: 'records',
        fields: [
            {name: 'category', type: 'string'},
            {name: 'value', type: 'number'}
        ]
    },
    axes: [
        {
            field: 'category',
            type: 'number',
            placement: 'bottom',
            min: 'not-a-number'
        },
        {
            field: 'value',
            type: 'number',
            placement: 'left'
        }
    ],
    series: [{
        capability: 'series.line.svg',
        renderer: 'svg',
        bindings: [
            {role: 'x', field: 'category'},
            {role: 'y', field: 'value'}
        ],
        settings: {strokeWidth: 'wide'}
    }],
    options: [{
        capability: 'option.zoom',
        settings: {scaleExtent: 'invalid'}
    }]
};
const invalidAxisResult = validateKChartAIPlan(invalidAxisPlan);
assert.equal(invalidAxisResult.valid, false);
assert.ok(invalidAxisResult.issues.some((issue) =>
    issue.path === '$.axes[0].type' && issue.code === 'field-type-mismatch'
));
assert.ok(invalidAxisResult.issues.some((issue) =>
    issue.path === '$.axes[0].min'
));
assert.ok(invalidAxisResult.issues.some((issue) =>
    issue.path.endsWith('.strokeWidth')
));
assert.ok(invalidAxisResult.issues.some((issue) =>
    issue.path.endsWith('.scaleExtent')
));

const fixtureLines = fs.readFileSync(
    path.join(root, 'ai', 'examples', 'intent-to-config.jsonl'),
    'utf8'
).split(/\r?\n/).filter(Boolean);

const valueForType = (type, index) => {
    switch (type) {
        case 'time':
            return new Date(Date.UTC(2026, 0, 1, index));
        case 'string':
            return `value-${index}`;
        case 'boolean':
            return false;
        case 'number-array':
            return [index, index + 1];
        case 'latitude':
            return 37.5 + index * 0.01;
        case 'longitude':
            return 127 + index * 0.01;
        case 'geojson':
            return {type: 'FeatureCollection', features: []};
        case 'url':
            return 'https://example.com';
        default:
            return index + 1;
    }
};

const registryCapabilities = [
    'series.custom',
    'recipe.realtime.rolling-window',
    'recipe.column.stacked',
    'recipe.radial.custom',
    'recipe.topology.custom'
];
const fixtureCompilers = Object.fromEntries(
    registryCapabilities.map((capability) => [
        capability,
        ({selector, bindings}) => ({
            selector,
            xField: typeof bindings.x === 'string' ? bindings.x : undefined,
            yField: typeof bindings.y === 'string' ? bindings.y : undefined,
            render() {}
        })
    ])
);

for (const lineText of fixtureLines) {
    const fixture = JSON.parse(lineText);
    const rows = [0, 1].map((index) => Object.fromEntries(
        fixture.expected.data.fields.map((field) => [
            field.name,
            valueForType(field.type, index)
        ])
    ));
    const trustedSeriesSettings = fixture.expected.series?.some(
        (series) => series.capability === 'series.geo-region-map.svg'
    ) ? {
        'series.geo-region-map.svg': {
            geoJson: {type: 'FeatureCollection', features: []}
        }
    } : undefined;
    const result = compileKChartAIPlan(fixture.expected, {
        selector: `#fixture-${fixture.id}`,
        data: rows,
        trustedSeriesSettings,
        seriesCompilers: fixtureCompilers
    });
    if (fixture.expected.series?.length) {
        assert.ok(result.configuration, `${fixture.id} should compile a chart configuration`);
        assert.ok(result.configuration.series.length > 0);
    } else {
        assert.equal(result.configuration, undefined);
        assert.ok(result.adapters.length > 0);
    }
}

console.log('AI compiler tests passed.');
