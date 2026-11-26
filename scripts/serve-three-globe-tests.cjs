const path = require('node:path');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const HtmlPlugin = require('html-webpack-plugin');

const root = path.resolve(__dirname, '..');
const compiler = webpack({
    mode: 'development',
    context: root,
    entry: './tests/browser-three-globe/fixture.ts',
    devtool: false,
    output: {path: path.join(root, 'dist/globe-test'), filename: 'fixture.js'},
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            '@keneth80/k-chart$': path.join(root, 'src/index.ts'),
            'three$': path.join(root, 'packages/k-chart-three/node_modules/three/build/three.module.js')
        }
    },
    module: {rules: [{test: /\.ts$/, exclude: /node_modules/, use: {
        loader: 'ts-loader', options: {transpileOnly: true}
    }}]},
    plugins: [new HtmlPlugin({templateContent: '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Globe regression</title></head><body style="margin:0;background:#02040a"><div id="chart" style="width:100vw;height:100vh;position:relative"></div></body></html>'})]
});
const server = new WebpackDevServer({
    host: '127.0.0.1', port: Number(process.env.KCHART_GLOBE_TEST_PORT || 9051),
    hot: false, liveReload: false, client: {overlay: {warnings: false}},
    devMiddleware: {stats: 'errors-warnings'}
}, compiler);
server.start().catch(error => { console.error(error); process.exitCode = 1; });
