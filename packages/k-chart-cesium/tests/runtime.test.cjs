const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');

const entryPath = process.argv[2];
if (!entryPath) {
    throw new Error('Pass the compiled package entry path as the first argument.');
}

class FakeEvent {
    constructor() {
        this.listeners = new Set();
    }

    addEventListener(listener) {
        this.listeners.add(listener);
    }

    removeEventListener(listener) {
        this.listeners.delete(listener);
    }

    raiseEvent() {
        for (const listener of this.listeners) listener();
    }
}

class FakeElement {
    constructor() {
        this.children = [];
        this.style = {};
        this.listeners = new Map();
    }

    appendChild(child) {
        this.children.push(child);
        child.parentElement = this;
        return child;
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    dispatchEvent(event) {
        for (const listener of this.listeners.get(event.type) ?? []) listener(event);
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

class Cartesian2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Cartesian3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    static fromDegrees(lon, lat, height = 0) {
        return new Cartesian3(lon, lat, height);
    }
}

class Cartographic {
    static fromCartesian(value) {
        return value.cartographic;
    }
}

class Color {
    static fromCssColorString() {
        return new Color();
    }

    static fromBytes() {
        return new Color();
    }
}
Color.WHITE = new Color();

class Credit {}
class ImageryLayer {}
class Entity {}
class ColorMaterialProperty {}
class PathGraphics {}
class PolylineGlowMaterialProperty {}
class SampledPositionProperty {}
class TimeInterval {}
class TimeIntervalCollection {}
class VelocityOrientationProperty {}

class JulianDate {
    static fromDate() {
        return new JulianDate();
    }

    static addSeconds() {
        return new JulianDate();
    }

    clone() {
        return new JulianDate();
    }
}

class ScreenSpaceEventHandler {
    static instances = [];

    constructor() {
        ScreenSpaceEventHandler.instances.push(this);
    }

    setInputAction(listener) {
        this.listener = listener;
    }

    destroy() {
        this.destroyed = true;
    }
}

class FakeViewer {
    static instances = [];

    constructor(container) {
        this.container = container;
        const canvas = new FakeElement();
        canvas.clientWidth = 800;
        canvas.clientHeight = 600;
        this.scene = {
            canvas,
            globe: {
                ellipsoid: {},
                pick: () => this.globePickResult
            },
            morphComplete: new FakeEvent(),
            requestRender() {},
            mode: 3
        };
        this.camera = {
            moveStart: new FakeEvent(),
            moveEnd: new FakeEvent(),
            positionWC: new Cartesian3(1, 2, 3),
            directionWC: new Cartesian3(0, 0, -1),
            upWC: new Cartesian3(0, 1, 0),
            pickEllipsoid: () => this.ellipsoidPickResult,
            getPickRay: () => this.pickRay,
            setView() {}
        };
        this.creditDisplay = {addStaticCredit() {}};
        this.entities = {
            values: [],
            add: (options) => {
                const entity = Object.assign(new Entity(), options);
                this.entities.values.push(entity);
                return entity;
            },
            remove: (entity) => {
                this.entities.values = this.entities.values.filter((value) => value !== entity);
            }
        };
        this.clock = {};
        this.timeline = undefined;
        FakeViewer.instances.push(this);
    }

    flyTo() {
        this.camera.moveStart.raiseEvent();
        this.camera.positionWC.x += 10;
        this.camera.moveEnd.raiseEvent();
        return Promise.resolve(true);
    }

    resize() {
        this.camera.moveStart.raiseEvent();
        this.camera.positionWC.y += 10;
        this.camera.moveEnd.raiseEvent();
    }

    isDestroyed() {
        return Boolean(this.destroyed);
    }

    destroy() {
        this.destroyed = true;
    }
}

const fakeEngine = {
    Cartesian2,
    Cartesian3,
    Cartographic,
    ClockRange: {LOOP_STOP: 1, CLAMPED: 2},
    Color,
    Credit,
    ColorMaterialProperty,
    Entity,
    ImageryLayer,
    Ion: {},
    JulianDate,
    Math: {
        toRadians: (value) => value * Math.PI / 180,
        toDegrees: (value) => value * 180 / Math.PI
    },
    PathGraphics,
    PolylineGlowMaterialProperty,
    SampledPositionProperty,
    SceneMode: {SCENE2D: 2, COLUMBUS_VIEW: 1},
    ScreenSpaceEventHandler,
    ScreenSpaceEventType: {LEFT_CLICK: 0},
    TimeInterval,
    TimeIntervalCollection,
    VelocityOrientationProperty
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
    if (request === '@cesium/engine') return fakeEngine;
    if (request === '@cesium/widgets') return {Viewer: FakeViewer};
    return originalLoad.call(this, request, parent, isMain);
};

const {createCesiumGlobe} = require(path.resolve(entryPath));
Module._load = originalLoad;

(async () => {
const host = new FakeElement();
hosts.set('#globe', host);
const moveEndContexts = [];
const controller = createCesiumGlobe({
    container: '#globe',
    realisticAtmosphere: false,
    onMoveEnd: (context) => moveEndContexts.push(context)
});
const viewer = FakeViewer.instances[0];
const container = host.children[0];

assert.equal(moveEndContexts.length, 0);

container.dispatchEvent({
    type: 'pointerdown',
    target: viewer.scene.canvas,
    composedPath: () => [viewer.scene.canvas, container]
});
viewer.ellipsoidPickResult = {
    cartographic: {longitude: Math.PI / 4, latitude: Math.PI / 6}
};
viewer.camera.moveStart.raiseEvent();
container.dispatchEvent({type: 'pointerup', target: viewer.scene.canvas});
viewer.camera.positionWC.x += 1;
viewer.camera.moveEnd.raiseEvent();
assert.deepEqual(moveEndContexts, [{lon: 45, lat: 29.999999999999996, x: 400, y: 300}]);

container.dispatchEvent({type: 'pointerdown'});
viewer.camera.moveStart.raiseEvent();
viewer.camera.moveEnd.raiseEvent();
assert.equal(moveEndContexts.length, 1);

container.dispatchEvent({type: 'pointerdown'});
viewer.ellipsoidPickResult = undefined;
viewer.pickRay = {};
viewer.globePickResult = {
    cartographic: {longitude: -Math.PI / 2, latitude: 0}
};
viewer.camera.moveStart.raiseEvent();
viewer.camera.positionWC.y += 1;
viewer.camera.moveEnd.raiseEvent();
assert.deepEqual(moveEndContexts[1], {lon: -90, lat: 0, x: 400, y: 300});

container.dispatchEvent({type: 'pointerdown'});
viewer.globePickResult = undefined;
viewer.camera.moveStart.raiseEvent();
viewer.camera.positionWC.z += 1;
viewer.camera.moveEnd.raiseEvent();
assert.deepEqual(moveEndContexts[2], {lon: null, lat: null, x: 400, y: 300});

const homeButton = new FakeElement();
container.dispatchEvent({
    type: 'pointerdown',
    target: homeButton,
    composedPath: () => [homeButton, container]
});
container.dispatchEvent({type: 'pointerup', target: homeButton});
viewer.ellipsoidPickResult = {
    cartographic: {longitude: Math.PI / 8, latitude: -Math.PI / 8}
};
viewer.camera.moveStart.raiseEvent();
viewer.camera.positionWC.x += 1;
viewer.camera.moveEnd.raiseEvent();
assert.deepEqual(moveEndContexts[3], {lon: 22.5, lat: -22.5, x: 400, y: 300});

container.dispatchEvent({type: 'pointerdown'});
controller.resize();
assert.equal(moveEndContexts.length, 4);

container.dispatchEvent({type: 'pointerdown'});
const route = controller.addRoute({
    id: 'route',
    data: [
        {lat: 37.5, lon: 126.9},
        {lat: 37.6, lon: 127}
    ],
    animation: false
});
await route.flyTo();
await controller.flyToRoute('route');
assert.equal(moveEndContexts.length, 4);

viewer.trackedEntity = new Entity();
container.dispatchEvent({type: 'pointerdown'});
viewer.camera.moveStart.raiseEvent();
viewer.camera.positionWC.x += 1;
viewer.camera.moveEnd.raiseEvent();
assert.equal(moveEndContexts.length, 4);
viewer.trackedEntity = undefined;

controller.destroy();
assert.equal(container.listeners.get('pointerdown').size, 0);
assert.equal(container.listeners.get('pointerup').size, 0);
assert.equal(container.listeners.get('pointercancel').size, 0);
assert.equal(container.listeners.get('wheel').size, 0);
assert.equal(container.listeners.get('keydown').size, 0);
assert.equal(viewer.camera.moveStart.listeners.size, 0);
assert.equal(viewer.camera.moveEnd.listeners.size, 0);
assert.equal(ScreenSpaceEventHandler.instances[0].destroyed, true);
assert.equal(viewer.destroyed, true);

console.log('Cesium move-end runtime tests passed.');
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
