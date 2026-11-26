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
        scene.updateMatrixWorld(true);
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

    emit(type, overrides = {}) {
        const event = {
            pointerId: 1, pointerType: 'mouse', button: 0,
            clientX: 10, clientY: 10, preventDefault() {}, ...overrides
        };
        for (const listener of this.listeners.get(type) ?? []) {
            listener(event);
        }
    }

    setPointerCapture() {}
    hasPointerCapture() { return true; }
    releasePointerCapture() {}

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
let now = 0;
global.performance = {now: () => now};
const documentEvents = new MockCanvas(0, 0);
global.document = documentEvents;
document.hidden = false;
const motionQuery = new MockCanvas(0, 0);
motionQuery.matches = false;
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
window.matchMedia = () => motionQuery;

const advanceFrame = (milliseconds) => {
    now += milliseconds;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(now));
};

const mountGlobe = (configuration = {}, data = [{lat: 30, lon: 60}]) => {
    const canvas = new MockCanvas(240, 120);
    const series = createThreeGlobeSeries({
        selector: 'animation-lifecycle', dayTexture: new THREE.Texture(),
        atmosphere: true, markers: {fields: {lat: 'lat', lon: 'lon'}}, ...configuration
    });
    series.render({data, plotSize: {width: 240, height: 120}, getWebglCanvas: () => canvas});
    return {series, canvas, renderer: renderers.at(-1)};
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

test('projection endpoints reuse one surface and marker mesh while preserving flat-map framing', async () => {
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
    const globeSurface = scene.getObjectByName('kchart-three-globe-surface');
    const flatGroup = globeGroup;
    const flatSurface = globeSurface;
    const atmosphere = scene.getObjectByName('kchart-three-globe-atmosphere');
    const markerMesh = scene.getObjectByName('kchart-three-globe-markers');
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const worldMatrix = new THREE.Matrix4();

    assert.equal(series.getProjection(), 'globe');
    assert.equal(globeGroup.visible, true);
    assert.equal(scene.getObjectByName('kchart-three-flat-map-surface'), undefined);
    assert.equal(atmosphere.parent.name, 'kchart-three-earth');
    assert.equal(globeSurface.material, flatSurface.material);
    assert.equal(flatSurface.material.uniforms.uHasNightTexture.value, 1);
    assert.equal(flatSurface.material.uniforms.uProjectionProgress.value, 0);
    assert.equal(flatSurface.geometry.parameters.width, 2);
    assert.equal(flatSurface.geometry.parameters.height, 1);
    assert.equal(flatSurface.geometry.parameters.widthSegments, 128);
    assert.ok(Number.isFinite(flatSurface.geometry.boundingSphere.radius));
    const westWrap = scene.getObjectByName('kchart-three-flat-map-wrap--1');
    const eastWrap = scene.getObjectByName('kchart-three-flat-map-wrap-1');
    assert.equal(westWrap.geometry, globeSurface.geometry);
    assert.equal(eastWrap.geometry, globeSurface.geometry);
    assert.equal(westWrap.visible, false);
    assert.equal(markerMesh.parent, globeGroup);
    assert.equal(canvas.listenerCount(), 7);

    markerMesh.getMatrixAt(0, matrix);
    position.setFromMatrixPosition(matrix);
    closeTo(position.x, Math.sqrt(3) / 4, 1e-6, 'globe marker x');
    closeTo(position.y, 0.5, 1e-6, 'globe marker y');
    closeTo(position.z, -0.75, 1e-6, 'globe marker z');
    scale.setFromMatrixScale(matrix);
    const globeMarkerScale = scale.clone();

    series.setProjection('flat', {animate: false});
    assert.equal(renderers.length, rendererCount);
    assert.equal(series.getProjection(), 'flat');
    assert.equal(globeGroup.visible, true);
    assert.equal(flatGroup.visible, true);
    assert.equal(markerMesh.parent, flatGroup);
    assert.equal(scene.getObjectByName('kchart-three-globe-markers'), markerMesh);
    assert.equal(flatGroup.getObjectByName('kchart-three-globe-atmosphere'), undefined);
    assert.equal(canvas.style.cursor, 'default');
    assert.equal(flatSurface.material.uniforms.uLightingMode.value, 0);
    assert.equal(westWrap.visible, true);
    assert.equal(westWrap.position.x, -2);
    assert.equal(eastWrap.position.x, 2);
    assert.equal(westWrap.material.uniforms.uOpacity.value, 1);
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
    assert.deepEqual(flatGroup.scale.toArray(), [1, 1, 1]);
    assert.equal(westWrap.position.x, -8);
    assert.equal(eastWrap.position.x, 8);
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
    closeTo(position.x, 1 / 3, 1e-6, 'wrapped flat marker local x');
    flatGroup.updateMatrixWorld(true);
    position.applyMatrix4(flatGroup.matrixWorld);
    closeTo(position.x, 1 / 3, 1e-6, 'wrapped flat marker screen x');

    series.setProjection('globe', {animate: false});
    assert.equal(renderers.length, rendererCount);
    assert.equal(markerMesh.parent, globeGroup);
    assert.equal(canvas.style.cursor, 'grab');
    assert.equal(flatSurface.material.uniforms.uProjectionProgress.value, 0);
    markerMesh.getMatrixAt(0, matrix);
    scale.setFromMatrixScale(matrix);
    closeTo(scale.x, globeMarkerScale.x, 1e-12, 'globe marker scale x');
    closeTo(scale.y, globeMarkerScale.y, 1e-12, 'globe marker scale y');
    closeTo(scale.z, globeMarkerScale.z, 1e-12, 'globe marker scale z');

    const resources = new Set([
        globeSurface.geometry,
        flatSurface.geometry,
        globeSurface.material,
        westWrap.material,
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

test('default axial spin updates only the group transform and keeps the camera fixed', () => {
    const {series, renderer} = mountGlobe({initialCenter: {lat: 37, lon: 170}});
    const surface = renderer.scene.getObjectByName('kchart-three-globe-surface');
    const markers = renderer.scene.getObjectByName('kchart-three-globe-markers');
    const positionVersion = surface.geometry.attributes.position.version;
    const uvVersion = surface.geometry.attributes.uv.version;
    const instanceVersion = markers.instanceMatrix.version;
    const cameraPosition = renderer.camera.position.clone();
    const before = surface.parent.quaternion.clone();
    advanceFrame(1000);
    closeTo(series.getCenter().lon, 164, 1e-9, 'time-based longitude');
    assert.equal(series.getCenter().lat, 37);
    assert.ok(before.angleTo(surface.parent.quaternion) > 0.01);
    assert.deepEqual(renderer.camera.position, cameraPosition);
    assert.equal(surface.geometry.attributes.position.version, positionVersion);
    assert.equal(surface.geometry.attributes.uv.version, uvVersion);
    assert.equal(markers.instanceMatrix.version, instanceVersion);
    series.destroy();
    assert.equal(frames.size, 0);
});

test('spin pauses for drag, lost capture, hidden documents, and reduced motion without catch-up', () => {
    const {series, canvas} = mountGlobe();
    advanceFrame(1000);
    const start = series.getCenter().lon;
    canvas.emit('pointerdown');
    advanceFrame(5000);
    assert.equal(series.getCenter().lon, start);
    assert.equal(frames.size, 0);
    canvas.emit('lostpointercapture');
    advanceFrame(1000);
    closeTo(series.getCenter().lon, start - 6, 1e-9, 'resume after capture loss');

    document.hidden = true;
    documentEvents.emit('visibilitychange');
    assert.equal(frames.size, 0);
    advanceFrame(60_000);
    const hiddenCenter = series.getCenter();
    document.hidden = false;
    documentEvents.emit('visibilitychange');
    advanceFrame(1000);
    closeTo(series.getCenter().lon, hiddenCenter.lon - 6, 1e-9, 'resume after visibility');

    motionQuery.matches = true;
    motionQuery.emit('change');
    advanceFrame(1000);
    const reducedCenter = series.getCenter();
    advanceFrame(60_000);
    assert.deepEqual(series.getCenter(), reducedCenter);
    assert.equal(frames.size, 0);
    series.setProjection('flat');
    assert.equal(series.getProjectionProgress(), 1);
    series.setProjection('globe');
    assert.equal(series.getProjectionProgress(), 0);
    motionQuery.matches = false;
    motionQuery.emit('change');
    advanceFrame(0);
    advanceFrame(1000);
    closeTo(series.getCenter().lon, reducedCenter.lon - 6, 1e-9, 'resume after reduced motion');
    series.destroy();
    assert.equal(documentEvents.listenerCount(), 0);
    assert.equal(motionQuery.listenerCount(), 0);
    assert.equal(canvas.listenerCount(), 0);
    assert.equal(frames.size, 0);
});

test('projection transitions share progress with markers, camera, atmosphere and reverse without snapping', () => {
    const {series, renderer} = mountGlobe({autoRotate: false, initialCenter: {lat: 20, lon: 40}});
    const surface = renderer.scene.getObjectByName('kchart-three-globe-surface');
    const marker = renderer.scene.getObjectByName('kchart-three-globe-markers');
    const atmosphere = renderer.scene.getObjectByName('kchart-three-globe-atmosphere');
    const geometry = surface.geometry;
    const uvVersion = geometry.attributes.uv.version;
    const globeDistance = renderer.camera.position.z;
    const center = series.getCenter();
    const matrix = new THREE.Matrix4();
    const markerPosition = () => {
        renderer.scene.updateMatrixWorld(true);
        marker.getMatrixAt(0, matrix);
        return new THREE.Vector3().setFromMatrixPosition(matrix).applyMatrix4(marker.matrixWorld);
    };
    const globeMarker = markerPosition();
    series.setProjection('flat');
    assert.equal(series.getProjection(), 'flat');
    assert.equal(series.getProjectionProgress(), 0);
    assert.equal(markerPosition().distanceTo(globeMarker), 0);
    advanceFrame(300);
    const partial = series.getProjectionProgress();
    closeTo(partial, 1 - (2 / 3) ** 3, 1e-9, 'default 900ms easing');
    assert.notEqual(renderer.camera.position.z, globeDistance);
    closeTo(atmosphere.material.uniforms.uIntensity.value, 0.72 * (1 - partial) ** 4, 1e-9, 'atmosphere fade');
    assert.equal(surface.material.uniforms.uProjectionProgress.value, partial);
    assert.equal(geometry.attributes.uv.version, uvVersion);
    const partialMarker = markerPosition();
    const positions = geometry.attributes.position.array.slice();
    series.setProjection('globe');
    assert.equal(series.getProjectionProgress(), partial);
    assert.equal(markerPosition().distanceTo(partialMarker), 0);
    assert.deepEqual(geometry.attributes.position.array, positions);
    advanceFrame(0);
    advanceFrame(100);
    assert.ok(series.getProjectionProgress() < partial);
    series.setProjection('flat', {duration: 300});
    const reversal = series.getProjectionProgress();
    advanceFrame(0);
    advanceFrame(50);
    assert.ok(series.getProjectionProgress() > reversal);
    advanceFrame(300);
    assert.equal(series.getProjectionProgress(), 1);
    assert.deepEqual(series.getCenter(), center);
    assert.equal(surface.geometry, geometry);
    assert.equal(renderer.scene.getObjectByName('kchart-three-globe-markers'), marker);
    assert.equal(atmosphere.material.uniforms.uIntensity.value, 0);
    assert.ok(geometry.attributes.position.array.every(Number.isFinite));
    assert.ok(Number.isFinite(geometry.boundingSphere.radius));
    advanceFrame(0);
    assert.equal(frames.size, 0);
    series.setProjection('globe', {animate: false});
    closeTo(markerPosition().distanceTo(globeMarker), 0, 1e-6, 'globe restored without endpoint shape change');
    closeTo(renderer.camera.position.z, globeDistance, 1e-12, 'globe framing restored');
    series.destroy();
    assert.equal(frames.size, 0);
});

test('in-flight transitions pause while hidden, finish for reduced motion, and clean up during destroy', () => {
    const {series, canvas, renderer} = mountGlobe({autoRotate: false});
    series.setProjection('flat');
    advanceFrame(200);
    const partial = series.getProjectionProgress();
    document.hidden = true;
    documentEvents.emit('visibilitychange');
    advanceFrame(60_000);
    assert.equal(series.getProjectionProgress(), partial);
    document.hidden = false;
    documentEvents.emit('visibilitychange');
    advanceFrame(100);
    assert.ok(series.getProjectionProgress() > partial && series.getProjectionProgress() < 1);
    motionQuery.matches = true;
    motionQuery.emit('change');
    assert.equal(series.getProjectionProgress(), 1);
    motionQuery.matches = false;
    motionQuery.emit('change');
    series.setProjection('globe');
    series.setCenter({lat: 20, lon: 60});
    advanceFrame(100);
    series.destroy();
    const count = renderer.renderCount;
    advanceFrame(10_000);
    assert.equal(renderer.renderCount, count);
    assert.equal(canvas.listenerCount(), 0);
    assert.equal(documentEvents.listenerCount(), 0);
    assert.equal(motionQuery.listenerCount(), 0);
    assert.equal(frames.size, 0);
});

for (const atmosphere of [true, false]) {
    for (const [width, height] of [[1280, 800], [680, 382], [669, 382], [390, 844], [844, 390]]) {
        test(`shared-size framing at ${width}x${height} with atmosphere ${atmosphere}`, () => {
            const canvas = new MockCanvas(240, 120);
            const series = createThreeGlobeSeries({
                selector: 'shared-size-framing', dayTexture: new THREE.Texture(),
                autoRotate: false, atmosphere, initialCenter: {lat: 37, lon: 126}
            });
            const context = {data: [], plotSize: {width: 240, height: 120}, getWebglCanvas: () => canvas};
            try {
                series.render(context);
                const renderer = renderers.at(-1);
                canvas.bounds.width = canvas.parentElement.clientWidth = width;
                canvas.bounds.height = canvas.parentElement.clientHeight = height;
                context.plotSize = {width, height};
                series.render(context);
                const surface = renderer.scene.getObjectByName('kchart-three-globe-surface');
                const halo = renderer.scene.getObjectByName('kchart-three-globe-atmosphere');
                assert.equal(Boolean(halo), atmosphere);
                const point = new THREE.Vector3();
                const outerHeight = () => {
                    renderer.scene.updateMatrixWorld(true);
                    let radius = 0;
                    const globePositions = surface.geometry.attributes.position;
                    for (let index = 0; index < globePositions.count; index += 1) {
                        point.fromBufferAttribute(globePositions, index).applyMatrix4(surface.matrixWorld);
                        radius = Math.max(radius, point.length());
                    }
                    if (halo) {
                        for (let ancestor = halo; ancestor; ancestor = ancestor.parent) {
                            assert.equal(ancestor.visible, true, 'outer halo is visible at globe endpoint');
                        }
                        assert.ok(halo.material.uniforms.uIntensity.value > 0);
                        radius = halo.geometry.parameters.radius * halo.getWorldScale(new THREE.Vector3()).y;
                    }
                    const distance = renderer.camera.position.length();
                    const tangent = Math.tan(THREE.MathUtils.degToRad(renderer.camera.fov) / 2);
                    // The silhouette is tangent to the sphere, not at its north/south poles.
                    return radius / Math.sqrt(distance ** 2 - radius ** 2) * height / tangent;
                };
                const globeHeight = outerHeight();
                assert.ok(Number.isFinite(globeHeight) && globeHeight > 0);

                series.setProjection('flat', {animate: false});
                assert.equal(series.getProjectionProgress(), 1);
                renderer.scene.updateMatrixWorld(true);
                renderer.camera.updateMatrixWorld(true);
                let minY = Infinity;
                let maxY = -Infinity;
                const positions = surface.geometry.attributes.position;
                for (let index = 0; index < positions.count; index += 1) {
                    point.fromBufferAttribute(positions, index).applyMatrix4(surface.matrixWorld).project(renderer.camera);
                    for (const axis of ['x', 'y', 'z']) {
                        assert.ok(Number.isFinite(point[axis]) && Math.abs(point[axis]) <= 1 + 1e-6,
                            `central full-map vertex ${index} clips on ${axis}: ${point[axis]}`);
                    }
                    minY = Math.min(minY, point.y);
                    maxY = Math.max(maxY, point.y);
                }
                const flatHeight = (maxY - minY) * height / 2;
                closeTo(flatHeight, Math.min(height, width / 2) / 1.02, 1e-4, 'full-world flat height');
                closeTo(globeHeight / flatHeight, 0.94, 0.02, 'outer globe / full-world map height');

                series.render(context);
                series.setProjection('globe', {animate: false});
                assert.equal(series.getProjectionProgress(), 0);
                closeTo(outerHeight(), globeHeight, 1e-6, 'globe height restored after flat render');
            } finally {
                series.destroy();
            }
            assert.equal(frames.size, 0);
        });
    }
}

test('intermediate surface vertices stay framed across wide and narrow viewports', () => {
    for (const [width, height] of [[960, 540], [375, 700], [1200, 360]]) {
        const canvas = new MockCanvas(width, height);
        const series = createThreeGlobeSeries({
            selector: 'surface-framing', dayTexture: new THREE.Texture(), autoRotate: false,
            initialCenter: {lat: 37, lon: 126}
        });
        const render = () => series.render({data: [], plotSize: {width, height}, getWebglCanvas: () => canvas});
        render();
        const renderer = renderers.at(-1);
        const surface = renderer.scene.getObjectByName('kchart-three-globe-surface');
        series.setProjection('flat', {duration: 1000});
        for (let frame = 0; frame < 10; frame += 1) {
            advanceFrame(100);
            renderer.camera.updateMatrixWorld(true);
            const positions = surface.geometry.attributes.position;
            for (let index = 0; index < positions.count; index += 1) {
                const point = new THREE.Vector3().fromBufferAttribute(positions, index)
                    .applyMatrix4(surface.matrixWorld).project(renderer.camera);
                assert.ok(Math.abs(point.x) <= 1 + 1e-6, `horizontal clipping at progress ${series.getProjectionProgress()}`);
                assert.ok(Math.abs(point.y) <= 1 + 1e-6, `vertical clipping at progress ${series.getProjectionProgress()}`);
                assert.ok(Math.abs(point.z) <= 1 + 1e-6, `depth clipping at progress ${series.getProjectionProgress()}`);
            }
            if (frame === 3) {
                render();
            }
        }
        assert.equal(series.getProjectionProgress(), 1);
        series.destroy();
        assert.equal(frames.size, 0);
    }
});

test('center tweens use the shortest longitude path and suspend spin until complete', () => {
    const {series, canvas} = mountGlobe({initialCenter: {lat: 10, lon: 170}});
    series.setCenter({lat: 30, lon: -170});
    advanceFrame(0);
    advanceFrame(300);
    closeTo(series.getCenter().lat, 27.5, 1e-9, '600ms center tween latitude');
    closeTo(series.getCenter().lon, -172.5, 1e-9, 'shortest path longitude');
    advanceFrame(300);
    assert.deepEqual(series.getCenter(), {lat: 30, lon: -170});
    advanceFrame(1000);
    assert.deepEqual(series.getCenter(), {lat: 30, lon: -176});
    series.setCenter({lat: 0, lon: 0});
    canvas.emit('pointerdown');
    const stoppedCenter = series.getCenter();
    advanceFrame(5000);
    assert.deepEqual(series.getCenter(), stoppedCenter);
    canvas.emit('pointercancel');
    series.setAutoRotate(false);
    advanceFrame(0);
    assert.equal(frames.size, 0);
    series.setAutoRotate({speed: -12});
    advanceFrame(1000);
    closeTo(series.getCenter().lon, stoppedCenter.lon + 12, 1e-9, 'configured reverse speed');
    series.destroy();
    assert.equal(frames.size, 0);
});

test('negative-duration same-target projection requests snap an in-flight transition', () => {
    const {series} = mountGlobe({autoRotate: false});
    try {
        for (const [mode, target] of [['flat', 1], ['globe', 0]]) {
            series.setProjection(mode);
            advanceFrame(200);
            assert.ok(series.getProjectionProgress() > 0 && series.getProjectionProgress() < 1);
            series.setProjection(mode, {duration: -1});
            assert.equal(series.getProjectionProgress(), target);
            advanceFrame(0);
            assert.equal(frames.size, 0);
            advanceFrame(5000);
            assert.equal(series.getProjectionProgress(), target);
        }
    } finally {
        series.destroy();
    }
    assert.equal(frames.size, 0);
});

for (const transitionDuration of [Infinity, NaN]) {
    test(`configured ${transitionDuration} duration falls back to a finite 600ms center tween`, () => {
        for (const options of [{}, {animate: true}]) {
            const {series, renderer} = mountGlobe({autoRotate: false, transitionDuration});
            try {
                series.setCenter({lat: 20, lon: 30}, options);
                advanceFrame(0);
                advanceFrame(300);
                closeTo(series.getCenter().lat, 17.5, 1e-9, '600ms fallback midpoint');
                advanceFrame(300);
                assert.deepEqual(series.getCenter(), {lat: 20, lon: 30});
                assert.equal(frames.size, 0);
                series.setCenter({lat: 0, lon: 0}, options);
                advanceFrame(100);
                assert.ok(frames.size > 0);
            } finally {
                series.destroy();
            }
            const renderCount = renderer.renderCount;
            assert.equal(frames.size, 0);
            advanceFrame(5000);
            assert.equal(renderer.renderCount, renderCount);
        }
    });
}
