const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const postcss = require('postcss');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function compile(source) {
    return ts.transpileModule(source, {
        compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext},
        transformers: {before: [context => {
            const visit = node => {
                if (ts.isImportDeclaration(node)) return undefined;
                if (ts.isMetaProperty(node) && node.keywordToken === ts.SyntaxKind.ImportKeyword) {
                    return context.factory.createIdentifier('__importMeta');
                }
                return ts.visitEachChild(node, visit, context);
            };
            return node => ts.visitNode(node, visit);
        }]}
    }).outputText.replace(/export \{\};?\s*$/, '');
}

class Element {
    constructor(dataset = {}) {
        this.dataset = dataset;
        this.children = [];
        this.attributes = {};
        this.listeners = new Map();
        this.classes = new Set();
        this.classList = {
            toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)
        };
        this.clientWidth = 336;
        this.clientHeight = 380;
        this.scrolls = 0;
    }
    addEventListener(name, listener) {
        if (!this.listeners.has(name)) this.listeners.set(name, new Set());
        this.listeners.get(name).add(listener);
    }
    removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener); }
    dispatch(name, event = {}) { [...(this.listeners.get(name) || [])].forEach(fn => fn(event)); }
    setAttribute(name, value) { this.attributes[name] = value; }
    appendChild(child) { this.children.push(child); }
    scrollIntoView() { this.scrolls += 1; }
}

const demoSource = read('src/main.ts');
const parsedDemo = ts.createSourceFile('main.ts', demoSource, ts.ScriptTarget.Latest, true);
const names = new Set([
    'examples', 'renderExample', 'setupExampleSelect', 'setupExampleButtons',
    'setupSidebarExampleButtons', 'setupThemeButtons'
]);
const declarations = parsedDemo.statements.filter(statement => ts.isVariableStatement(statement)
    && statement.declarationList.declarations.some(item => names.has(item.name.getText(parsedDemo))));
assert.equal(declarations.length, names.size, 'demo test must execute the real navigation functions');
const exampleSelect = new Element();
const gallery = new Element();
const layout = new Element();
const previewTitle = new Element();
const body = new Element();
const themes = ['dark', 'light'].map(themeOption => new Element({themeOption}));
const cards = [];
const sidebars = [];
const context = vm.createContext({
    worldClusterPlaces: [],
    exampleSelect, exampleGallery: gallery, chartExampleLayout: layout, previewTitle,
    summary: new Element(), configView: new Element(), themeLabel: new Element(),
    chartRoot: new Element(), chart: null, activeKind: 'line', realtimeTimer: undefined,
    subcellHeatmapGeneration: 0, subcellHeatmapAbort: undefined, subcellHeatmapApp: undefined,
    cesiumController: undefined, mapLibreController: undefined, mapLibreBridge: undefined,
    scrollableDoughnutCompactLayout: false,
    createDemoChart: () => ({render() { return this; }, destroy() {}}),
    startExampleBehavior() {}, createUsageSnippet: kind => `usage: ${kind}`,
    document: {
        body, createElement: () => new Element(),
        querySelectorAll: selector => ({
            '.example-card': cards, '[data-sidebar-example]': sidebars, '[data-theme-option]': themes
        })[selector]
    },
    window: {matchMedia: () => ({matches: context.compact})}, compact: true
});
vm.runInContext(compile(declarations.map(node => node.getText(parsedDemo)).join('\n')
    + '\nglobalThis.api = {examples, renderExample, setupExampleSelect, setupExampleButtons, setupSidebarExampleButtons, setupThemeButtons};'), context);
const {api} = context;
api.examples.forEach(example => {
    cards.push(new Element({example: example.kind}));
    sidebars.push(new Element({sidebarExample: example.kind}));
});
api.setupExampleSelect();
api.setupExampleButtons();
api.setupSidebarExampleButtons();
api.setupThemeButtons();
assert.equal(exampleSelect.children.length, api.examples.length);
assert.equal(new Set(exampleSelect.children.map(option => option.value)).size, api.examples.length);

const html = read('src/index.html');
const declaredKinds = [...api.examples].map(example => example.kind).sort();
for (const attribute of ['data-example', 'data-sidebar-example']) {
    const kinds = [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map(match => match[1]).sort();
    assert.deepEqual(kinds, declaredKinds, `${attribute} must preserve every example`);
}
assert.match(html, /<label for="example-select">/);
assert.match(html, /<select id="example-select" aria-controls="chart-div">/);
assert.match(html, /<details class="example-gallery" id="example-gallery">\s*<summary>/,
    'catalog must start collapsed and remain keyboard accessible');

exampleSelect.value = 'column';
exampleSelect.dispatch('change');
assert.equal(context.activeKind, 'column');
assert.equal(previewTitle.textContent, api.examples.find(item => item.kind === 'column').title);
assert.equal(cards.find(item => item.dataset.example === 'column').attributes['aria-pressed'], 'true');
assert.equal(cards.find(item => item.dataset.example === 'line').attributes['aria-pressed'], 'false');
gallery.open = true;
cards.find(item => item.dataset.example === 'canvas-line').dispatch('click');
assert.equal(exampleSelect.value, 'canvas-line');
assert.equal(gallery.open, false);
assert.equal(layout.scrolls, 1, 'mobile gallery selection returns to the preview');
context.compact = false;
gallery.open = true;
sidebars.find(item => item.dataset.sidebarExample === 'line').dispatch('click');
assert.equal(exampleSelect.value, 'line', 'desktop sidebar and compact selector stay in sync');
cards.find(item => item.dataset.example === 'column').dispatch('click');
assert.equal(gallery.open, true, 'desktop gallery should not unexpectedly collapse');
assert.equal(layout.scrolls, 1);
exampleSelect.value = 'invalid';
exampleSelect.dispatch('change');
assert.equal(context.activeKind, 'column', 'unknown select values cannot render an invalid demo');
themes[1].dispatch('click');
assert(body.classes.has('theme-light'));
assert.equal(themes[1].attributes['aria-pressed'], 'true');
themes[0].dispatch('click');
assert(!body.classes.has('theme-light'));
assert.equal(themes[0].attributes['aria-pressed'], 'true');
assert(!/gestureZoom:\s*\{[^}]*minTouches:\s*1\b/.test(demoSource),
    'demo touch zoom should not capture single-finger page scrolling');

const css = postcss.parse(read('src/style.css'));
function cssValue(selector, property, media) {
    let value;
    css.walkRules(selector, rule => {
        const query = rule.parent.type === 'atrule' ? rule.parent.params : undefined;
        if (query === media) rule.walkDecls(property, declaration => { value = declaration.value; });
    });
    return value;
}
for (const token of ['--kchart-text', '--kchart-muted', '--kchart-grid', '--kchart-axis', '--kchart-background']) {
    assert(cssValue(':root', token), `${token} needs a dark default`);
    assert(cssValue('body.theme-light', token), `${token} needs a light theme value`);
    assert.notEqual(cssValue(':root', token), cssValue('body.theme-light', token));
}
assert.equal(cssValue('.example-sidebar', 'display', '(max-width: 1180px)'), 'none');
assert.equal(cssValue('.example-gallery', 'order', '(max-width: 1180px)'), '2');
assert.equal(cssValue('.preview-panel', 'grid-row', '(max-width: 1180px)'), '1');
assert.equal(cssValue('.container-chart', 'min-height', '(max-width: 720px)'), '360px');

function mountBasic(kind, width, withObserver = true) {
    const container = new Element();
    container.clientWidth = width;
    const window = new Element();
    const calls = {resizes: [], renders: 0, destroys: 0, observers: []};
    const chart = {
        render: () => { calls.renders += 1; },
        resize: size => calls.resizes.push({...size}),
        destroy: () => { calls.destroys += 1; }
    };
    class Observer {
        constructor(callback) { this.callback = callback; this.observes = 0; this.disconnects = 0; calls.observers.push(this); }
        observe(target) { assert.equal(target, container); this.observes += 1; }
        disconnect() { this.disconnects += 1; }
    }
    const sandbox = vm.createContext({
        document: {querySelector: () => container}, window,
        ResizeObserver: withObserver ? Observer : undefined,
        createKChart: options => { calls.initial = options; return chart; },
        createLineSeries: options => options, createCustomSeries: options => options,
        __importMeta: {hot: {dispose: callback => { calls.hotDispose = callback; }}}
    });
    vm.runInContext(compile(read(`examples/stackblitz-${kind}-basic/src/main.ts`)), sandbox);
    return {container, window, calls};
}

for (const kind of ['line', 'column']) {
    for (const width of [244, 336, 980]) {
        const {container, window, calls} = mountBasic(kind, width);
        assert.equal(calls.initial.width, width, `${kind} initial width comes from its chart container`);
        assert.equal(calls.initial.height, container.clientHeight);
        assert.equal(calls.renders, 1);
        assert.equal(calls.observers.length, 1);
        const observer = calls.observers[0];
        observer.callback();
        assert.equal(calls.resizes.length, 0, 'initial observer notification must not duplicate rendering');
        container.clientWidth = width - 20;
        container.clientHeight = 420;
        observer.callback();
        assert.deepEqual(calls.resizes, [{width: width - 20, height: 420}]);
        observer.callback();
        assert.equal(calls.resizes.length, 1, 'unchanged dimensions must not trigger resize loops');
        window.dispatch('pagehide', {persisted: true});
        assert.equal(observer.disconnects, 1);
        assert.equal(calls.destroys, 0, 'bfcache entry preserves chart state');
        container.clientWidth = width;
        window.dispatch('pageshow', {persisted: true});
        assert.equal(observer.observes, 2);
        assert.equal(calls.resizes.at(-1).width, width);
        window.dispatch('pagehide', {persisted: false});
        assert.equal(observer.disconnects, 2);
        assert.equal(calls.destroys, 1);
        assert([...window.listeners.values()].every(listeners => listeners.size === 0));
        const resizeCount = calls.resizes.length;
        container.clientWidth = 500;
        observer.callback();
        calls.hotDispose();
        assert.equal(calls.resizes.length, resizeCount, 'stale observer callbacks cannot resize a destroyed chart');
        assert.equal(calls.destroys, 1, 'disposal is idempotent');
    }
    const fallback = mountBasic(kind, 300, false);
    fallback.container.clientWidth = 260;
    fallback.window.dispatch('resize');
    assert.equal(fallback.calls.resizes[0].width, 260);
    fallback.calls.hotDispose();
    assert.equal(fallback.calls.destroys, 1);
    assert([...fallback.window.listeners.values()].every(listeners => listeners.size === 0));
    const hot = mountBasic(kind, 300);
    hot.calls.hotDispose();
    assert.equal(hot.calls.observers[0].disconnects, 1);
    assert.equal(hot.calls.destroys, 1);
}

console.log('demo-usability.test.cjs passed (navigation, themes, responsive layout, standalone resize lifecycle)');
