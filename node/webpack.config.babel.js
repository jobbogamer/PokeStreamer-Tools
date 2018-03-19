import webpack from 'webpack';
import fs from 'fs';
import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import compileConfig from './common/configCompiler';

const config = compileConfig(),
    isHot = path.basename(require.main.filename) === 'webpack-dev-server.js';

const NODE_ENV = (process.env.NODE_ENV || 'production').trim();

let webpackConfig = {
    entry: {
        index: './client/index.js',
    },
    
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'public'),
        hotUpdateChunkFilename: 'hot/hot-update.js',
        hotUpdateMainFilename: 'hot/hot-update.json',
    },

    optimization: {
        minimize: false,
    },
    
    resolveLoader: {
        alias: {
            'js-to-sass-loader': path.resolve(__dirname, 'webpack/js-to-sass-loader'),
            'config-compiler-loader': path.resolve(__dirname, 'webpack/config-compiler-loader')
        }
    },
    
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },
            {
                test: /\.json$/,
                exclude: /node_modules/,
                loader: 'config-compiler-loader',
            },
            {
                test: /\.s[ca]ss$/,
                exclude: /node_modules/,
                use: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: [
                        { loader: 'css-loader' },
                        { loader: 'sass-loader' },
                        { loader: 'js-to-sass-loader' },
                    ]
                }),
            },
            {
                test: /\.ejs$/,
                loader: 'ejs-loader',
            }
        ],
    },
    
    plugins: [
        new webpack.DefinePlugin({
            NUM_SLOTS: 6,
            ENVIRONMENT: NODE_ENV,
            IS_HOT: isHot,
            ALL_IN_ONE: config.layout.allInOne,
            API_BASE_URL: `'${config.server.apiHost}:${config.server.port}/api'`,
        }),
        new webpack.ProvidePlugin({
            _: 'lodash',
        }),
        new ExtractTextPlugin({ 
            filename: 'style.css',
        }),
        new HtmlWebpackPlugin({
            template: '!!ejs-loader!./client/index.ejs',
            filename: 'index.html',
            inject: 'body',
            cache: true
        }),
        new webpack.SourceMapDevToolPlugin({
            test: /\.js$|\.css$/,
            filename: '[file].map',
            publicPath: '/',
        }),
        new webpack.HotModuleReplacementPlugin(),
    ],
    
    externals: [
        { jquery: '$' },
    ],

    devServer: {
        hot: true,
        overlay: true,
        index: 'index.html',
        contentBase: path.join(__dirname, 'public'),
        host: config.server.host,
        port: config.server.port,
        allowedHosts: [
            config.server.apiHost,
        ],
        proxy: {
            '/api': `http://${config.server.apiHost}:${config.server.devServerPort}/`,
        },
    }
};

if (config.nuzlocke.deathSound && config.nuzlocke.deathSound.enabled) {
    let soundFileName = config.nuzlocke.deathSound.filePath,
    possiblePaths = [
        path.resolve(__dirname, 'resources', soundFileName),
        path.resolve(__dirname, soundFileName),
        path.resolve(soundFileName)
    ],
    soundPath = null;
    
    for (let p of possiblePaths) {
        if (fs.existsSync(p)) {
            soundPath = p;
            break;
        }
    }
    
    if (soundPath) {
        webpackConfig.plugins.push(
            new CopyWebpackPlugin([{ 
                from: soundPath,
                to: `${config.nuzlocke.deathSound.filePath}`
            }])
        );
    }
}

module.exports = webpackConfig;