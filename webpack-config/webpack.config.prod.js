'use strict';

const { merge } = require('webpack-merge');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

const commonConfig = require('./webpack.config.common');
const helpers = require('./helpers');

module.exports = merge(commonConfig, {
    mode: 'production',

    output: {
        path: helpers.root('dist'),
        publicPath: '/',
        filename: '[name].[contenthash:8].js',
        chunkFilename: '[name].[contenthash:8].chunk.js'
    },

    optimization: {
        emitOnErrors: false,
        splitChunks: {
            cacheGroups: {
                cesium: {
                  test: /[\\/]node_modules[\\/](?:@cesium|cesium)[\\/]/,
                  name: 'cesium',
                  chunks: 'async',
                  priority: 20,
                  enforce: true
                },
                commons: {
                  test: /[\\/]node_modules[\\/]/,
                  name: 'vendors',
                  chunks: 'initial',
                  priority: 10
                }
            }
        },
        runtimeChunk: 'single',
        minimizer: [
            new TerserPlugin({
                parallel: true,
                terserOptions: {
                    compress: {
                        unused: true,
                    },
                    ecma: 6,
                    mangle: true,
                },
            }),
            new CssMinimizerPlugin()
        ]
    }
});
