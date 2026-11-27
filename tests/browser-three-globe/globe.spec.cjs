const {test, expect} = require('../../packages/k-chart-three/node_modules/@playwright/test');

test.beforeEach(async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.__globeErrors = errors;
    await page.goto('/');
    await page.waitForFunction(() => !!window.globeHarness?.inspect());
});
test.afterEach(async ({page}) => expect(page.__globeErrors).toEqual([]));

const inspect = page => page.evaluate(() => window.globeHarness.inspect());
const waitProjection = (page, progress) => page.waitForFunction(
    value => Math.abs(window.globeHarness.series().getProjectionProgress() - value) < 1e-8, progress);

for (const projection of ['globe', 'flat']) {
    test(`tiny coastal marker picks exact original record in ${projection} projection`, async ({page}) => {
        await page.evaluate(() => window.globeHarness.mountMarkerPick());
        await page.evaluate(projection => window.globeHarness.series().setProjection(projection, {animate: false}), projection);
        await waitProjection(page, projection === 'flat' ? 1 : 0);
        const target = await page.evaluate(() => window.globeHarness.markerPickTarget(1));
        // Six CSS pixels exceeds the real tiny sphere but stays inside its hit area.
        await page.mouse.click(target.x + 6, target.y);
        const state = await page.evaluate(() => window.globeHarness.markerPickState());
        expect(state.callbacks).toHaveLength(1);
        expect(state.callbacks[0]).toMatchObject({name: 'coast', index: 2, lat: 37.45});
        expect(state.callbacks[0].lon).toBeCloseTo(126.4, 10);
        expect(state.picks).toEqual([{lat: state.callbacks[0].lat, lon: state.callbacks[0].lon}]);
        await page.mouse.move(target.x, target.y);
        await page.mouse.down();
        await page.mouse.move(target.x + 4, target.y, {steps: 2});
        await page.mouse.up();
        expect((await page.evaluate(() => window.globeHarness.markerPickState())).callbacks).toHaveLength(1);
        const afterDrag = await page.evaluate(() => window.globeHarness.markerPickTarget(1));
        await page.mouse.click(afterDrag.x, afterDrag.y);
        expect((await page.evaluate(() => window.globeHarness.markerPickState())).callbacks).toHaveLength(2);
    });
}

test('marker callback cancellation, background and synchronous chart destruction do not fall through', async ({page}) => {
    await page.evaluate(() => window.globeHarness.mountMarkerPick({geo: false}));
    let target = await page.evaluate(() => window.globeHarness.markerPickTarget(1));
    await page.mouse.click(target.x + 14, target.y);
    expect((await page.evaluate(() => window.globeHarness.markerPickState())).callbacks).toHaveLength(0);
    await page.evaluate(() => window.globeHarness.mountMarkerPick({cancel: true}));
    target = await page.evaluate(() => window.globeHarness.markerPickTarget(1));
    await page.mouse.click(target.x, target.y);
    let state = await page.evaluate(() => window.globeHarness.markerPickState());
    expect(state.callbacks).toHaveLength(1);
    expect(state.picks).toEqual([]);
    await page.evaluate(() => window.globeHarness.mountMarkerPick({destroy: true}));
    target = await page.evaluate(() => window.globeHarness.markerPickTarget(1));
    await page.mouse.click(target.x, target.y);
    state = await page.evaluate(() => window.globeHarness.markerPickState());
    expect(state.callbacks).toHaveLength(1);
    expect(state.picks).toEqual([]);
    await expect(page.locator('#chart canvas')).toHaveCount(0);
});

test('raised limb markers and exposed edges use the actual click ray, not center-facing heuristics', async ({page}) => {
    await page.evaluate(() => window.globeHarness.mountMarkerVisibility('raised'));
    let point = await page.evaluate(() => window.globeHarness.markerPickTarget(0));
    await page.mouse.click(point.x, point.y);
    let state = await page.evaluate(() => window.globeHarness.markerPickState());
    expect(state.callbacks.map(context => context.name)).toEqual(['raised']);
    await page.evaluate(() => {
        window.globeHarness.mountMarkerVisibility('edge');
        window.globeHarness.series().setProjection('flat', {animate: false});
    });
    await waitProjection(page, 1);
    point = await page.evaluate(() => window.globeHarness.markerPickTarget(0));
    const width = await page.locator('#chart canvas').evaluate(canvas => canvas.getBoundingClientRect().width);
    await page.mouse.click(point.x + 10 * width / 240, point.y);
    state = await page.evaluate(() => window.globeHarness.markerPickState());
    expect(state.callbacks.map(context => context.name)).toEqual(['large']);
    expect(state.callbacks[0].index).toBe(0);
});

for (const kind of ['three', 'region', 'svg-globe']) {
    test(`shared geo controller opens from real ${kind} clicks, not drags`, async ({page}) => {
        await page.evaluate(kind => window.globeHarness.mountGeo(kind), kind);
        await page.waitForFunction(() => window.globeHarness.geoTarget());
        const target = await page.evaluate(() => window.globeHarness.geoTarget());
        const hitTarget = await page.evaluate(({x, y}) => ({
            hit: document.elementFromPoint(x, y)?.outerHTML.slice(0, 250),
            overlay: document.querySelector('rect.kchart-tooltip-overlay')?.getAttribute('style')
        }), target);
        await page.mouse.click(target.x, target.y);
        let state = await page.evaluate(() => window.globeHarness.geoState());
        expect(state.picks, JSON.stringify(hitTarget)).toHaveLength(1);
        expect(state.picks[0].lat).toBeGreaterThan(47);
        expect(state.picks[0].lat).toBeLessThan(55);
        expect(state.picks[0].lon).toBeGreaterThan(5);
        expect(state.picks[0].lon).toBeLessThan(16);
        if (kind === 'region') expect(state.regions).toEqual(['276']);
        await page.mouse.move(target.x, target.y);
        await page.mouse.down();
        await page.mouse.move(target.x + 20, target.y + 12, {steps: 4});
        await page.mouse.up();
        state = await page.evaluate(() => window.globeHarness.geoState());
        expect(state.picks).toHaveLength(1);
        await page.mouse.wheel(0, -60);
        await page.waitForTimeout(200);
        expect((await page.evaluate(() => window.globeHarness.geoState())).picks).toHaveLength(1);
        const nextTarget = await page.evaluate(() => window.globeHarness.geoTarget());
        await page.mouse.click(nextTarget.x, nextTarget.y);
        expect((await page.evaluate(() => window.globeHarness.geoState())).picks).toHaveLength(2);
        if (kind === 'three') {
            await page.evaluate(() => window.globeHarness.series().setProjection('flat', {animate: false}));
            await waitProjection(page, 1);
            const seoul = await page.evaluate(() => window.globeHarness.geoMarkerTarget(0));
            await page.mouse.click(seoul.x, seoul.y);
            const flatState = await page.evaluate(() => window.globeHarness.geoState());
            expect(flatState.picks).toHaveLength(3);
            const coordinateTolerance = Math.max(0.5, seoul.degreesPerPixel);
            expect(Math.abs(flatState.picks[2].lat - 37.5665)).toBeLessThan(coordinateTolerance);
            expect(Math.abs(flatState.picks[2].lon - 126.978)).toBeLessThan(coordinateTolerance);
            await page.mouse.move(seoul.x, seoul.y);
            await page.mouse.down();
            await page.mouse.move(seoul.x + 4, seoul.y, {steps: 2});
            await page.mouse.up();
            expect((await page.evaluate(() => window.globeHarness.geoState())).picks).toHaveLength(3);
            await page.mouse.click(seoul.x, seoul.y);
            expect((await page.evaluate(() => window.globeHarness.geoState())).picks).toHaveLength(4);
            await page.evaluate(() => window.globeHarness.series().setProjection('globe', {duration: 1000}));
            const transitioningTarget = await page.evaluate(() => window.globeHarness.geoTarget());
            await page.mouse.click(transitioningTarget.x, transitioningTarget.y);
            expect((await page.evaluate(() => window.globeHarness.geoState())).picks).toHaveLength(4);
        }
        await page.evaluate(kind => window.globeHarness.mountGeo(kind, false), kind);
        const disabledTarget = await page.evaluate(() => window.globeHarness.geoTarget());
        await page.mouse.click(disabledTarget.x, disabledTarget.y);
        state = await page.evaluate(() => window.globeHarness.geoState());
        expect(state.picks).toHaveLength(0);
        expect(state.destroyed).toBe(0);
    });
}

test('region country clicks traverse the core tooltip overlay without map zoom', async ({page}) => {
    await page.evaluate(() => window.globeHarness.mountGeo('region', true, false));
    const target = await page.evaluate(() => window.globeHarness.geoTarget());
    await page.mouse.click(target.x, target.y);
    const state = await page.evaluate(() => window.globeHarness.geoState());
    expect(state.picks).toHaveLength(1);
    expect(state.regions).toEqual(['276']);
});

test('SVG marker drilldown remains separate from country popup', async ({page}) => {
    await page.evaluate(() => window.globeHarness.mountGeo('svg-marker'));
    await page.locator('.kchart-globe-marker').click();
    const state = await page.evaluate(() => window.globeHarness.geoState());
    expect(state.markers).toBe(1);
    expect(state.picks).toHaveLength(0);
    await expect(page.locator('rect.kchart-globe-map-background')).toBeVisible();
});

test('earth sampling compiles in WebGL1 with and without gradient extensions', async ({page}) => {
    const result = await page.evaluate(() => window.globeHarness.compileWebGL1Sampling());
    expect(result.fallback.compiled, result.fallback.log).toBe(true);
    // This browser supplies both extensions; exercise the r160 shader path too.
    expect(result.gradients).not.toBeNull();
    expect(result.gradients.compiled, result.gradients.log).toBe(true);
});

for (const nightSide of [false, true]) {
    test(`closing the map does not select coarse white mips at the dateline (${nightSide ? 'night' : 'day'})`, async ({page}, testInfo) => {
        // Negative control: prove this pixel test detects the original shader,
        // rather than merely passing because the seam is offscreen.
        await page.evaluate(nightSide => window.globeHarness.mountSeam(nightSide, true), nightSide);
        const legacy = await page.evaluate(() => window.globeHarness.capture());
        expect(legacy.pixels.seamBright).toBeGreaterThan(0);
        await page.evaluate(nightSide => window.globeHarness.mountSeam(nightSide), nightSide);
        await page.evaluate(() => window.globeHarness.series().setProjection('flat', {animate: false}));
        await waitProjection(page, 1);
        await page.evaluate(() => window.globeHarness.series().setProjection('globe', {duration: 1200}));
        await page.waitForFunction(() => {
            const progress = window.globeHarness.series().getProjectionProgress();
            return progress > 0 && progress < 0.03;
        });
        const closing = await page.evaluate(() => window.globeHarness.capture());
        await waitProjection(page, 0);
        const closed = await page.evaluate(() => window.globeHarness.capture());
        await page.screenshot({path: testInfo.outputPath('dateline-closed.png')});
        for (const frame of [closing, closed]) {
            expect(frame.pixels.colored).toBeGreaterThan(10);
            expect(frame.pixels.seamTotal).toBeGreaterThan(100);
            expect(frame.pixels.seamBright).toBe(0);
            expect(frame.surfaces).toHaveLength(1);
        }
    });
}

test('wide desktop maps draw one world with empty side gutters at every longitude', async ({page}, testInfo) => {
    await page.evaluate(() => window.globeHarness.mount({autoRotate: false}));
    for (const [width, height] of [[1440, 420], [2560, 700], [3440, 900]]) {
        await page.setViewportSize({width, height});
        await page.evaluate(({width, height}) => window.globeHarness.resize(width, height), {width, height});
        for (const lon of [0, 170, -170]) {
            await page.evaluate(lon => {
                window.globeHarness.series().setFlatView({center: {lat: 0, lon}, zoom: 1, lighting: 'night'});
                window.globeHarness.series().setProjection('flat', {animate: false});
            }, lon);
            const flat = await page.evaluate(() => window.globeHarness.capture());
            expect(flat.surfaces).toHaveLength(1);
            expect(flat.surfaces[0].name).toBe('kchart-three-globe-surface');
            expect(flat.surfaces[0].maxNdc).toBeLessThanOrEqual(1 + 1e-6);
            expect(flat.pixels.colored).toBeGreaterThan(10);
            expect(flat.pixels.lateralTotal).toBe(6);
            expect(flat.pixels.lateralColored).toBe(0);
            expect(flat.points.every(point => point.screen.every(Number.isFinite))).toBe(true);
        }
        await page.screenshot({path: testInfo.outputPath(`single-world-${width}.png`)});
    }
    await page.evaluate(() => {
        window.globeHarness.series().setFlatView({center: {lat: 0, lon: 170}, zoom: 3.2});
    });
    const regional = await page.evaluate(() => window.globeHarness.capture());
    expect(regional.surfaces).toHaveLength(1);
    expect(regional.pixels.colored).toBeGreaterThan(10);
    expect(regional.points[3].world[0]).toBeCloseTo((179.8 - 170) / 180 * 3.2, 5);
    await page.evaluate(() => window.globeHarness.series().setProjection('globe', {animate: false}));
    const globe = await page.evaluate(() => window.globeHarness.capture());
    expect(globe.surfaces).toHaveLength(1);
    expect(globe.pixels.colored).toBeGreaterThan(10);
});

for (const atmosphere of [true, false]) {
    for (const [width, height] of [[1280, 800], [680, 382], [669, 382], [390, 844], [844, 390]]) {
        test(`shared-size endpoints in ${width}x${height} viewport with atmosphere ${atmosphere}`, async ({page}) => {
            await page.evaluate(atmosphere => window.globeHarness.mount({autoRotate: false, atmosphere}), atmosphere);
            await page.setViewportSize({width, height});
            await page.evaluate(({width, height}) => window.globeHarness.resize(width, height), {width, height});
            const globe = await page.evaluate(() => window.globeHarness.capture());
            expect(globe.progress).toBe(0);
            expect(globe.camera.width).toBeGreaterThan(0);
            expect(globe.camera.width).toBeLessThanOrEqual(width);
            expect(globe.camera.height).toBeGreaterThan(0);
            expect(globe.camera.height).toBeLessThanOrEqual(height);
            expect(globe.camera.framingRadius).toBeCloseTo(atmosphere ? 1.045 : 1, 6);
            const outerHeight = ({camera}) => camera.framingRadius
                / Math.sqrt(camera.distance ** 2 - camera.framingRadius ** 2)
                * camera.height / camera.tangent;
            const globeHeight = outerHeight(globe);
            expect(Number.isFinite(globeHeight)).toBe(true);
            expect(globe.pixels.colored).toBeGreaterThan(10);

            await page.evaluate(() => window.globeHarness.series().setProjection('flat', {animate: false}));
            await waitProjection(page, 1);
            const flat = await page.evaluate(() => window.globeHarness.capture());
            const centralSurface = flat.surfaces[0];
            const flatHeight = centralSurface.ndcHeight * flat.camera.height / 2;
            expect(flat.camera.width).toBe(globe.camera.width);
            expect(flat.camera.height).toBe(globe.camera.height);
            expect(flatHeight).toBeCloseTo(Math.min(flat.camera.height, flat.camera.width / 2) / 1.02, 3);
            expect(Math.abs(globeHeight / flatHeight - 0.94)).toBeLessThanOrEqual(0.02);
            expect(centralSurface.finite).toBe(true);
            expect(centralSurface.maxNdc).toBeLessThanOrEqual(1 + 1e-6);
            expect(flat.pixels.colored).toBeGreaterThan(10);
            expect(flat.markerUuid).toBe(globe.markerUuid);
            expect(flat.canvasCount).toBe(1);

            await page.evaluate(() => window.globeHarness.series().setProjection('globe', {animate: false}));
            await waitProjection(page, 0);
            const restored = await inspect(page);
            expect(outerHeight(restored)).toBeCloseTo(globeHeight, 5);
            expect(restored.markerUuid).toBe(globe.markerUuid);
            expect(restored.canvasCount).toBe(1);
        });
    }
}

test('default spin keeps latitude fixed, stops in flat mode, and can be paused', async ({page}) => {
    const first = await inspect(page);
    await page.waitForFunction(lon => Math.abs(window.globeHarness.series().getCenter().lon - lon) > 0.3, first.center.lon);
    const rotating = await inspect(page);
    expect(rotating.center.lat).toBe(first.center.lat);
    rotating.points[5].world.forEach((value,index) => expect(value).toBeCloseTo(first.points[5].world[index], 5));
    expect(rotating.surfaces.map(surface => surface.positionVersion)).toEqual(first.surfaces.map(surface => surface.positionVersion));
    await page.evaluate(() => window.globeHarness.series().setAutoRotate(false));
    const paused = await inspect(page);
    const stable = await page.evaluate(async () => {
        const start = window.globeHarness.series().getCenter();
        for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
        return {start, end: window.globeHarness.series().getCenter()};
    });
    expect(stable.start).toEqual(stable.end);
    expect(paused.center.lat).toBe(25);
    await page.evaluate(() => {
        window.globeHarness.series().setAutoRotate(true);
        window.globeHarness.series().setProjection('flat', {animate: false});
    });
    await waitProjection(page, 1);
    const flat = await page.evaluate(async () => {
        const start = window.globeHarness.series().getCenter();
        for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
        return {start, end: window.globeHarness.series().getCenter()};
    });
    expect(flat.start).toEqual(flat.end);
});

test('holding a drag pauses rotation and releasing resumes without changing latitude', async ({page}) => {
    const canvas = page.locator('#chart canvas');
    const bounds = await canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    const held = await page.evaluate(async () => {
        const start = window.globeHarness.series().getCenter();
        for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
        return {start, end: window.globeHarness.series().getCenter()};
    });
    expect(held.end).toEqual(held.start);
    await page.mouse.move(bounds.x + bounds.width / 2 + 40, bounds.y + bounds.height / 2 + 12);
    const dragged = await inspect(page);
    expect(dragged.center.lat).not.toBe(held.start.lat);
    await page.mouse.up();
    await page.waitForFunction(lon => Math.abs(window.globeHarness.series().getCenter().lon - lon) > 0.3, dragged.center.lon);
    expect((await inspect(page)).center.lat).toBe(dragged.center.lat);
});

test('unfolding moves the same marker mesh continuously with a nonblank surface', async ({page}, testInfo) => {
    await page.evaluate(() => window.globeHarness.series().setAutoRotate(false));
    const before = await inspect(page);
    await page.screenshot({path: testInfo.outputPath('globe.png')});
    await page.evaluate(() => {
        window.globeHarness.clearFrames();
        window.globeHarness.series().setProjection('flat', {duration: 1200});
    });
    await page.waitForFunction(() => {
        const p = window.globeHarness.series().getProjectionProgress();
        return p > 0.25 && p < 0.8;
    });
    const middle = await page.evaluate(() => window.globeHarness.capture());
    expect(middle.progress).toBeGreaterThan(0);
    expect(middle.progress).toBeLessThan(1);
    expect(middle.pixels.colored).toBeGreaterThan(10);
    await page.screenshot({path: testInfo.outputPath('unfolding.png')});
    await waitProjection(page, 1);
    const after = await page.evaluate(() => window.globeHarness.capture());
    await page.screenshot({path: testInfo.outputPath('flat.png')});
    expect(after.markerUuid).toBe(before.markerUuid);
    expect(middle.markerUuid).toBe(before.markerUuid);
    expect(after.pixels.colored).toBeGreaterThan(10);
    expect(after.canvasCount).toBe(1);
    const coordinates = [[37.5665,126.978], [40.7128,-74.006], [-33.8688,151.2093], [0,179.8], [85,-179.8], [90,0]];
    after.points.forEach((point,index) => {
        expect(point.world[0]).toBeCloseTo(coordinates[index][1] / 180, 5);
        expect(point.world[1]).toBeCloseTo(coordinates[index][0] / 180, 5);
    });
    const frames = await page.evaluate(() => window.globeHarness.frames());
    const transitional = frames.filter(frame => frame.progress > 0 && frame.progress < 1);
    expect(transitional.length).toBeGreaterThan(5);
    expect(new Set(transitional.map(frame => frame.points[0].world.join(','))).size).toBeGreaterThan(5);
    for (const frame of frames) {
        expect(frame.surfaces.every(surface => surface.finite)).toBe(true);
        expect(frame.surfaces.every(surface => surface.maxNdc <= 1.03)).toBe(true);
        expect(frame.points.every(point => point.world.every(Number.isFinite))).toBe(true);
    }
    // Both antimeridian markers and the polar point stay on the final map.
    for (const point of after.points) {
        expect(Math.abs(point.screen[0])).toBeLessThanOrEqual(1.03);
        expect(Math.abs(point.screen[1])).toBeLessThanOrEqual(1.03);
    }
});

test('rapid reversal and resize preserve the current animation state', async ({page}) => {
    await page.evaluate(() => {
        window.globeHarness.series().setAutoRotate(false);
        window.globeHarness.series().setProjection('flat', {duration: 1200});
    });
    await page.waitForFunction(() => window.globeHarness.series().getProjectionProgress() > 0.2);
    const reversal = await page.evaluate(() => {
        const series = window.globeHarness.series();
        const before = window.globeHarness.inspect();
        series.setProjection('globe', {duration: 500});
        return {before, after: window.globeHarness.inspect()};
    });
    expect(reversal.after.progress).toBeCloseTo(reversal.before.progress, 8);
    expect(reversal.after.points).toEqual(reversal.before.points);
    await page.setViewportSize({width: 480, height: 640});
    await page.evaluate(() => window.globeHarness.resize(innerWidth, innerHeight));
    await waitProjection(page, 0);
    const final = await page.evaluate(() => window.globeHarness.capture());
    expect(final.pixels.colored).toBeGreaterThan(10);
    expect(final.canvasCount).toBe(1);
    expect(final.surfaces.every(surface => surface.finite)).toBe(true);
});

test('reduced motion avoids spin and projection animation; destroy releases context', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.evaluate(() => window.globeHarness.mount());
    const result = await page.evaluate(async () => {
        const harness = window.globeHarness;
        const start = harness.series().getCenter();
        for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame);
        const end = harness.series().getCenter();
        harness.series().setProjection('flat');
        return {start, end, progress: harness.series().getProjectionProgress()};
    });
    expect(result.end).toEqual(result.start);
    expect(result.progress).toBe(1);
    await page.evaluate(() => window.globeHarness.destroy());
    await page.waitForFunction(() => window.globeHarness.contextLost());
    await expect(page.locator('#chart canvas')).toHaveCount(0);
});
