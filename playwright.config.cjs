const {defineConfig} = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/browser',
    timeout: 30000,
    workers: 2,
    use: {baseURL: 'http://127.0.0.1:9003', trace: 'retain-on-failure'},
    projects: [
        {name: 'desktop', use: {viewport: {width: 1280, height: 800}}},
        {name: 'mobile', use: {viewport: {width: 360, height: 740}, isMobile: true, hasTouch: true}}
    ],
    webServer: {command: 'npm run dev', url: 'http://127.0.0.1:9003', reuseExistingServer: !process.env.CI, timeout: 120000}
});
