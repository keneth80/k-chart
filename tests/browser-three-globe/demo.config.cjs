const path = require('node:path');
const {defineConfig} = require('../../packages/k-chart-three/node_modules/@playwright/test');
module.exports = defineConfig({
    testDir: __dirname,
    testMatch: ['demo.spec.cjs', 'geo-drilldown.spec.cjs', 'city-map.spec.cjs'],
    timeout: 30000,
    workers: 1,
    outputDir: '../../dist/globe-demo-results',
    use: {baseURL: 'http://127.0.0.1:9055', trace: 'retain-on-failure'},
    projects: [
        {name: 'desktop', use: {viewport: {width: 1280, height: 800}}},
        {name: 'mobile', use: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}}
    ],
    webServer: {
        command: 'node node_modules/webpack-dev-server/bin/webpack-dev-server.js --host 127.0.0.1 --port 9055 --mode development',
        cwd: path.resolve(__dirname, '../..'),
        url: 'http://127.0.0.1:9055', reuseExistingServer: false, timeout: 120000
    }
});
