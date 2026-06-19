'use strict';

const { merge } = require('webpack-merge');

const commonConfig = require('./webpack.config.common');
const helpers      = require('./helpers');

module.exports = merge(commonConfig, {
    mode: 'development',

    devtool: 'eval-cheap-module-source-map',

    output: {
        path: helpers.root('dist'),
        publicPath: '/',
        filename: '[name].bundle.js',
        chunkFilename: '[id].chunk.js'
    },

    optimization: {
        emitOnErrors: false
    },

    devServer: {
        allowedHosts: ['localhost', '127.0.0.1'],
        historyApiFallback: true,
        devMiddleware: {
            stats: 'minimal'
        },
        client: {
            webSocketURL: 'auto://0.0.0.0:0/ws'
        }
    }
});
