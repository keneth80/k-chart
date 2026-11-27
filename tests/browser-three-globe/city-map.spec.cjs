const {test, expect} = require('../../packages/k-chart-three/node_modules/@playwright/test');

// Live provider, not a generated texture or mocked successful basemap:
// https://openfreemap.org/quick_start/ documents MapLibre vector-tile styles.
// Fiord: https://tiles.openfreemap.org/styles/fiord
// Network unavailability intentionally FAILS the readiness checks below.
test.setTimeout(90_000);

const countries = [
    {id: '410', cities: ['seoul', 'busan', 'daejeon']},
    {id: '392', cities: ['tokyo', 'osaka', 'fukuoka']},
    {id: '276', cities: ['berlin', 'hamburg', 'munich']}
];
const dialogFor = page => page.locator('dialog[data-geo-drilldown]');
const cityFor = (page, city) => page.locator(`[data-geo-city-map="${city}"]`);
const featureCounts = root => root.evaluate(node => ({
    base: Number(node.dataset.geoBaseFeatures || 0),
    roads: Number(node.dataset.geoRoadFeatures || 0),
    buildings: Number(node.dataset.geoBuildingFeatures || 0)
}));

async function openCountry(page, id) {
    await page.locator(`[data-country-id="${id}"]`).click();
    await expect(dialogFor(page)).toHaveAttribute('data-geo-country', id);
    await expect(dialogFor(page).locator('[data-geo-city-option]')).toHaveCount(3);
}
async function openCity(page, id) {
    await dialogFor(page).locator(`[data-geo-city-option="${id}"] button`).click();
    await expect(dialogFor(page)).toHaveAttribute('data-geo-city', id);
    await expect(cityFor(page, id)).toBeVisible();
    await expect(dialogFor(page).locator('[data-geo-region]')).toHaveCount(3);
}
async function expectRealBasemap(page, id) {
    const root = cityFor(page, id);
    await expect(root, `${id}: live OpenFreeMap style/tiles must reach ready`).toHaveAttribute('data-geo-map-status', 'ready', {timeout: 30_000});
    await expect.poll(async () => (await featureCounts(root)).base,
        {message: `${id}: require rendered basemap features, excluding the example's geo source`, timeout: 20_000}).toBeGreaterThan(0);
    await expect.poll(async () => {
        const counts = await featureCounts(root);
        return counts.roads + counts.buildings;
    }, {message: `${id}: roads or buildings must actually render; background and point markers do not qualify`, timeout: 20_000}).toBeGreaterThan(0);
    await expect(root.locator('canvas')).toHaveCount(1);
    await expect(page.locator('.geo-hierarchy-map canvas')).toHaveCount(1);
    await expect(dialogFor(page).locator('canvas')).toHaveCount(1);
    return root;
}

test.beforeEach(async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.__cityErrors = errors;
    await page.goto('/?example=geo-hierarchy', {timeout: 60_000});
    await expect(page.locator('.geo-hierarchy-map canvas')).toHaveCount(1, {timeout: 60_000});
});
test.afterEach(async ({page}) => {
    if (await dialogFor(page).count()) await page.keyboard.press('Escape');
    expect(page.__cityErrors).toEqual([]);
});

test('Tokyo displays actual OpenFreeMap roads and buildings, not a blank texture crop', async ({page}, testInfo) => {
    const tileResponses = [];
    page.on('response', response => {
        const url = new URL(response.url());
        if (url.hostname.endsWith('.openfreemap.org') && /\/\d+\/\d+\/\d+(?:\.pbf)?$/.test(url.pathname)
            && response.status() === 200) tileResponses.push(response.url());
    });
    await openCountry(page, '392');
    await openCity(page, 'tokyo');
    const map = await expectRealBasemap(page, 'tokyo');
    await expect.poll(() => tileResponses.length, {message: 'require successful real vector-tile HTTP responses', timeout: 20_000}).toBeGreaterThan(0);
    await expect(dialogFor(page).locator('[data-geo-region]')).toContainText(['Shinjuku', 'Shibuya', 'Chiyoda']);
    await testInfo.attach('tokyo-live-basemap.json', {body: JSON.stringify({features: await featureCounts(map), tiles: tileResponses}, null, 2), contentType: 'application/json'});
    await page.screenshot({path: testInfo.outputPath('city-map-tokyo.png')});
    const canvas = await map.locator('canvas').elementHandle();
    await dialogFor(page).getByRole('button', {name: 'Back', exact: true}).click();
    await expect(cityFor(page, 'tokyo')).toHaveCount(0);
    expect(await canvas.evaluate(node => node.isConnected)).toBe(false);
    await expect(dialogFor(page).locator('[data-geo-city-option]')).toHaveCount(3);
    await expect(dialogFor(page).locator('canvas')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(dialogFor(page)).toHaveCount(0);
    await expect(page.locator('.geo-hierarchy-map canvas')).toHaveCount(1);
});

test('all nine cities load real local basemaps and retain exactly three regional data rows', async ({page}, testInfo) => {
    const results = [];
    for (const country of countries) {
        await openCountry(page, country.id);
        for (const city of country.cities) {
            await test.step(`${country.id} / ${city}`, async () => {
                await openCity(page, city);
                const map = await expectRealBasemap(page, city);
                results.push({country: country.id, city, features: await featureCounts(map)});
                await dialogFor(page).getByRole('button', {name: 'Back', exact: true}).click();
                await expect(cityFor(page, city)).toHaveCount(0);
                await expect(dialogFor(page)).toHaveAttribute('data-geo-level', 'country');
                await expect(dialogFor(page).locator('[data-geo-city-option]')).toHaveCount(3);
            });
        }
        await page.keyboard.press('Escape');
    }
    await testInfo.attach('nine-city-live-basemaps.json', {body: JSON.stringify(results, null, 2), contentType: 'application/json'});
});

test('failed basemap is reported as error and retry loads real provider data', async ({page}) => {
    // Fault injection only tests the failure path. Successful rendering after
    // retry still uses the real provider and the same road/building gate.
    const failTiles = route => route.abort('failed');
    await page.route('https://tiles.openfreemap.org/**', failTiles);
    await openCountry(page, '392');
    await openCity(page, 'tokyo');
    await expect(cityFor(page, 'tokyo')).toHaveAttribute('data-geo-map-status', 'error', {timeout: 20_000});
    expect((await featureCounts(cityFor(page, 'tokyo'))).base).toBe(0);
    await expect(dialogFor(page).locator('[data-city-map-retry]')).toBeVisible();
    await page.unroute('https://tiles.openfreemap.org/**', failTiles);
    await dialogFor(page).locator('[data-city-map-retry]').click();
    await expectRealBasemap(page, 'tokyo');
    await page.keyboard.press('Escape');
    await expect(cityFor(page, 'tokyo')).toHaveCount(0);
    await expect(dialogFor(page)).toHaveCount(0);
});

test('closing during tile loading removes the city map and does not revive the popup', async ({page}) => {
    let release;
    const held = new Promise(resolve => {release = resolve;});
    const pending = [];
    const delayTiles = async route => {
        pending.push(route.request().url());
        await held;
        await route.abort('aborted').catch(() => {});
    };
    await page.route('https://tiles.openfreemap.org/**', delayTiles);
    try {
        await openCountry(page, '392');
        await openCity(page, 'tokyo');
        await expect(cityFor(page, 'tokyo')).toHaveAttribute('data-geo-map-status', 'loading');
        await expect.poll(() => pending.length).toBeGreaterThan(0);
        await page.keyboard.press('Escape');
        await expect(dialogFor(page)).toHaveCount(0);
        await expect(cityFor(page, 'tokyo')).toHaveCount(0);
        release();
        await page.unrouteAll({behavior: 'wait'});
        await expect(page.locator('.geo-hierarchy-map canvas')).toHaveCount(1);
        await page.locator('[data-country-id="410"]').click();
        await expect(dialogFor(page)).toHaveAttribute('data-geo-country', '410');
        await expect(dialogFor(page).locator('[data-geo-city-option]')).toHaveCount(3);
    } finally {
        release();
        await page.unrouteAll({behavior: 'wait'});
    }
});
