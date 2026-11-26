const {defineConfig} = require('@playwright/test');
const port = Number(process.env.KCHART_TEST_PORT || 9047);

module.exports = defineConfig({
    testDir: './tests/browser',
    timeout: 30000,
    workers: 2,
    use: {baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure'},
    projects: [
        {name: 'desktop', use: {viewport: {width: 1280, height: 800}}},
        {name: 'mobile', use: {viewport: {width: 360, height: 740}, isMobile: true, hasTouch: true}}
    ],
    webServer: {
        // Dependency build warnings stay in the console without blocking real input.
        command: `node node_modules/webpack-dev-server/bin/webpack-dev-server.js --host 127.0.0.1 --port ${port} --mode development --no-client-overlay-warnings`,
        url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 120000
    }
});
