// react-native-web in a webpack app: the alias, `.web.*` files first, TypeScript through Babel.
const path = require('node:path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: './web/main.tsx',
    output: { path: path.resolve(__dirname, 'dist'), clean: true },
    resolve: {
        extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'],
        alias: { 'react-native$': 'react-native-web' },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-react', { runtime: 'automatic' }],
                            '@babel/preset-typescript',
                        ],
                    },
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            templateContent:
                '<!doctype html><html><head><meta charset="UTF-8"><title>Consumer</title></head>' +
                '<body><div id="root" style="height: 100vh"></div></body></html>',
        }),
        new webpack.DefinePlugin({ __DEV__: 'false' }),
    ],
    performance: { hints: false },
};
