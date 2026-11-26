const {test, expect} = require('../../packages/k-chart-three/node_modules/@playwright/test');

test('Earth controls fit their own space and retain toggle state across projections and resize', async ({page}, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('[data-sidebar-example="three-globe"]').click();
    const controls = page.locator('.three-globe-controls');
    const rotation = controls.locator('input[type="checkbox"]');
    await expect(rotation).toBeChecked();
    await rotation.uncheck();
    for (const width of [testInfo.project.use.viewport.width, 480, 390]) {
        await page.setViewportSize({width, height: 844});
        await expect(rotation).not.toBeChecked();
        await expect.poll(() => page.locator('#chart-div').evaluate(host => {
            const canvas = host.querySelector('canvas').getBoundingClientRect();
            const controls = host.querySelector('.three-globe-controls').getBoundingClientRect();
            const bounds = host.getBoundingClientRect();
            return canvas.bottom <= controls.top && controls.left >= bounds.left && controls.right <= bounds.right;
        })).toBe(true);
        const boxes = await controls.locator('button,label,output').evaluateAll(nodes => nodes.map(node => {
            const r = node.getBoundingClientRect();
            return {left:r.left,top:r.top,right:r.right,bottom:r.bottom};
        }));
        for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
            const first = boxes[a];
            const second = boxes[b];
            expect(first.right <= second.left || second.right <= first.left
                || first.bottom <= second.top || second.bottom <= first.top).toBe(true);
        }
    }
    await controls.getByRole('button', {name:'World map', exact:true}).click();
    await expect(rotation).toBeDisabled();
    await controls.getByRole('button', {name:'Globe', exact:true}).click();
    await expect(rotation).toBeEnabled();
    await expect(rotation).not.toBeChecked();
    await rotation.check();
    await expect(rotation).toBeChecked();
    await rotation.uncheck();
    await expect(controls.locator('output')).not.toContainText('Axial rotation');
    await expect(page.locator('#chart-div canvas')).toHaveCount(1);
    await page.screenshot({path:testInfo.outputPath('earth-controls.png')});
    expect(errors).toEqual([]);
});
