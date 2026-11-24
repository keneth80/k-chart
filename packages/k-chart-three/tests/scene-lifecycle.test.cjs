const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const THREE = require('three');

const renderers = [];

class FakeRenderer {
    constructor({canvas}) {
        this.canvas = canvas;
        this.pixelRatio = 1;
        this.pixelRatioCalls = [];
        this.renderCount = 0;
        this.disposeCount = 0;
        this.contextLossCount = 0;
        renderers.push(this);
    }

    setPixelRatio(pixelRatio) {
        this.pixelRatio = pixelRatio;
        this.pixelRatioCalls.push(pixelRatio);
    }

    getPixelRatio() {
        return this.pixelRatio;
    }

    setClearColor() {}

    setSize(width, height) {
        this.canvas.width = width * this.pixelRatio;
        this.canvas.height = height * this.pixelRatio;
    }

    render(scene, camera) {
        this.renderCount += 1;
        this.scene = scene;
        this.camera = camera;
    }

    dispose() {
        this.disposeCount += 1;
    }

    forceContextLoss() {
        this.contextLossCount += 1;
    }
}

class MockCanvas {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.bounds = {left: 0, top: 0, width, height};
        this.parentElement = {
            clientWidth: width,
            clientHeight: height,
            style: {}
        };
        this.classList = {add() {}};
        this.style = {
            position: '',
            pointerEvents: '',
            touchAction: '',
            cursor: '',
            setProperty() {}
        };
        this.listeners = new Map();
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        const listeners = this.listeners.get(type);
        listeners?.delete(listener);
        if (listeners?.size === 0) {
            this.listeners.delete(type);
        }
    }

    getBoundingClientRect() {
        return this.bounds;
    }

    listenerCount() {
        return [...this.listeners.values()]
            .reduce((count, listeners) => count + listeners.size, 0);
    }

    remove() {}
}

const originalRenderer = THREE.WebGLRenderer;
const originalLoad = Module._load;
THREE.WebGLRenderer = FakeRenderer;
Module._load = function load(request, parent, isMain) {
    if (request === '@keneth80/k-chart') {
        return {createCustomSeries: (configuration) => configuration};
    }
    return originalLoad.call(this, request, parent, isMain);
};
delete require.cache[require.resolve('../lib/index.js')];
const {createKThreeScene, createThreeGlobeSeries} = require('../lib/index.js');
Module._load = originalLoad;
process.once('exit', () => {
    THREE.WebGLRenderer = originalRenderer;
});

let nextFrame = 1;
const frames = new Map();
global.window = {
    devicePixelRatio: 2,
    requestAnimationFrame(callback) {
        const frame = nextFrame;
        nextFrame += 1;
        frames.set(frame, callback);
        return frame;
    },
    cancelAnimationFrame(frame) {
        frames.delete(frame);
    },
    setTimeout,
    clearTimeout
};

const closeTo = (actual, expected, tolerance, message) => {
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `${message}: expected ${expected} +/- ${tolerance}, received ${actual}`
    );
};

test('scene resize restores DPR/backing size and destroy releases the WebGL context', () => {
    const canvas = new MockCanvas(180, 90);
    const controller = createKThreeScene({
        canvas,
        width: 180,
        height: 90,
        pixelRatio: 2,
        controls: false,
        autoStart: false
    });
    const renderer = renderers.at(-1);
    const priorRenderCount = renderer.renderCount;

    canvas.width = 180;
    canvas.height = 90;
    controller.resize(180, 90);

    assert.equal(renderer.pixelRatioCalls.at(-1), 2);
    assert.equal(canvas.width, 360);
    assert.equal(canvas.height, 180);
    assert.equal(renderer.renderCount, priorRenderCount + 1);

    controller.destroy();
    assert.equal(renderer.disposeCount, 1);
    assert.equal(renderer.contextLossCount, 1);
});

test('globe redraws and restores a reset canvas on a repeated same-size chart render', () => {
    const canvas = new MockCanvas(200, 100);
    const data = [];
    const series = createThreeGlobeSeries({
        selector: 'globe-lifecycle',
        dayTexture: new THREE.Texture()
    });
    const renderContext = {
        data,
        plotSize: {width: 200, height: 100},
        getWebglCanvas: () => canvas
    };
    series.render(renderContext);
    const renderer = renderers.at(-1);
    const priorDprCalls = renderer.pixelRatioCalls.length;
    const priorRenderCount = renderer.renderCount;

    canvas.width = 200;
    canvas.height = 100;
    series.render(renderContext);

    assert.ok(renderer.pixelRatioCalls.length > priorDprCalls);
    assert.equal(canvas.width, 400);
    assert.equal(canvas.height, 200);
    assert.ok(renderer.renderCount > priorRenderCount);

    series.destroy();
    assert.equal(renderer.contextLossCount, 1);
});

test('projection switches reuse the scene and marker mesh while preserving flat-map framing', async () => {
    const canvas = new MockCanvas(240, 120);
    const data = [
        {lat: 30, lon: 60},
        {lat: 10, lon: -175}
    ];
    const series = createThreeGlobeSeries({
        selector: 'projection-lifecycle',
        dayTexture: new THREE.Texture(),
        nightTexture: new THREE.Texture(),
        atmosphere: true,
        markers: {
            fields: {lat: 'lat', lon: 'lon'},
            surfaceOffset: 0
        }
    });
    series.render({
        data,
        plotSize: {width: 240, height: 120},
        getWebglCanvas: () => canvas
    });

    const rendererCount = renderers.length;
    const renderer = renderers.at(-1);
    const scene = renderer.scene;
    const globeGroup = scene.getObjectByName('kchart-three-globe');
    const flatGroup = scene.getObjectByName('kchart-three-flat-map');
    const globeSurface = scene.getObjectByName('kchart-three-globe-surface');
    const flatSurface = scene.getObjectByName('kchart-three-flat-map-surface');
    const flatWrapWest = scene.getObjectByName('kchart-three-flat-map-wrap--1');
    const flatWrapEast = scene.getObjectByName('kchart-three-flat-map-wrap-1');
    const atmosphere = scene.getObjectByName('kchart-three-globe-atmosphere');
    const markerMesh = scene.getObjectByName('kchart-three-globe-markers');
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const worldMatrix = new THREE.Matrix4();

    assert.equal(series.getProjection(), 'globe');
    assert.equal(globeGroup.visible, true);
    assert.equal(flatGroup.visible, false);
    assert.equal(atmosphere.parent, globeGroup);
    assert.equal(globeSurface.material, flatSurface.material);
    assert.equal(flatSurface.material.uniforms.uHasNightTexture.value, 1);
    assert.equal(flatSurface.material.uniforms.uLightingMode.value, 2);
    assert.equal(flatSurface.geometry.parameters.width, 2);
    assert.equal(flatSurface.geometry.parameters.height, 1);
    assert.equal(flatWrapWest.position.x, -2);
    assert.equal(flatWrapEast.position.x, 2);
    assert.equal(flatWrapWest.geometry, flatSurface.geometry);
    assert.equal(flatWrapEast.material, flatSurface.material);
    assert.equal(markerMesh.parent, globeGroup);
    assert.equal(canvas.listenerCount(), 6);

    markerMesh.getMatrixAt(0, matrix);
    position.setFromMatrixPosition(matrix);
    closeTo(position.x, Math.sqrt(3) / 4, 1e-6, 'globe marker x');
    closeTo(position.y, 0.5, 1e-6, 'globe marker y');
    closeTo(position.z, -0.75, 1e-6, 'globe marker z');
    scale.setFromMatrixScale(matrix);
    const globeMarkerScale = scale.clone();

    series.setProjection('flat');
    assert.equal(renderers.length, rendererCount);
    assert.equal(series.getProjection(), 'flat');
    assert.equal(globeGroup.visible, false);
    assert.equal(flatGroup.visible, true);
    assert.equal(markerMesh.parent, flatGroup);
    assert.equal(scene.getObjectByName('kchart-three-globe-markers'), markerMesh);
    assert.equal(flatGroup.getObjectByName('kchart-three-globe-atmosphere'), undefined);
    assert.equal(canvas.style.cursor, 'default');
    assert.equal(flatSurface.material.uniforms.uLightingMode.value, 0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(canvas.style.cursor, 'default');

    series.setSubsolar({lat: 0, lon: 0});
    assert.equal(flatSurface.material.uniforms.uHasSubsolar.value, 1);
    const subsolarDirection = flatSurface.material.uniforms.uSubsolarDirection.value;
    closeTo(subsolarDirection.x, 1, 1e-12, 'subsolar x');
    closeTo(subsolarDirection.y, 0, 1e-12, 'subsolar y');
    closeTo(subsolarDirection.z, 0, 1e-12, 'subsolar z');

    markerMesh.getMatrixAt(0, matrix);
    position.setFromMatrixPosition(matrix);
    closeTo(position.x, 1 / 3, 1e-6, 'flat marker x');
    closeTo(position.y, 1 / 6, 1e-6, 'flat marker y');
    flatGroup.updateMatrixWorld(true);
    worldMatrix.copy(flatGroup.matrixWorld).multiply(matrix);
    scale.setFromMatrixScale(worldMatrix);
    const flatMarkerScale = scale.clone();

    series.setFlatView({center: {lat: 30, lon: 60}, zoom: 4, lighting: 'day'});
    assert.deepEqual(series.getFlatView(), {
        center: {lat: 30, lon: 60},
        zoom: 4,
        lighting: 'day'
    });
    assert.equal(flatSurface.material.uniforms.uLightingMode.value, 1);
    assert.deepEqual(flatGroup.scale.toArray(), [4, 4, 1]);
    markerMesh.getMatrixAt(0, matrix);
    flatGroup.updateMatrixWorld(true);
    position.setFromMatrixPosition(matrix).applyMatrix4(flatGroup.matrixWorld);
    closeTo(position.x, 0, 1e-6, 'centered flat marker x');
    closeTo(position.y, 0, 1e-6, 'centered flat marker y');
    worldMatrix.copy(flatGroup.matrixWorld).multiply(matrix);
    scale.setFromMatrixScale(worldMatrix);
    closeTo(scale.x, flatMarkerScale.x, 1e-12, 'flat marker world scale x');
    closeTo(scale.y, flatMarkerScale.y, 1e-12, 'flat marker world scale y');
    closeTo(scale.z, flatMarkerScale.z, 1e-12, 'flat marker world scale z');

    series.setFlatView({center: {lat: 0, lon: 170}, zoom: 4, lighting: 'dynamic'});
    assert.equal(flatSurface.material.uniforms.uLightingMode.value, 2);
    markerMesh.getMatrixAt(1, matrix);
    position.setFromMatrixPosition(matrix);
    closeTo(position.x, 185 / 180, 1e-6, 'wrapped flat marker local x');
    flatGroup.updateMatrixWorld(true);
    position.applyMatrix4(flatGroup.matrixWorld);
    closeTo(position.x, 1 / 3, 1e-6, 'wrapped flat marker screen x');

    series.setProjection('globe');
    assert.equal(renderers.length, rendererCount);
    assert.equal(markerMesh.parent, globeGroup);
    assert.equal(canvas.style.cursor, 'grab');
    assert.equal(flatSurface.material.uniforms.uLightingMode.value, 2);
    markerMesh.getMatrixAt(0, matrix);
    scale.setFromMatrixScale(matrix);
    closeTo(scale.x, globeMarkerScale.x, 1e-12, 'globe marker scale x');
    closeTo(scale.y, globeMarkerScale.y, 1e-12, 'globe marker scale y');
    closeTo(scale.z, globeMarkerScale.z, 1e-12, 'globe marker scale z');

    const resources = new Set([
        globeSurface.geometry,
        flatSurface.geometry,
        globeSurface.material,
        atmosphere.geometry,
        atmosphere.material,
        markerMesh.geometry,
        markerMesh.material
    ]);
    const disposeCounts = new Map();
    for (const resource of resources) {
        disposeCounts.set(resource, 0);
        resource.addEventListener('dispose', () => {
            disposeCounts.set(resource, disposeCounts.get(resource) + 1);
        });
    }

    series.destroy();
    assert.equal(canvas.listenerCount(), 0);
    assert.equal(renderer.contextLossCount, 1);
    for (const count of disposeCounts.values()) {
        assert.equal(count, 1);
    }
});

test('globe marker instances rebuild only for changed data and are fully disposed', () => {
    const OriginalInstancedMesh = THREE.InstancedMesh;
    const meshes = [];
    THREE.InstancedMesh = class CountingInstancedMesh extends OriginalInstancedMesh {
        constructor(...args) {
            super(...args);
            this.disposeCount = 0;
            meshes.push(this);
        }

        dispose() {
            this.disposeCount += 1;
            super.dispose();
        }
    };

    try {
        const canvas = new MockCanvas(200, 100);
        const firstData = [{lat: 0, lon: 0}];
        const series = createThreeGlobeSeries({
            selector: 'globe-markers',
            dayTexture: new THREE.Texture(),
            markers: {fields: {lat: 'lat', lon: 'lon'}}
        });
        const render = (data) => series.render({
            data,
            plotSize: {width: 200, height: 100},
            getWebglCanvas: () => canvas
        });

        render(firstData);
        assert.equal(meshes.length, 1);
        render(firstData);
        assert.equal(meshes.length, 1);

        render([{lat: 10, lon: 20}]);
        assert.equal(meshes.length, 2);
        assert.equal(meshes[0].disposeCount, 1);

        series.destroy();
        assert.equal(meshes[1].disposeCount, 1);
    } finally {
        THREE.InstancedMesh = OriginalInstancedMesh;
    }
});
