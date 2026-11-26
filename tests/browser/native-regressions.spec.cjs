const path = require('node:path');
const {test, expect} = require('@playwright/test');

test('intrinsic padded resize, navigator spacing, and shared canvas ownership', async ({page}) => {
    await page.setContent('<!doctype html><div id="chart"></div>');
    await page.addScriptTag({path: path.resolve(__dirname, '../../.browser-fixture/runtime.js')});
    const result = await page.evaluate(async () => {
        const host = document.querySelector('#chart');
        const {createKChart, destroyCanvasByClass} = window.KChartFixture;
        const base = {selector:host,data:[],axes:[],series:[],legend:{visible:false},grid:{visible:false}};
        host.style.cssText = 'width:600px;padding:10px';
        let chart = createKChart(base).render();
        const heights = [];
        for (let index=0; index<8; index++) {
            await new Promise(requestAnimationFrame);
            heights.push(chart.getState().size.height);
        }
        chart.destroy();
        host.style.cssText = 'width:640px;height:400px';
        chart = createKChart({...base,width:640,height:400,
            data:[{x:0,y:1},{x:1,y:2}],
            axes:[{field:'x',type:'number',placement:'bottom'},{field:'y',type:'number',placement:'left'}],
            series:[{selector:'a',xField:'x',yField:'y',render(){}}],
            legend:{placement:'bottom'},rangeNavigator:{visible:true}
        }).render();
        const legend = host.querySelector('.kchart-legend').getBoundingClientRect();
        const navigator = host.querySelector('.kchart-range-navigator-background').getBoundingClientRect();
        const overlap = legend.top < navigator.bottom && legend.bottom > navigator.top;
        chart.destroy();
        let cached;
        let destroyed = 0;
        const removed = {selector:'removed',render({getCanvas}){getCanvas('shared');},
            destroy({svg}){destroyCanvasByClass(svg.node(),'kchart-2d-canvas-shared');}};
        const retained = {selector:'retained',render({getCanvas}){cached ??= getCanvas('shared');},destroy(){destroyed++;}};
        chart = createKChart({...base,width:640,height:400,series:[removed,retained]}).render();
        chart.updateSeries([retained]);
        const shared = {connected:cached.isConnected,count:host.querySelectorAll('canvas').length,destroyed};
        chart.destroy();
        return {heights,overlap,shared};
    });
    expect(new Set(result.heights).size).toBe(1);
    expect(result.overlap).toBe(false);
    expect(result.shared).toEqual({connected:true,count:1,destroyed:0});
});
