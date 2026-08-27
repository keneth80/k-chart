const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const entryPath = process.argv[2];
if (!entryPath) {
    throw new Error('Pass the compiled package entry path as the first argument.');
}

class FakeElement {
    constructor() {
        this.children = [];
        this.style = {};
        this.hidden = false;
        this.textContent = '';
        this.listeners = new Map();
    }

    append(...children) {
        this.children.push(...children);
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    setAttribute(name, value) {
        this[name] = value;
    }

    addEventListener(type, listener) {
        this.listeners.set(type, listener);
    }

    remove() {
        this.removed = true;
    }
}

const hosts = new Map();
global.document = {
    createElement: () => new FakeElement(),
    querySelector: (selector) => hosts.get(selector)
};

class FakeGeoJSONSource {
    constructor(options) {
        this.options = options;
        this.data = options.data;
    }

    setData(data) {
        this.data = data;
    }

    async getClusterExpansionZoom() {
        if (this.expansionPromise) {
            return this.expansionPromise;
        }
        return 7;
    }
}

class FakeMap {
    static instances = [];

    constructor(options) {
        this.options = options;
        this.canvas = {style: {}};
        this.handlers = new Map();
        this.layers = [];
        this.sources = new Map();
        FakeMap.instances.push(this);
    }

    addControl() {}

    once(type, listener) {
        if (type === 'load') listener();
    }

    addSource(id, options) {
        this.sources.set(id, new FakeGeoJSONSource(options));
    }

    getSource(id) {
        return this.sources.get(id);
    }

    addLayer(layer) {
        this.layers.push(layer);
    }

    getLayer(id) {
        return this.layers.find((layer) => layer.id === id);
    }

    on(type, layerId, listener) {
        this.handlers.set(`${type}:${layerId}`, listener);
    }

    queryRenderedFeatures() {
        return this.queriedFeatures ?? [];
    }

    getCanvas() {
        return this.canvas;
    }

    jumpTo(options) {
        this.lastJump = options;
    }

    easeTo(options) {
        this.lastEase = options;
    }

    flyTo(options) {
        this.lastFly = options;
    }

    resize() {
        this.resizeCount = (this.resizeCount ?? 0) + 1;
    }

    loaded() {
        return true;
    }

    remove() {
        this.removed = true;
    }
}

class FakePopup {
    static instances = [];

    constructor() {
        FakePopup.instances.push(this);
    }

    setLngLat(coordinates) {
        this.coordinates = coordinates;
        return this;
    }

    setDOMContent(content) {
        this.content = content;
        return this;
    }

    addTo(map) {
        this.map = map;
        return this;
    }
}

const fakeMapLibre = {
    Map: FakeMap,
    NavigationControl: class {},
    Popup: FakePopup
};
const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
    if (request === 'maplibre-gl') {
        return {__esModule: true, default: fakeMapLibre};
    }
    return originalLoad.call(this, request, parent, isMain);
};

const {createMapLibreFlatMap} = require(path.resolve(entryPath));
Module._load = originalLoad;

const CLUSTER_LAYER_ID = 'kchart-maplibre-place-clusters';
const CLUSTER_COUNT_LAYER_ID = 'kchart-maplibre-place-cluster-count';
const PLACE_LAYER_ID = 'kchart-maplibre-places';

const defaultHost = new FakeElement();
hosts.set('#default-map', defaultHost);
const defaultController = createMapLibreFlatMap({
    container: '#default-map',
    style: {version: 8, sources: {}, layers: []}
});

(async () => {
    await defaultController.show({lat: 0, lon: 0});
    const defaultMap = FakeMap.instances[0];
    assert.equal(Object.hasOwn(defaultMap.options, 'renderWorldCopies'), false);
    assert.equal(Object.hasOwn(defaultMap.options, 'maxBounds'), false);
    const defaultToolbar = defaultHost.children[0].children[1];
    assert.equal(defaultToolbar.hidden, false);
    assert.equal(defaultToolbar.children[0].hidden, false);
    assert.equal(defaultToolbar.children[1].hidden, false);
    assert.deepEqual(defaultMap.getLayer(CLUSTER_LAYER_ID).paint['circle-radius'], [
        'step', ['get', 'point_count'], 18, 20, 24, 60, 30
    ]);

    const host = new FakeElement();
    hosts.set('#world-map', host);
    let clusterClickContext;
    const hoverContexts = [];
    let clickedPlace;
    const controller = createMapLibreFlatMap({
        container: '#world-map',
        style: {version: 8, sources: {}, layers: []},
        renderWorldCopies: false,
        maxBounds: [[-180, -85], [180, 85]],
        toolbar: {visible: false},
        clusterStyle: {
            color: '#111111',
            radius: 14,
            steps: [
                {minPointCount: 50, color: '#333333', radius: 28},
                {minPointCount: 10, color: '#222222', radius: 20},
                {minPointCount: 50, color: '#444444'}
            ],
            strokeColor: '#eeeeee',
            strokeWidth: 3,
            textColor: '#ffffff',
            textSize: 15
        },
        onClusterClick: (context) => {
            clusterClickContext = context;
        },
        onClusterHover: (context) => hoverContexts.push(context),
        onPlaceClick: ({place}) => {
            clickedPlace = place;
        }
    });
    const place = {id: 'seoul', name: 'Seoul', lat: 37.5, lon: 127};
    await controller.show({lat: 20, lon: 0, zoom: 1.5, places: [place]});

    const map = FakeMap.instances[1];
    assert.equal(map.options.renderWorldCopies, false);
    assert.deepEqual(map.options.maxBounds, [[-180, -85], [180, 85]]);
    assert.equal(host.children[0].children[1].hidden, true);

    const clusterLayer = map.getLayer(CLUSTER_LAYER_ID);
    assert.deepEqual(clusterLayer.paint['circle-color'], [
        'step', ['get', 'point_count'], '#111111', 10, '#222222', 50, '#444444'
    ]);
    assert.deepEqual(clusterLayer.paint['circle-radius'], [
        'step', ['get', 'point_count'], 14, 10, 20, 50, 28
    ]);
    assert.equal(clusterLayer.paint['circle-stroke-color'], '#eeeeee');
    assert.equal(clusterLayer.paint['circle-stroke-width'], 3);
    assert.equal(map.getLayer(CLUSTER_COUNT_LAYER_ID).layout['text-size'], 15);
    assert.equal(map.getLayer(CLUSTER_COUNT_LAYER_ID).paint['text-color'], '#ffffff');

    const clusterFeature = {
        type: 'Feature',
        geometry: {type: 'Point', coordinates: [12, 34]},
        properties: {cluster_id: 9, point_count: 75}
    };
    const clusterEvent = {point: {x: 1, y: 1}, features: [clusterFeature]};
    await map.handlers.get(`click:${CLUSTER_LAYER_ID}`)(clusterEvent);
    assert.deepEqual(map.lastEase, {center: [12, 34], zoom: 7});
    assert.equal(clusterClickContext.clusterId, 9);
    assert.equal(clusterClickContext.pointCount, 75);
    assert.equal(clusterClickContext.expansionZoom, 7);
    assert.equal(clusterClickContext.map, map);

    map.handlers.get(`mouseenter:${CLUSTER_LAYER_ID}`)(clusterEvent);
    const nextClusterFeature = {
        type: 'Feature',
        geometry: {type: 'Point', coordinates: [56, 78]},
        properties: {cluster_id: 10, point_count: 30}
    };
    map.handlers.get(`mousemove:${CLUSTER_LAYER_ID}`)({
        point: {x: 2, y: 2},
        features: [nextClusterFeature]
    });
    map.handlers.get(`mouseleave:${CLUSTER_LAYER_ID}`)({point: {x: 2, y: 2}});
    assert.deepEqual(hoverContexts.map(({clusterId, type, hovered}) => ({
        clusterId,
        type,
        hovered
    })), [
        {clusterId: 9, type: 'enter', hovered: true},
        {clusterId: 9, type: 'leave', hovered: false},
        {clusterId: 10, type: 'enter', hovered: true},
        {clusterId: 10, type: 'leave', hovered: false}
    ]);
    assert.equal(map.canvas.style.cursor, '');

    const source = map.getSource('kchart-maplibre-places');
    let resolveExpansion;
    source.expansionPromise = new Promise((resolve) => {
        resolveExpansion = resolve;
    });
    map.lastEase = undefined;
    clusterClickContext = undefined;
    const delayedClick = map.handlers.get(`click:${CLUSTER_LAYER_ID}`)(clusterEvent);
    controller.hide();
    resolveExpansion(9);
    await delayedClick;
    assert.equal(map.lastEase, undefined);
    assert.equal(clusterClickContext, undefined);

    await controller.show({lat: 20, lon: 0, zoom: 1.5});
    source.expansionPromise = Promise.reject(new Error('stale cluster'));
    await assert.doesNotReject(
        map.handlers.get(`click:${CLUSTER_LAYER_ID}`)(clusterEvent)
    );
    assert.equal(map.lastEase, undefined);
    assert.equal(clusterClickContext, undefined);
    source.expansionPromise = undefined;

    map.handlers.get(`click:${PLACE_LAYER_ID}`)({
        features: [{properties: {id: place.id}}]
    });
    assert.equal(clickedPlace, place);
    assert.deepEqual(FakePopup.instances[0].coordinates, [place.lon, place.lat]);
    assert.equal(FakePopup.instances[0].map, map);

    console.log('MapLibre configuration runtime tests passed.');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
