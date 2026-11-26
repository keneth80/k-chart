const {test, expect} = require('@playwright/test');

test.beforeEach(async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/');
    await expect(page.locator('#chart-div svg.kchart-svg')).toBeVisible({timeout:15000});
});

test('basic chart fits container after resize and tick labels do not overlap', async ({page}) => {
    await page.setViewportSize({width: 360, height: 740});
    const chart = page.locator('#chart-div');
    await chart.scrollIntoViewIfNeeded();
    await expect.poll(async () => chart.evaluate(el => {
        const svg = el.querySelector('svg');
        return svg.getBoundingClientRect().width <= el.clientWidth + 2;
    })).toBe(true);
    const overlaps = await chart.locator('.kchart-axis-bottom .tick text').evaluateAll(nodes => {
        const boxes = nodes.map(n => n.getBoundingClientRect()).filter(r => r.width > 0).sort((a,b) => a.left-b.left);
        return boxes.slice(1).some((box,index) => box.left < boxes[index].right - 1);
    });
    expect(overlaps).toBe(false);
});

test('legend is keyboard operable and exposes visibility', async ({page}) => {
    const item = page.locator('#chart-div .kchart-legend-item').first();
    await expect(item).toHaveAttribute('tabindex', '0');
    await item.focus();
    await item.press('Enter');
    await expect(page.locator('#chart-div .kchart-legend-item').first()).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#chart-div .kchart-legend-item').first().press('Space');
    await expect(page.locator('#chart-div .kchart-legend-item').first()).toHaveAttribute('aria-pressed', 'true');
});

test('light and dark chart text remain distinct', async ({page}, testInfo) => {
    for (const theme of ['light', 'dark']) {
        await page.locator(`[data-theme-option="${theme}"]`).click();
        const color = await page.locator('#chart-div .kchart-title').evaluate(el => getComputedStyle(el).fill);
        const channels = color.match(/[\d.]+/g).slice(0,3).map(Number);
        const average = channels.reduce((a,b) => a+b,0)/3;
        expect(theme === 'light' ? average < 140 : average > 170).toBe(true);
        await page.locator('#chart-div').screenshot({path: testInfo.outputPath(`${theme}.png`)});
    }
});

test('tooltip stays inside chart near the right edge', async ({page}) => {
    const chart = page.locator('#chart-div');
    await chart.scrollIntoViewIfNeeded();
    const overlay = chart.locator('.kchart-tooltip-overlay');
    await expect(overlay).toBeVisible();
    const point = chart.locator('g.demo-line-value-group circle').last();
    await expect(point).toBeVisible();
    const pointBox = await point.boundingBox();
    await page.mouse.move(pointBox.x + pointBox.width/2, pointBox.y + pointBox.height/2);
    const tooltip = chart.locator('.kchart-tooltip');
    await expect(tooltip).toHaveCSS('opacity','1');
    const bounds = await chart.boundingBox();
    const box = await tooltip.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);
    expect(box.y+box.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);
});

test('data tooltip supports keyboard navigation and Escape', async ({page}) => {
    const overlay = page.locator('#chart-div .kchart-tooltip-overlay');
    await expect(overlay).toHaveAttribute('tabindex','0');
    await overlay.focus();
    const tooltip = page.locator('#chart-div .kchart-tooltip');
    await expect(tooltip).toHaveAttribute('aria-hidden','false');
    await overlay.press('ArrowRight');
    await expect(tooltip).toHaveAttribute('aria-hidden','false');
    await overlay.press('Escape');
    await expect(tooltip).toHaveAttribute('aria-hidden','true');
});

test('touch can inspect a data point', async ({page}, testInfo) => {
    test.skip(!testInfo.project.use.hasTouch, 'Touch device project only');
    await page.locator('#chart-div').scrollIntoViewIfNeeded();
    const point = page.locator('#chart-div g.demo-line-value-group circle').last();
    await expect(point).toBeVisible();
    const box = await point.boundingBox();
    await page.touchscreen.tap(box.x+box.width/2, box.y+box.height/2);
    await expect(page.locator('#chart-div .kchart-tooltip')).toHaveAttribute('aria-hidden','false');
});

test('basic renderer switches leave no old canvas layers', async ({page}) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const example of ['canvas-line','column','line']) {
        if (await page.locator('#example-select').isVisible()) {
            await page.locator('#example-select').selectOption(example);
        } else {
            await page.locator(`[data-sidebar-example="${example}"]`).click();
        }
        await expect(page.locator('#chart-div svg.kchart-svg')).toHaveCount(1);
    }
    await expect(page.locator('#chart-div canvas')).toHaveCount(0);
    expect(errors).toEqual([]);
});
