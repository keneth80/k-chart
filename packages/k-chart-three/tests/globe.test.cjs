const assert = require('node:assert/strict');
const test = require('node:test');
const {
    bindGlobeDrag,
    advanceGlobeCenter,
    createGlobeSurfaceProjector,
    calculateSubsolarPoint,
    dragCenter,
    latLonToEquirectangular,
    latLonToVector,
    normalizeFlatMapView,
    prepareGlobeMarkers,
    rotationFor,
    shortestLongitudeDelta,
    wrapLon
} = require('../lib/globe-utils.js');
const {createThreeGlobeSeries} = require('../lib/index.js');

const closeTo = (actual, expected, tolerance, message) => {
    assert.ok(
        Math.abs(actual - expected) <= tolerance,
        `${message}: expected ${expected} +/- ${tolerance}, received ${actual}`
    );
};

class MockCanvas {
    constructor() {
        this.style = {touchAction: 'pan-y', cursor: 'crosshair'};
        this.listeners = new Map();
        this.captures = new Set();
        this.releaseCount = 0;
    }

    addEventListener(type, listener) {
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(listener);
        this.listeners.set(type, listeners);
    }

    removeEventListener(type, listener) {
        this.listeners.get(type)?.delete(listener);
    }

    setPointerCapture(pointerId) {
        this.captures.add(pointerId);
    }

    hasPointerCapture(pointerId) {
        return this.captures.has(pointerId);
    }

    releasePointerCapture(pointerId) {
        this.releaseCount += 1;
        this.captures.delete(pointerId);
    }

    emit(type, overrides = {}) {
        const event = {
            pointerId: 1,
            pointerType: 'mouse',
            button: 0,
            clientX: 10,
            clientY: 10,
            defaultPrevented: false,
            preventDefault() {
                this.defaultPrevented = true;
            },
            ...overrides
        };
        for (const listener of this.listeners.get(type) ?? []) {
            listener(event);
        }
        return event;
    }

    listenerCount() {
        return [...this.listeners.values()]
            .reduce((count, listeners) => count + listeners.size, 0);
    }
}

test('longitude wrapping and drag math use one diameter per 180 degrees', () => {
    assert.equal(wrapLon(181), -179);
    assert.equal(wrapLon(-181), 179);
    assert.equal(shortestLongitudeDelta(170, -170), 20);
    assert.deepEqual(
        dragCenter({lat: 0, lon: 170}, 200, 100, 200),
        {lat: 80, lon: -10}
    );
});

test('latLonToVector and rotationFor place the requested center forward', () => {
    const primeMeridian = latLonToVector({lat: 0, lon: 0});
    closeTo(primeMeridian.x, 1, 1e-12, 'primeMeridian.x');
    closeTo(primeMeridian.y, 0, 1e-12, 'primeMeridian.y');
    closeTo(primeMeridian.z, 0, 1e-12, 'primeMeridian.z');
    const center = {lat: 37.57, lon: 126.98};
    const forward = latLonToVector(center).applyQuaternion(rotationFor(center));
    closeTo(forward.x, 0, 1e-12, 'forward.x');
    closeTo(forward.y, 0, 1e-12, 'forward.y');
    closeTo(forward.z, 1, 1e-12, 'forward.z');
});

test('equirectangular projection preserves world aspect and normalizes flat views', () => {
    const northEast = latLonToEquirectangular({lat: 90, lon: 90});
    closeTo(northEast.x, 0.5, 1e-12, 'northEast.x');
    closeTo(northEast.y, 0.5, 1e-12, 'northEast.y');
    const southWest = latLonToEquirectangular({lat: -90, lon: -180});
    closeTo(southWest.x, -1, 1e-12, 'southWest.x');
    closeTo(southWest.y, -0.5, 1e-12, 'southWest.y');

    assert.deepEqual(normalizeFlatMapView(undefined), {
        center: {lat: 0, lon: 0},
        zoom: 1,
        lighting: 'night'
    });
    assert.deepEqual(normalizeFlatMapView({
        center: {lat: 95, lon: 487},
        zoom: 0.25
    }), {
        center: {lat: 90, lon: 127},
        zoom: 1,
        lighting: 'night'
    });
    assert.deepEqual(normalizeFlatMapView(
        {lighting: 'day'},
        {center: {lat: 12, lon: 34}, zoom: 5, lighting: 'dynamic'}
    ), {
        center: {lat: 12, lon: 34},
        zoom: 5,
        lighting: 'day'
    });
});

test('calculateSubsolarPoint matches exact 2026 equinox and solstice instants', () => {
    const marchEquinox = calculateSubsolarPoint(new Date('2026-03-20T14:46:00.000Z'));
    closeTo(marchEquinox.lat, 0, 0.02, 'March equinox latitude');
    closeTo(marchEquinox.lon, -39.64, 0.15, 'March equinox longitude');

    const juneSolstice = calculateSubsolarPoint(new Date('2026-06-21T08:24:00.000Z'));
    closeTo(juneSolstice.lat, 23.44, 0.03, 'June solstice latitude');
    closeTo(juneSolstice.lon, 54.45, 0.15, 'June solstice longitude');

    const septemberEquinox = calculateSubsolarPoint(new Date('2026-09-23T00:05:00.000Z'));
    closeTo(septemberEquinox.lat, 0, 0.02, 'September equinox latitude');
    closeTo(septemberEquinox.lon, 176.88, 0.15, 'September equinox longitude');

    const decemberSolstice = calculateSubsolarPoint(new Date('2026-12-21T20:50:00.000Z'));
    closeTo(decemberSolstice.lat, -23.44, 0.03, 'December solstice latitude');
    closeTo(decemberSolstice.lon, -132.94, 0.15, 'December solstice longitude');
});

test('prepareGlobeMarkers extracts configured fields and filters invalid coordinates', () => {
    const rows = [
        {latitude: '37.57', longitude: '126.98', color: '#22f59a', radius: 0.02, lift: 0.01},
        {latitude: 91, longitude: 10, color: '#ffffff', radius: 0.02, lift: 0},
        {latitude: null, longitude: 20, color: '#ffffff', radius: 0.02, lift: 0},
        {latitude: -33.87, longitude: 511.21, color: '#68a7ff', radius: 0.018, lift: -1}
    ];
    const markers = prepareGlobeMarkers(rows, {
        fields: {lat: 'latitude', lon: 'longitude'},
        color: (datum) => datum.color,
        radius: (datum) => datum.radius,
        surfaceOffset: (datum) => datum.lift
    });

    assert.equal(markers.length, 2);
    assert.deepEqual(
        markers.map(({index, lat, lon, color, radius, surfaceOffset}) => ({
            index,
            lat,
            lon,
            color,
            radius,
            surfaceOffset
        })),
        [
            {index: 0, lat: 37.57, lon: 126.98000000000002, color: '#22f59a', radius: 0.02, surfaceOffset: 0.01},
            {index: 3, lat: -33.87, lon: 151.21000000000004, color: '#68a7ff', radius: 0.018, surfaceOffset: 0}
        ]
    );
});

test('public globe handle normalizes immediate center updates before mounting', () => {
    const series = createThreeGlobeSeries({
        selector: 'test-globe',
        dayTexture: 'day-texture.jpg'
    });
    assert.equal(series.getProjection(), 'globe');
    assert.deepEqual(series.getFlatView(), {
        center: {lat: 0, lon: 0},
        zoom: 1,
        lighting: 'night'
    });
    series.setCenter({lat: 95, lon: 190}, {animate: false});
    assert.deepEqual(series.getCenter(), {lat: 80, lon: -170});
    series.setProjection('flat');
    assert.equal(series.getProjection(), 'flat');
    series.setFlatView({center: {lat: 37.5665, lon: 126.978}, zoom: 4});
    const regionalView = series.getFlatView();
    assert.equal(regionalView.center.lat, 37.5665);
    closeTo(regionalView.center.lon, 126.978, 1e-12, 'regional longitude');
    assert.equal(regionalView.zoom, 4);
    assert.equal(regionalView.lighting, 'night');
    series.setFlatView({zoom: 0, lighting: 'dynamic'});
    const clampedView = series.getFlatView();
    assert.equal(clampedView.center.lat, 37.5665);
    closeTo(clampedView.center.lon, 126.978, 1e-12, 'clamped longitude');
    assert.equal(clampedView.zoom, 1);
    assert.equal(clampedView.lighting, 'dynamic');
    series.setFlatView({lighting: 'day'});
    const dayView = series.getFlatView();
    assert.equal(dayView.center.lat, 37.5665);
    closeTo(dayView.center.lon, 126.978, 1e-12, 'day longitude');
    assert.equal(dayView.zoom, 1);
    assert.equal(dayView.lighting, 'day');
    series.setSubsolar({lat: 5, lon: 200});
    series.setDate(new Date('2024-03-20T03:06:00.000Z'));
    series.setDate(null);
});

test('flat projection configuration is available before the series mounts', () => {
    const series = createThreeGlobeSeries({
        selector: 'test-flat-map',
        dayTexture: 'day-texture.jpg',
        projection: 'flat',
        flatMap: {
            center: {lat: 36, lon: 128},
            zoom: 3,
            lighting: 'dynamic'
        }
    });
    assert.equal(series.getProjection(), 'flat');
    assert.deepEqual(series.getFlatView(), {
        center: {lat: 36, lon: 128},
        zoom: 3,
        lighting: 'dynamic'
    });
});

test('click cancels a tween but does not emit a center callback', () => {
    const canvas = new MockCanvas();
    let center = {lat: 0, lon: 0};
    let cancelCount = 0;
    let callbackCount = 0;
    const cleanup = bindGlobeDrag(canvas, {
        getCenter: () => center,
        getDiameter: () => 180,
        setCenter: (nextCenter) => {
            center = nextCenter;
        },
        cancelTween: () => {
            cancelCount += 1;
        },
        requestRender: () => {},
        onCenterChange: () => {
            callbackCount += 1;
        }
    });

    canvas.emit('pointerdown');
    canvas.emit('pointermove', {clientX: 13, clientY: 10});
    canvas.emit('pointerup', {clientX: 13, clientY: 10});

    assert.equal(cancelCount, 1);
    assert.equal(callbackCount, 0);
    assert.deepEqual(center, {lat: 0, lon: 0});
    assert.equal(canvas.releaseCount, 1);
    cleanup();
});

test('drag emits once on pointerup and pointercancel after crossing 3px', () => {
    for (const finishEvent of ['pointerup', 'pointercancel']) {
        const canvas = new MockCanvas();
        let center = {lat: 10, lon: 20};
        let renderCount = 0;
        const callbacks = [];
        const cleanup = bindGlobeDrag(canvas, {
            getCenter: () => center,
            getDiameter: () => 180,
            setCenter: (nextCenter) => {
                center = nextCenter;
            },
            cancelTween: () => {},
            requestRender: () => {
                renderCount += 1;
            },
            onCenterChange: (nextCenter) => callbacks.push(nextCenter)
        });

        canvas.emit('pointerdown');
        canvas.emit('pointermove', {clientX: 14, clientY: 12});
        assert.equal(callbacks.length, 0);
        canvas.emit(finishEvent, {clientX: 14, clientY: 12});
        canvas.emit('pointerup', {clientX: 14, clientY: 12});

        assert.deepEqual(center, {lat: 12, lon: 16});
        assert.equal(renderCount, 1);
        assert.deepEqual(callbacks, [{lat: 12, lon: 16}]);
        cleanup();
    }
});

test('cleanup removes listeners, releases capture, and restores canvas styles', () => {
    const canvas = new MockCanvas();
    const cleanup = bindGlobeDrag(canvas, {
        getCenter: () => ({lat: 0, lon: 0}),
        getDiameter: () => 100,
        setCenter: () => {},
        cancelTween: () => {},
        requestRender: () => {}
    });
    assert.equal(canvas.listenerCount(), 5);
    assert.equal(canvas.style.touchAction, 'none');
    assert.equal(canvas.style.cursor, 'grab');

    canvas.emit('pointerdown', {pointerId: 7});
    cleanup();

    assert.equal(canvas.listenerCount(), 0);
    assert.equal(canvas.captures.size, 0);
    assert.equal(canvas.releaseCount, 1);
    assert.equal(canvas.style.touchAction, 'pan-y');
    assert.equal(canvas.style.cursor, 'crosshair');
});

test('axial rotation preserves latitude, wraps longitude, and uses elapsed seconds', () => {
    assert.deepEqual(advanceGlobeCenter({lat: 37, lon: -179}, 6, 1000), {lat: 37, lon: 175});
    assert.deepEqual(advanceGlobeCenter({lat: 37, lon: 179}, -6, 1000), {lat: 37, lon: -175});
    assert.deepEqual(advanceGlobeCenter({lat: 37, lon: 20}, 6, -100), {lat: 37, lon: 20});
    let center = {lat: 24, lon: 100};
    for (let index = 0; index < 100; index += 1) {
        center = advanceGlobeCenter(center, 6, 10);
    }
    closeTo(center.lon, 94, 1e-9, 'frame-rate-independent longitude');
});

test('surface projector matches both endpoints including wrapped views and polar seams', () => {
    const center = {lat: 37, lon: 126};
    const flat = {center: {lat: 30, lon: 170}, zoom: 4, lighting: 'night'};
    const projectGlobe = createGlobeSurfaceProjector(0, center, flat, 2);
    const projectFlat = createGlobeSurfaceProjector(1, center, flat, 2);
    for (const lat of [-90, -45, 0, 45, 90]) {
        for (const lon of [-10, 0, 126, 170, 180, 185, 350]) {
            const point = {lat, lon};
            const globe = latLonToVector(point, 2).applyQuaternion(rotationFor(center));
            closeTo(projectGlobe(point).distanceTo(globe), 0, 1e-12, 'sphere endpoint');
            const position = projectFlat(point);
            closeTo(position.x, (lon - 170) / 180 * 2 * 4, 1e-12, 'flat x');
            closeTo(position.y, (lat - 30) / 180 * 2 * 4, 1e-12, 'flat y');
            closeTo(position.z, 0, 1e-12, 'flat z');
            let previous;
            for (let step = 0; step <= 100; step += 1) {
                const position = createGlobeSurfaceProjector(step / 100, center, flat, 2)(point, 0.01);
                assert.ok(position.toArray().every(Number.isFinite));
                if (previous) {
                    assert.ok(position.distanceTo(previous) < 0.5, 'continuous surface path');
                }
                previous = position;
            }
        }
    }
    const left = projectFlat({lat: 0, lon: -10});
    const right = projectFlat({lat: 0, lon: 350});
    closeTo(right.x - left.x, 16, 1e-12, 'seam endpoints remain separated');
});

test('auto-rotation public configuration is normalized and defensively copied', () => {
    const series = createThreeGlobeSeries({selector: 'rotation-contract', dayTexture: 'day.jpg'});
    assert.deepEqual(series.getAutoRotate(), {speed: 6});
    const state = series.getAutoRotate();
    state.speed = 99;
    assert.deepEqual(series.getAutoRotate(), {speed: 6});
    series.setAutoRotate(false);
    assert.equal(series.getAutoRotate(), false);
    series.setAutoRotate({speed: -12});
    assert.deepEqual(series.getAutoRotate(), {speed: -12});
    series.setAutoRotate({speed: NaN});
    assert.deepEqual(series.getAutoRotate(), {speed: 6});
    series.setAutoRotate(true);
    assert.equal(series.getProjectionProgress(), 0);
    series.setProjection('flat', {animate: false});
    assert.equal(series.getProjectionProgress(), 1);
    series.setProjection('globe', {duration: 0});
    assert.equal(series.getProjectionProgress(), 0);
});
