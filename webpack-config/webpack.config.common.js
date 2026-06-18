const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebPackPlugin      = require('html-webpack-plugin');
const BundleAnalyzerPlugin   = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
// const htmlWebpackInjectStringPlugin = require('html-webpack-inject-string-plugin');

const helpers = require('./helpers');
 
module.exports = {
    entry: './src/main.ts',
    resolve: {
        extensions: ['.js', '.ts', '.json']
    },
    devtool: 'inline-source-map',
    devServer: {
        hot: true
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /node_modules/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true
                    }
                }
            },
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        sourceType: 'unambiguous',
                        presets: ['@babel/preset-env']
                    }
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            },
            {
                test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                type: 'asset/inline'
            },
            {
                test: /\.(txt|csv|svg)$/,
                type: 'asset/resource'
            }
        ]
    },
    plugins: [
        new CleanWebpackPlugin(),

        new HtmlWebPackPlugin({
            template: './src/index.html',
            filename: './index.html'
        }),

        new CopyWebpackPlugin({
            patterns: [
                { from: helpers.root('src/assets/image'), to: 'assets/image', noErrorOnMissing: true },
                { from: helpers.root('src/docs'), to: 'docs', noErrorOnMissing: true }
            ]
        }),

        new webpack.HotModuleReplacementPlugin(),

        // new BundleAnalyzerPlugin(
        //     {
        //         analyzerMode: "static",               // 분석결과를 파일로 저장
        //         reportFilename: "dist/stats.html", // 분설결과 파일을 저장할 경로와 파일명 지정
        //         defaultSizes: "parsed",
        //         openAnalyzer: false,                   // 웹팩 빌드 후 보고서파일을 자동으로 열지 여부
        //         generateStatsFile: true,              // 웹팩 stats.json 파일 자동생성
        //         statsFilename: "dist/stats.json", // stats.json 파일명 rename
        //     }
        // )
    ]
};
