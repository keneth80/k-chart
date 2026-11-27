const {test, expect} = require('../../packages/k-chart-three/node_modules/@playwright/test');

test.beforeEach(async ({page}) => {
    test.setTimeout(60000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.__geoErrors = errors;
    await page.goto('/?example=geo-hierarchy');
    await expect(page.locator('.geo-hierarchy-map canvas')).toHaveCount(1);
});
test.afterEach(async ({page}) => expect(page.__geoErrors).toEqual([]));

const expectMapLayout = async dialog => {
    const layout = await dialog.evaluate(root => {
        const bounds = node => {
            const r = node.getBoundingClientRect();
            return {left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height};
        };
        return {header: bounds(root.querySelector('header')), map: bounds(root.querySelector('.geo-map')),
            svg: bounds(root.querySelector('.geo-map canvas,.geo-map>svg')), controls: bounds(root.querySelector('.geo-map>nav')),
            tileMap: !!root.querySelector('[data-geo-city-map]'),
            labelHeights: [...root.querySelectorAll('.geo-map [data-geo-texture-label],.geo-map text')].map(node => bounds(node).height).filter(height => height > 0)};
    });
    expect(layout.svg.height).toBeGreaterThan(100);
    expect(layout.svg.top).toBeGreaterThanOrEqual(layout.header.bottom - 1);
    expect(layout.svg.bottom).toBeLessThanOrEqual(layout.map.bottom + 1);
    expect(Math.abs(layout.svg.top - layout.map.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.svg.height - layout.map.height)).toBeLessThanOrEqual(1);
    expect(layout.controls.top).toBeGreaterThanOrEqual(layout.header.bottom);
    expect(layout.controls.left).toBeGreaterThanOrEqual(layout.map.left);
    expect(layout.controls.right).toBeLessThanOrEqual(layout.map.right);
    if (!layout.tileMap) {
        expect(layout.labelHeights.length).toBeGreaterThan(0);
        expect(Math.min(...layout.labelHeights)).toBeGreaterThanOrEqual(10);
    }
};

const installMotionRecorder = page => page.evaluate(() => {
    window.__geoMotion = [];
    document.addEventListener('animationstart', event => {
        const node = event.target;
        const dialog = node.closest?.('dialog[data-geo-drilldown]');
        if (!dialog) return;
        const kind = node === dialog ? 'dialog' : node.matches('.geo-content') ? 'content' : node.matches('aside') ? 'panel' : 'other';
        const animation = node.getAnimations().find(value => value.animationName === event.animationName);
        window.__geoMotion.push({
            kind, level: dialog.dataset.geoLevel, name: event.animationName,
            duration: animation?.effect?.getTiming().duration,
            frames: animation?.effect?.getKeyframes().map(frame => ({opacity: frame.opacity, transform: frame.transform})) || []
        });
    }, true);
});
const motionRecords = page => page.evaluate(() => window.__geoMotion || []);
const expectReadableDarkPopup = async dialog => {
    const colors = await dialog.evaluate(root => {
        const parse = value => {
            const values = value.match(/[\d.]+/g)?.map(Number) || [];
            return [values[0] || 0, values[1] || 0, values[2] || 0, values.length > 3 ? values[3] : 1];
        };
        const blend = (front, back) => front.slice(0, 3).map((value, i) => value * front[3] + back[i] * (1 - front[3]));
        const luminance = color => color.slice(0, 3).map(value => {
            value /= 255;
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
        const background = node => {
            const layers = [];
            for (let current = node; current; current = current.parentElement) {
                const color = parse(getComputedStyle(current).backgroundColor);
                layers.push(color);
                if (color[3] === 1) break;
            }
            return layers.reverse().reduce((back, front) => blend(front, back), [255, 255, 255]);
        };
        const nodes = [root, root.querySelector('h2'), root.querySelector('aside'),
            ...root.querySelectorAll('aside strong,aside p,aside li span,header button,nav button:not(:disabled)')].filter(Boolean);
        return {darkness: luminance(background(root)), contrast: nodes.map(node => {
            const bg = background(node);
            const fg = blend(parse(getComputedStyle(node).color), bg);
            const a = luminance(bg), b = luminance(fg);
            return {target: node.tagName, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)};
        })};
    });
    expect(colors.darkness).toBeLessThan(0.15);
    for (const entry of colors.contrast) expect(entry.ratio, `${entry.target} readable text contrast`).toBeGreaterThanOrEqual(4.5);
};

test('globe country picking opens cities, city picking zooms into regions, and back and Escape retain focus', async ({page}, testInfo) => {
    const canvas = page.locator('.geo-hierarchy-map canvas');
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    // The example starts over inland Korea, not over a country marker.
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    const dialog = page.locator('dialog[data-geo-drilldown]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-geo-country', '410');
    await expect(dialog.locator('[data-geo-city-option]')).toHaveCount(3);
    await expectMapLayout(dialog);
    const countryZoom = Number(await dialog.locator('.geo-earth-detail-map').getAttribute('data-geo-map-zoom'));
    await expect(dialog.locator('canvas')).toHaveCount(1);
    await dialog.locator('[data-geo-city-option="seoul"] button').click();
    await expect(dialog).toHaveAttribute('data-geo-level', 'city');
    await expect(dialog).toHaveAttribute('data-geo-city', 'seoul');
    await expect(dialog.locator('[data-geo-city-map]')).toHaveAttribute('data-geo-map-status', 'ready', {timeout: 45000});
    await expect(dialog.locator('[data-geo-region]')).toHaveCount(3);
    await expect(dialog.locator('[data-geo-region]')).toContainText(['Jongno', 'Gangnam', 'Mapo']);
    await expect(dialog.locator('[data-geo-region] button')).toHaveCount(0);
    const cityZoom = Number(await dialog.locator('[data-geo-map-zoom]').getAttribute('data-geo-map-zoom'));
    expect(cityZoom).toBeGreaterThan(countryZoom);
    await expectMapLayout(dialog);
    await dialog.getByRole('button', {name: 'Zoom in', exact: true}).click();
    expect(Number(await dialog.locator('[data-geo-map-zoom]').getAttribute('data-geo-map-zoom'))).toBeCloseTo(cityZoom * 1.5);
    await page.screenshot({path: testInfo.outputPath('geo-regions.png')});
    await dialog.getByRole('button', {name: 'Back', exact: true}).click();
    await expect(dialog).toHaveAttribute('data-geo-level', 'country');
    await expect(dialog.locator('[data-geo-city-option]')).toHaveCount(3);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    const korea = page.locator('[data-country-id="410"]');
    await korea.focus();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(korea).toBeFocused();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
});

test('SVG country picking shares the same hierarchy, supports disabling, and is removed on example changes', async ({page}, testInfo) => {
    await page.getByRole('button', {name: 'Country map', exact: true}).click();
    await expect(page.locator('.geo-hierarchy-map canvas')).toHaveCount(0);
    await page.waitForFunction(() => !!document.querySelector('.geo-hierarchy-map path.geo-hierarchy-countries'));
    const korea = await page.evaluate(() => {
        const path = [...document.querySelectorAll('.geo-hierarchy-map path.geo-hierarchy-countries')]
            .find(node => node.__data__.key === '410');
        const point = new DOMPoint(...path.__data__.centroid).matrixTransform(path.getScreenCTM());
        return {x: point.x, y: point.y};
    });
    await page.mouse.click(korea.x, korea.y);
    const dialog = page.locator('dialog[data-geo-drilldown]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('data-geo-country', '410');
    await dialog.locator('[data-geo-city-option="busan"] button').click();
    await expect(dialog).toHaveAttribute('data-geo-city', 'busan');
    await page.screenshot({path: testInfo.outputPath('geo-svg-city.png')});
    await page.keyboard.press('Escape');
    await page.getByRole('checkbox', {name: 'Location details'}).uncheck();
    await page.mouse.click(korea.x, korea.y);
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-country-id="410"]')).toBeDisabled();
    await page.getByRole('checkbox', {name: 'Location details'}).check();
    await page.locator('[data-country-id="392"]').click();
    await expect(dialog).toHaveAttribute('data-geo-country', '392');
    await page.keyboard.press('Escape');
    await page.selectOption('#example-select', 'line');
    await expect(page.locator('.geo-hierarchy-example')).toHaveCount(0);
    await expect(page.locator('dialog[data-geo-drilldown]')).toHaveCount(0);
    expect(await page.locator('style').filter({hasText: '::backdrop'}).count()).toBe(0);
});

test('dark popup has readable contrast and real motion replays on country, city and back', async ({page}, testInfo) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await installMotionRecorder(page);
    const countryButton = page.locator('[data-country-id="410"]');
    await countryButton.click();
    const dialog = page.locator('dialog[data-geo-drilldown]');
    await expect(dialog).toHaveAttribute('data-geo-theme', 'dark');
    await expect(dialog).toHaveAttribute('data-geo-animated', 'true');
    await expect.poll(async () => (await motionRecords(page)).filter(item => item.level === 'country' && item.kind !== 'other').length).toBeGreaterThanOrEqual(3);
    const first = await motionRecords(page);
    for (const [kind, duration] of [['dialog', 180], ['content', 160], ['panel', 200]]) {
        const record = first.find(item => item.kind === kind);
        expect(record, `${kind} must start a real CSS animation`).toBeTruthy();
        expect(record.duration).toBe(duration);
        const values = record.frames.map(frame => kind === 'panel' ? frame.transform : frame.opacity);
        expect(new Set(values.filter(value => value !== undefined)).size).toBeGreaterThan(1);
    }
    await expectReadableDarkPopup(dialog);
    await dialog.locator('[data-geo-city-option="seoul"] button').click();
    await expect.poll(async () => (await motionRecords(page)).filter(item => item.level === 'city' && ['content', 'panel'].includes(item.kind)).length).toBeGreaterThanOrEqual(2);
    await expect(dialog.locator('[data-geo-city-map]')).toHaveAttribute('data-geo-map-status', 'ready', {timeout: 45000});
    await expectReadableDarkPopup(dialog);
    await page.screenshot({path: testInfo.outputPath('geo-dark-city-motion.png')});
    const countryContentStarts = first.filter(item => item.level === 'country' && item.kind === 'content').length;
    await dialog.getByRole('button', {name: 'Back', exact: true}).click();
    await expect.poll(async () => (await motionRecords(page)).filter(item => item.level === 'country' && item.kind === 'content').length).toBeGreaterThan(countryContentStarts);
    const canvas = await dialog.locator('canvas').elementHandle();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await canvas.evaluate(node => node.isConnected)).toBe(false);
    await expect(page.locator('.geo-hierarchy-map canvas')).toHaveCount(1);
    await expect(countryButton).toBeFocused();
});

test('reduced motion disables popup animation and closing immediately disposes its map', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await installMotionRecorder(page);
    await page.locator('[data-country-id="392"]').click();
    const dialog = page.locator('dialog[data-geo-drilldown]');
    const expectNoMotion = async () => {
        const names = await dialog.evaluate(root => [root, root.querySelector('.geo-content'), root.querySelector('aside')]
            .map(node => getComputedStyle(node).animationName));
        expect(names).toEqual(['none', 'none', 'none']);
        expect((await motionRecords(page)).filter(item => item.kind !== 'other')).toEqual([]);
    };
    await expectNoMotion();
    await dialog.locator('[data-geo-city-option="tokyo"] button').click();
    await expect(dialog).toHaveAttribute('data-geo-city', 'tokyo');
    await expect(dialog.locator('[data-geo-region]')).toHaveCount(3);
    await expectNoMotion();
    const canvas = await dialog.locator('canvas').elementHandle();
    await dialog.getByRole('button', {name: 'Close', exact: true}).evaluate(node => node.click());
    await expect(dialog).toHaveCount(0);
    expect(await canvas.evaluate(node => node.isConnected)).toBe(false);
    await expect(page.locator('.geo-hierarchy-map canvas')).toHaveCount(1);
    await expect(page.locator('[data-country-id="392"]')).toBeFocused();
});
