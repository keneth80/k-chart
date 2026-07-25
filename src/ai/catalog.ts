import type {
    KChartAICapability,
    KChartAICatalog,
    KChartAIFieldRole
} from './contracts';

const xRole = (required = true): KChartAIFieldRole => ({
    id: 'x',
    description: 'Horizontal position, category, or timestamp.',
    types: ['number', 'time', 'string'],
    required
});

const yRole = (required = true): KChartAIFieldRole => ({
    id: 'y',
    description: 'Numeric value rendered on the vertical axis.',
    types: ['number'],
    required
});

const xyRoles = (): KChartAIFieldRole[] => [xRole(), yRole()];

const baseOptions = [
    'option.legend',
    'option.tooltip',
    'option.animation',
    'option.tooltip-note',
    'option.render-complete'
];

const cartesianOptions = [
    'option.grid',
    'option.zoom',
    'option.cursor-line',
    'option.guide-line',
    'option.spec-area',
    ...baseOptions
];

const lineOptions = ['option.downsample.lttb', ...cartesianOptions];
const categoricalOptions = cartesianOptions.filter((id) => id !== 'option.zoom');
const geoOptions = ['option.tooltip', 'option.animation', 'option.render-complete'];
const optionIds = ['option.downsample.lttb', ...cartesianOptions];

const seriesSourceByFactory: Record<string, string> = {
    createLineSeries: 'src/series/svg-line.ts',
    createCanvasLineSeries: 'src/series/canvas-line.ts',
    createWebglLineSeries: 'src/series/webgl-line.ts',
    createAreaSeries: 'src/series/svg-area.ts',
    createBarSeries: 'src/series/svg-bar.ts',
    createGroupedColumnSeries: 'src/series/svg-bar.ts',
    createScatterSeries: 'src/series/svg-scatter.ts',
    createBubbleSeries: 'src/series/svg-scatter.ts',
    createCanvasPointSeries: 'src/series/canvas-point.ts',
    createWebglPointSeries: 'src/series/webgl-point.ts',
    createCanvasCandlestickSeries: 'src/series/canvas-candlestick.ts',
    createBoxPlotSeries: 'src/series/svg-distribution.ts',
    createHistogramSeries: 'src/series/svg-distribution.ts',
    createTreemapSeries: 'src/series/svg-dashboard.ts',
    createGaugeSeries: 'src/series/svg-dashboard.ts',
    createWaterfallSeries: 'src/series/svg-dashboard.ts',
    createGraphSeries: 'src/series/svg-graph.ts',
    createTreeSeries: 'src/series/svg-tree.ts',
    createSankeySeries: 'src/series/svg-sankey.ts',
    createSvgGlobeSeries: 'src/series/svg-globe.ts',
    createGeoRegionMapSeries: 'src/series/svg-region-map.ts',
    createWorldCountryMapSeries: 'src/series/svg-region-map.ts',
    createCustomSeries: 'src/series/custom.ts'
};

const presetSourceByFactory: Record<string, string> = {
    createLineChart: 'src/presets/index.ts',
    createColumnChart: 'src/presets/index.ts',
    createPieChart: 'src/presets/index.ts',
    createDoughnutChart: 'src/presets/index.ts'
};

const series = (
    capability: Omit<KChartAICapability, 'kind' | 'apiKind' | 'importPath'>
): KChartAICapability => ({
    ...capability,
    kind: 'series',
    apiKind: 'factory',
    importPath: '@keneth80/k-chart/series',
    repositoryPath: capability.repositoryPath ?? seriesSourceByFactory[capability.apiName],
    browserOnly: capability.browserOnly ?? true,
    compatibleOptions: capability.compatibleOptions ?? cartesianOptions
});

const preset = (
    capability: Omit<KChartAICapability, 'kind' | 'apiKind' | 'importPath'>
): KChartAICapability => ({
    ...capability,
    kind: 'preset',
    apiKind: 'factory',
    importPath: '@keneth80/k-chart/presets',
    repositoryPath: capability.repositoryPath ?? presetSourceByFactory[capability.apiName],
    browserOnly: capability.browserOnly ?? true,
    compatibleOptions: capability.compatibleOptions ?? cartesianOptions
});

const recipe = (
    capability: Omit<KChartAICapability, 'kind' | 'apiKind' | 'importPath'>
): KChartAICapability => ({
    ...capability,
    kind: 'recipe',
    apiKind: 'recipe',
    importPath: '@keneth80/k-chart',
    repositoryPath: capability.repositoryPath ?? seriesSourceByFactory[capability.apiName],
    browserOnly: capability.browserOnly ?? true,
    compatibleOptions: capability.compatibleOptions ?? cartesianOptions
});

const option = (
    id: string,
    displayName: string,
    description: string,
    apiName: string,
    recommendedFor: string[],
    tags: string[] = []
): KChartAICapability => ({
    id,
    kind: 'option',
    displayName,
    description,
    apiKind: apiName.startsWith('create')
        ? 'factory'
        : apiName.startsWith('KChartController.')
            ? 'controller-method'
            : 'config-property',
    apiName,
    importPath: apiName.startsWith('create')
        ? '@keneth80/k-chart/options'
        : '@keneth80/k-chart',
    renderers: ['svg', 'canvas', 'webgl'],
    fieldRoles: [],
    recommendedFor,
    tags,
    browserOnly: true,
    repositoryPath: apiName.startsWith('create')
        ? `src/options/${id.replace('option.', '').replace('tooltip-note', 'tooltip-note')}.ts`
        : 'src/core/contracts.ts'
});

const capabilities: KChartAICapability[] = [
    preset({
        id: 'preset.line',
        displayName: 'Line chart preset',
        description: 'Beginner-friendly single-series line chart with SVG, Canvas, or WebGL rendering.',
        apiName: 'createLineChart',
        renderers: ['svg', 'canvas', 'webgl'],
        fieldRoles: xyRoles(),
        recommendedFor: ['time-series trends', 'ordered numeric trends', 'quick chart creation'],
        avoidWhen: ['part-to-whole comparison', 'unordered categories with long labels'],
        rowCount: {
            idealMax: 1000000,
            note: 'Choose Canvas or WebGL and enable LTTB for large data.'
        },
        compatibleOptions: lineOptions,
        tags: ['beginner', 'trend', 'time-series']
    }),
    preset({
        id: 'preset.column',
        displayName: 'Column chart preset',
        description: 'Beginner-friendly categorical comparison chart.',
        apiName: 'createColumnChart',
        renderers: ['svg'],
        fieldRoles: xyRoles(),
        recommendedFor: ['category comparison', 'ranked values', 'small dashboards'],
        avoidWhen: ['very high-cardinality categories', 'million-point data'],
        rowCount: {idealMax: 200},
        compatibleOptions: categoricalOptions,
        tags: ['beginner', 'comparison']
    }),
    preset({
        id: 'preset.pie',
        displayName: 'Pie chart preset',
        description: 'Beginner-friendly part-to-whole chart.',
        apiName: 'createPieChart',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'label', description: 'Slice label.', types: ['string'], required: true},
            {id: 'value', description: 'Non-negative slice value.', types: ['number'], required: true}
        ],
        recommendedFor: ['part-to-whole with a few categories'],
        avoidWhen: ['more than seven categories', 'negative values', 'precise comparison'],
        rowCount: {idealMax: 7},
        compatibleOptions: baseOptions,
        tags: ['beginner', 'part-to-whole']
    }),
    preset({
        id: 'preset.doughnut',
        displayName: 'Doughnut chart preset',
        description: 'Pie chart with a configurable center opening.',
        apiName: 'createDoughnutChart',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'label', description: 'Slice label.', types: ['string'], required: true},
            {id: 'value', description: 'Non-negative slice value.', types: ['number'], required: true}
        ],
        recommendedFor: ['part-to-whole with a central KPI label'],
        avoidWhen: ['more than seven categories', 'negative values'],
        rowCount: {idealMax: 7},
        compatibleOptions: baseOptions,
        tags: ['beginner', 'part-to-whole']
    }),
    series({
        id: 'series.line.svg',
        displayName: 'SVG line',
        description: 'Crisp accessible line with optional curve, dots, animation, and LTTB.',
        apiName: 'createLineSeries',
        renderers: ['svg'],
        fieldRoles: xyRoles(),
        recommendedFor: ['small and medium trends', 'interactive SVG overlays', 'publication-quality labels'],
        avoidWhen: ['hundreds of thousands of visible points'],
        rowCount: {idealMax: 20000, supportedMax: 100000},
        compatibleOptions: lineOptions,
        tags: ['trend', 'svg', 'time-series']
    }),
    series({
        id: 'series.line.canvas',
        displayName: 'Canvas line',
        description: 'Canvas line with LTTB and optional OffscreenCanvas worker rendering.',
        apiName: 'createCanvasLineSeries',
        renderers: ['canvas'],
        fieldRoles: xyRoles(),
        recommendedFor: ['large time series', 'frequent updates', 'worker rendering'],
        rowCount: {idealMax: 300000, supportedMax: 1000000},
        compatibleOptions: lineOptions,
        tags: ['trend', 'canvas', 'large-data', 'worker']
    }),
    series({
        id: 'series.line.webgl',
        displayName: 'WebGL line',
        description: 'GPU line renderer for very large time-series datasets.',
        apiName: 'createWebglLineSeries',
        renderers: ['webgl'],
        fieldRoles: xyRoles(),
        recommendedFor: ['million-point line data', 'many dense numeric traces'],
        rowCount: {idealMax: 1000000, note: 'Use explicit axis domains and LTTB when the full density is not needed.'},
        compatibleOptions: lineOptions,
        tags: ['trend', 'webgl', 'large-data', 'gpu']
    }),
    series({
        id: 'series.area.svg',
        displayName: 'SVG area',
        description: 'Filled line chart for magnitude over an ordered domain.',
        apiName: 'createAreaSeries',
        renderers: ['svg'],
        fieldRoles: xyRoles(),
        recommendedFor: ['magnitude over time', 'capacity and volume trends'],
        avoidWhen: ['overlapping many opaque series'],
        rowCount: {idealMax: 10000},
        compatibleOptions: lineOptions,
        tags: ['trend', 'area']
    }),
    series({
        id: 'series.bar.svg',
        displayName: 'SVG bar',
        description: 'Single-value bar series with configurable baseline and bar sizing.',
        apiName: 'createBarSeries',
        renderers: ['svg'],
        fieldRoles: xyRoles(),
        recommendedFor: ['category comparison', 'positive and negative values'],
        rowCount: {idealMax: 200},
        compatibleOptions: categoricalOptions,
        tags: ['comparison', 'bar']
    }),
    series({
        id: 'series.column.grouped.svg',
        displayName: 'SVG grouped column',
        description: 'Multiple numeric fields displayed side by side for each category.',
        apiName: 'createGroupedColumnSeries',
        renderers: ['svg'],
        fieldRoles: [
            xRole(),
            {id: 'segments', description: 'Numeric fields rendered within each category.', types: ['number'], required: true, multiple: true}
        ],
        recommendedFor: ['multi-series category comparison'],
        avoidWhen: ['more than six segments per category'],
        rowCount: {idealMax: 100},
        compatibleOptions: categoricalOptions,
        tags: ['comparison', 'multi-series', 'column']
    }),
    series({
        id: 'series.scatter.svg',
        displayName: 'SVG scatter',
        description: 'Point chart for relationships between two numeric variables.',
        apiName: 'createScatterSeries',
        renderers: ['svg'],
        fieldRoles: xyRoles(),
        recommendedFor: ['correlation', 'clusters', 'outlier inspection'],
        rowCount: {idealMax: 5000},
        tags: ['distribution', 'correlation']
    }),
    series({
        id: 'series.bubble.svg',
        displayName: 'SVG bubble',
        description: 'Scatter chart with a third numeric field encoded as point radius.',
        apiName: 'createBubbleSeries',
        renderers: ['svg'],
        fieldRoles: [
            ...xyRoles(),
            {id: 'radius', description: 'Numeric magnitude encoded as radius.', types: ['number'], required: true}
        ],
        recommendedFor: ['three-variable comparison'],
        rowCount: {idealMax: 1000},
        tags: ['distribution', 'bubble']
    }),
    series({
        id: 'series.point.canvas',
        displayName: 'Canvas point',
        description: 'Canvas point renderer for medium-to-large scatter data.',
        apiName: 'createCanvasPointSeries',
        renderers: ['canvas'],
        fieldRoles: xyRoles(),
        recommendedFor: ['dense point clouds', 'frequently updated scatter data'],
        rowCount: {idealMax: 100000},
        tags: ['distribution', 'canvas']
    }),
    series({
        id: 'series.point.webgl',
        displayName: 'WebGL point',
        description: 'Interleaved-buffer GPU point renderer.',
        apiName: 'createWebglPointSeries',
        renderers: ['webgl'],
        fieldRoles: xyRoles(),
        recommendedFor: ['very large point clouds', 'GPU scatter rendering'],
        rowCount: {idealMax: 1000000},
        tags: ['distribution', 'webgl', 'large-data', 'gpu']
    }),
    series({
        id: 'series.candlestick.canvas',
        displayName: 'Canvas candlestick',
        description: 'OHLC financial chart with open-close or previous-close color modes.',
        apiName: 'createCanvasCandlestickSeries',
        renderers: ['canvas'],
        fieldRoles: [
            xRole(),
            {id: 'open', description: 'Opening price.', types: ['number'], required: true},
            {id: 'high', description: 'Highest price.', types: ['number'], required: true},
            {id: 'low', description: 'Lowest price.', types: ['number'], required: true},
            {id: 'close', description: 'Closing price.', types: ['number'], required: true},
            {id: 'previousClose', description: 'Previous close used by previous-close coloring.', types: ['number']}
        ],
        recommendedFor: ['financial OHLC data', 'stock price history'],
        rowCount: {idealMax: 10000},
        tags: ['financial', 'canvas', 'ohlc']
    }),
    series({
        id: 'series.box-plot.svg',
        displayName: 'SVG box plot',
        description: 'Five-number summary with optional outliers.',
        apiName: 'createBoxPlotSeries',
        renderers: ['svg'],
        fieldRoles: [
            xRole(),
            {id: 'min', description: 'Minimum or lower whisker.', types: ['number'], required: true},
            {id: 'q1', description: 'First quartile.', types: ['number'], required: true},
            {id: 'median', description: 'Median.', types: ['number'], required: true},
            {id: 'q3', description: 'Third quartile.', types: ['number'], required: true},
            {id: 'max', description: 'Maximum or upper whisker.', types: ['number'], required: true},
            {id: 'outliers', description: 'Optional array of outlier values.', types: ['number-array']}
        ],
        recommendedFor: ['distribution summary', 'outlier comparison'],
        rowCount: {idealMax: 100},
        compatibleOptions: categoricalOptions,
        tags: ['distribution', 'statistics']
    }),
    series({
        id: 'series.histogram.svg',
        displayName: 'SVG histogram',
        description: 'Pre-binned frequency distribution.',
        apiName: 'createHistogramSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'binStart', description: 'Bin start.', types: ['number'], required: true},
            {id: 'binEnd', description: 'Bin end.', types: ['number'], required: true},
            {id: 'value', description: 'Bin count or density.', types: ['number'], required: true}
        ],
        recommendedFor: ['numeric frequency distribution'],
        rowCount: {idealMax: 200},
        tags: ['distribution', 'statistics']
    }),
    series({
        id: 'series.treemap.svg',
        displayName: 'SVG treemap',
        description: 'Space-filling comparison of labeled values.',
        apiName: 'createTreemapSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'label', description: 'Tile label.', types: ['string'], required: true},
            {id: 'value', description: 'Tile area value.', types: ['number'], required: true},
            {id: 'color', description: 'Optional category or color value.', types: ['string', 'number']}
        ],
        recommendedFor: ['part-to-whole with many categories', 'portfolio composition'],
        rowCount: {idealMax: 500},
        compatibleOptions: baseOptions,
        tags: ['hierarchy', 'part-to-whole']
    }),
    series({
        id: 'series.gauge.svg',
        displayName: 'SVG gauge',
        description: 'Single KPI meter with a configurable range.',
        apiName: 'createGaugeSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'value', description: 'Current KPI value.', types: ['number'], required: true},
            {id: 'label', description: 'Optional KPI label.', types: ['string']}
        ],
        recommendedFor: ['single KPI against a known range'],
        avoidWhen: ['comparing many values'],
        rowCount: {idealMax: 1},
        compatibleOptions: baseOptions,
        tags: ['dashboard', 'kpi']
    }),
    series({
        id: 'series.waterfall.svg',
        displayName: 'SVG waterfall',
        description: 'Running-total bridge chart with positive, negative, and total bars.',
        apiName: 'createWaterfallSeries',
        renderers: ['svg'],
        fieldRoles: [
            xRole(),
            {id: 'value', description: 'Increment or decrement.', types: ['number'], required: true},
            {id: 'total', description: 'Boolean or numeric total marker.', types: ['boolean', 'number']}
        ],
        recommendedFor: ['variance bridges', 'financial contribution analysis'],
        rowCount: {idealMax: 50},
        compatibleOptions: categoricalOptions,
        tags: ['financial', 'comparison']
    }),
    series({
        id: 'series.graph.svg',
        displayName: 'SVG graph',
        description: 'Force or circular node-link graph with selection and roaming.',
        apiName: 'createGraphSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'source', description: 'Source node id.', types: ['string'], required: true},
            {id: 'target', description: 'Target node id.', types: ['string'], required: true},
            {id: 'value', description: 'Edge weight.', types: ['number'], required: true},
            {id: 'category', description: 'Optional node category.', types: ['string']}
        ],
        recommendedFor: ['relationships', 'dependencies', 'network topology'],
        rowCount: {idealMax: 2000},
        compatibleOptions: baseOptions,
        tags: ['network', 'relationship']
    }),
    series({
        id: 'series.tree.svg',
        displayName: 'SVG tree',
        description: 'Orthogonal or radial parent-child hierarchy with roaming.',
        apiName: 'createTreeSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'id', description: 'Node id.', types: ['string'], required: true},
            {id: 'parent', description: 'Parent node id.', types: ['string'], required: true},
            {id: 'label', description: 'Display label.', types: ['string']},
            {id: 'value', description: 'Optional node magnitude.', types: ['number']}
        ],
        recommendedFor: ['organization hierarchy', 'taxonomy', 'dependency tree'],
        rowCount: {idealMax: 2000},
        compatibleOptions: baseOptions,
        tags: ['hierarchy', 'tree']
    }),
    series({
        id: 'series.sankey.svg',
        displayName: 'SVG Sankey',
        description: 'Weighted flow between source and target stages.',
        apiName: 'createSankeySeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'source', description: 'Flow source id.', types: ['string'], required: true},
            {id: 'target', description: 'Flow target id.', types: ['string'], required: true},
            {id: 'value', description: 'Flow magnitude.', types: ['number'], required: true},
            {id: 'category', description: 'Optional node category.', types: ['string']}
        ],
        recommendedFor: ['process flow', 'energy flow', 'conversion paths'],
        rowCount: {idealMax: 1000},
        compatibleOptions: baseOptions,
        tags: ['flow', 'network']
    }),
    series({
        id: 'series.globe.svg',
        displayName: 'SVG globe',
        description: 'Draggable geographic globe with markers, zoom, and optional map drilldown.',
        apiName: 'createSvgGlobeSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'latitude', description: 'Latitude in degrees.', types: ['latitude', 'number'], required: true},
            {id: 'longitude', description: 'Longitude in degrees.', types: ['longitude', 'number'], required: true},
            {id: 'label', description: 'Marker label.', types: ['string']}
        ],
        recommendedFor: ['global locations', 'interactive geographic storytelling'],
        rowCount: {idealMax: 1000},
        compatibleOptions: geoOptions,
        tags: ['map', 'globe', 'geo']
    }),
    series({
        id: 'series.geo-region-map.svg',
        displayName: 'SVG region map',
        description: 'GeoJSON/TopoJSON choropleth with labels, markers, bubbles, and zoom.',
        apiName: 'createGeoRegionMapSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'regionKey', description: 'Data key matched to a geographic feature.', types: ['string']},
            {id: 'value', description: 'Numeric value used for labels or color.', types: ['number']},
            {id: 'color', description: 'Explicit color field.', types: ['string']}
        ],
        recommendedFor: ['regional comparison', 'choropleth maps', 'location markers'],
        rowCount: {idealMax: 5000},
        compatibleOptions: geoOptions,
        tags: ['map', 'geo', 'choropleth']
    }),
    series({
        id: 'series.world-country-map.svg',
        displayName: 'SVG world country map',
        description: 'World-country convenience wrapper backed by bundled world-atlas data.',
        apiName: 'createWorldCountryMapSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'regionKey', description: 'Country id or key.', types: ['string']},
            {id: 'value', description: 'Country value.', types: ['number']}
        ],
        recommendedFor: ['country-level global comparison'],
        rowCount: {idealMax: 300},
        compatibleOptions: geoOptions,
        tags: ['map', 'world', 'choropleth']
    }),
    series({
        id: 'series.custom',
        displayName: 'Custom functional series',
        description: 'User-defined functional renderer with injected SVG, Canvas, WebGL, scales, and lifecycle.',
        apiName: 'createCustomSeries',
        renderers: ['svg', 'canvas', 'webgl'],
        fieldRoles: [xRole(false), yRole(false)],
        recommendedFor: ['domain-specific visualization', 'hybrid rendering', 'unsupported visual marks'],
        compatibleOptions: optionIds,
        tags: ['custom', 'functional', 'extension']
    }),
    recipe({
        id: 'recipe.realtime.rolling-window',
        displayName: 'Realtime rolling window',
        description: 'A time-domain line updated in place while old points are evicted from a fixed-duration window.',
        apiName: 'createLineSeries',
        renderers: ['svg', 'canvas', 'webgl'],
        fieldRoles: xyRoles(),
        recommendedFor: ['live telemetry', 'monitoring dashboards'],
        rowCount: {idealMax: 100000, note: 'Bound retained points and reuse updateData to avoid unbounded memory growth.'},
        compatibleOptions: lineOptions,
        tags: ['recipe', 'realtime', 'time-series'],
        examplePaths: ['examples/realtime-time-series.ts']
    }),
    recipe({
        id: 'recipe.column.stacked',
        displayName: 'Stacked column recipe',
        description: 'Custom SVG recipe that stacks multiple numeric fields per category.',
        apiName: 'createCustomSeries',
        renderers: ['svg'],
        fieldRoles: [
            xRole(),
            {id: 'segments', description: 'Numeric fields stacked within each category.', types: ['number'], required: true, multiple: true}
        ],
        recommendedFor: ['part-to-whole comparison across categories'],
        compatibleOptions: categoricalOptions,
        tags: ['recipe', 'column', 'stacked']
    }),
    recipe({
        id: 'recipe.radial.custom',
        displayName: 'Custom radial recipe',
        description: 'Functional SVG radial metric composition.',
        apiName: 'createCustomSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'label', description: 'Metric label.', types: ['string']},
            {id: 'value', description: 'Metric value.', types: ['number'], required: true, multiple: true}
        ],
        recommendedFor: ['compact multi-metric dashboard summaries'],
        compatibleOptions: baseOptions,
        tags: ['recipe', 'radial']
    }),
    recipe({
        id: 'recipe.topology.custom',
        displayName: 'Topology recipe',
        description: 'Custom functional SVG node-group topology with relationship highlighting.',
        apiName: 'createCustomSeries',
        renderers: ['svg'],
        fieldRoles: [
            {id: 'source', description: 'Source node id.', types: ['string'], required: true},
            {id: 'target', description: 'Target node id.', types: ['string'], required: true}
        ],
        recommendedFor: ['infrastructure topology', 'grouped dependency maps'],
        compatibleOptions: baseOptions,
        tags: ['recipe', 'topology', 'network']
    }),
    option('option.grid', 'Grid', 'Axis-aligned plot grid.', 'KChartConfiguration.grid', ['reading values across axes']),
    option('option.legend', 'Legend', 'Selectable series legend.', 'KChartConfiguration.legend', ['multi-series identification and visibility']),
    option('option.tooltip', 'Tooltip', 'Core hover tooltip with optional formatter.', 'KChartConfiguration.tooltip', ['point inspection']),
    option('option.zoom', 'Zoom', 'Wheel, selection, and touch gesture zoom.', 'KChartConfiguration.zoom', ['dense numeric or time domains']),
    option('option.animation', 'Animation', 'Enter and update animation with reduced-motion support.', 'KChartConfiguration.animation', ['state transitions', 'realtime updates']),
    option('option.downsample.lttb', 'LTTB downsampling', 'Largest-Triangle-Three-Buckets reduction for dense lines.', 'KChartSeries.downsample', ['large line datasets'], ['performance']),
    option('option.cursor-line', 'Cursor line', 'Pointer-following guide with x and value labels.', 'createCursorLineOption', ['cross-series value comparison']),
    option('option.guide-line', 'Fixed guide lines', 'Fixed x or y reference lines with labels.', 'createGuideLineOption', ['thresholds', 'targets', 'events']),
    option('option.spec-area', 'Specification area', 'Highlighted ranges on numeric or time axes.', 'createSpecAreaOption', ['acceptable ranges', 'process stages']),
    option('option.tooltip-note', 'Pinned tooltip note', 'Draggable persistent tooltip annotations with notes.', 'createTooltipNoteOption', ['analysis notes', 'review workflows']),
    option('option.render-complete', 'Render completion', 'Promise and callback signal covering asynchronous renderer commits.', 'KChartController.whenRenderComplete', ['benchmarking', 'export after paint', 'loading state']),
    {
        id: 'adapter.three.scene',
        kind: 'adapter',
        apiKind: 'factory',
        displayName: 'Three.js adapter',
        description: 'Optional Three.js scene and wafer visualization wrapper.',
        apiName: 'createKThreeScene',
        importPath: '@keneth80/k-chart-three',
        packageName: '@keneth80/k-chart-three',
        renderers: ['webgl'],
        fieldRoles: [],
        recommendedFor: ['3D objects', 'wafer monitoring', 'custom 3D visualization'],
        tags: ['adapter', 'three', '3d'],
        repositoryPath: 'packages/k-chart-three/src/index.ts',
        browserOnly: true,
        requires: ['@keneth80/k-chart', 'three']
    },
    {
        id: 'adapter.cesium.globe',
        kind: 'adapter',
        apiKind: 'factory',
        displayName: 'Cesium globe adapter',
        description: 'Optional CesiumJS globe and route wrapper with user-supplied providers and tokens.',
        apiName: 'createCesiumGlobe',
        importPath: '@keneth80/k-chart-cesium',
        packageName: '@keneth80/k-chart-cesium',
        renderers: ['webgl'],
        fieldRoles: [
            {id: 'latitude', description: 'Route latitude.', types: ['latitude', 'number']},
            {id: 'longitude', description: 'Route longitude.', types: ['longitude', 'number']}
        ],
        recommendedFor: ['3D globe routes', 'terrain and imagery providers'],
        tags: ['adapter', 'cesium', 'geo'],
        repositoryPath: 'packages/k-chart-cesium/src/index.ts',
        browserOnly: true,
        requires: ['@cesium/engine', '@cesium/widgets', 'cesium']
    },
    {
        id: 'adapter.maplibre.flat-map',
        kind: 'adapter',
        apiKind: 'factory',
        displayName: 'MapLibre adapter',
        description: 'Optional real-map drilldown and place marker wrapper.',
        apiName: 'createMapLibreFlatMap',
        importPath: '@keneth80/k-chart-maplibre',
        packageName: '@keneth80/k-chart-maplibre',
        renderers: ['webgl'],
        fieldRoles: [
            {id: 'latitude', description: 'Place latitude.', types: ['latitude', 'number']},
            {id: 'longitude', description: 'Place longitude.', types: ['longitude', 'number']}
        ],
        recommendedFor: ['street-level maps', 'place search', 'globe-to-map drilldown'],
        tags: ['adapter', 'maplibre', 'geo'],
        repositoryPath: 'packages/k-chart-maplibre/src/index.ts',
        browserOnly: true,
        requires: ['@keneth80/k-chart', 'maplibre-gl']
    }
];

export const kChartAICatalog: KChartAICatalog = {
    version: 1,
    renderers: [
        {
            id: 'svg',
            displayName: 'SVG',
            recommendedFor: ['small and medium datasets', 'rich DOM interaction', 'crisp labels'],
            tradeoffs: ['DOM cost grows with visible marks']
        },
        {
            id: 'canvas',
            displayName: 'Canvas',
            recommendedFor: ['large datasets', 'frequent updates', 'worker rendering'],
            tradeoffs: ['marks are not individual DOM nodes']
        },
        {
            id: 'webgl',
            displayName: 'WebGL',
            recommendedFor: ['very large line or point data', 'GPU rendering'],
            tradeoffs: ['requires WebGL support', 'custom interaction needs hit testing']
        }
    ],
    capabilities
};

export const findKChartAICapability = (
    id: string
): KChartAICapability | undefined => kChartAICatalog.capabilities.find(
    (capability) => capability.id === id
);
