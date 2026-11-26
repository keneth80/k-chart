const path = require('node:path');
const {defineConfig} = require('../../packages/k-chart-three/node_modules/@playwright/test');
const port = Number(process.env.KCHART_GLOBE_TEST_PORT || 9051);

module.exports = defineConfig({
    testDir: __dirname,
    testMatch: 'globe.spec.cjs',
    timeout: 30000,
    workers: 1,
    outputDir: '../../dist/globe-test-results',
    use: {baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure'},
    projects: [
        {name: 'desktop', use: {viewport: {width: 1280, height: 800}}},
        {name: 'mobile', use: {viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true}}
    ],
    webServer: {
        command: 'node scripts/serve-three-globe-tests.cjs',
        cwd: path.resolve(__dirname, '../..'),
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: false,
        timeout: 120000
    }
});
