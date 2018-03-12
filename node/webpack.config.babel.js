import webpack from 'webpack';
import fs from 'fs';
import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import Config from './server/config';

const config = Config.Current;

const NODE_ENV = (process.env.NODE_ENV || 'production').trim();

let webpackConfig = {
    entry: {
        app: './client/script.js',
    },
    
    output: {
        filename: 'script.js',
        path: path.resolve(__dirname, 'public')
    },

    optimization: {
        minimize: false,
    },
    
    resolveLoader: {
        alias: {
            'js-to-sass-loader': path.resolve(__dirname, 'webpack/js-to-sass-loader'),
            'remove-json-comments-loader': path.resolve(__dirname, 'webpack/remove-json-comments-loader')
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
                loader: 'remove-json-comments-loader',
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
        }),
        new webpack.ProvidePlugin({
            _: 'lodash',
        }),
        new ExtractTextPlugin({ filename: 'style.css' }),
        new HtmlWebpackPlugin({
            template: '!!ejs-loader!./client/index.ejs',
            filename: 'index.html',
            inject: 'body',
            cache: true,
        }),
        new webpack.SourceMapDevToolPlugin({
            test: /\.js$/,
            filename: '[file].map',
            publicPath: '/',
        })
    ],
    
    externals: [
        { jquery: '$' },
    ]
};

let nuzlocke = config.nuzlocke,
    soulLink = nuzlocke.soulLink;
if (nuzlocke.deathSound && nuzlocke.deathSound.enabled) {
    const getSoundPath = function(soundFileName) {
        let possiblePaths = [
            path.resolve(__dirname, 'resources', soundFileName),
            path.resolve(__dirname, soundFileName),
            path.resolve(soundFileName)
        ];

        for (let p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    };
    
    let soundPath = getSoundPath(nuzlocke.deathSound.filePath);
    if (soundPath) {
        webpackConfig.plugins.push(
            new CopyWebpackPlugin([{ 
                from: soundPath,
                to: `${path.parse(nuzlocke.deathSound.filePath).base}`
            }])
        );
    }

    if (soulLink.deathSound && 
        soulLink.deathSound.enabled &&
        soulLink.deathSound.filePath) {
        soundPath = getSoundPath(soulLink.deathSound.filePath);
        if (soundPath) {
            webpackConfig.plugins.push(
                new CopyWebpackPlugin([{ 
                    from: soundPath,
                    to: `${path.parse(soulLink.deathSound.filePath).base}`
                }])
            );
        }
    }
}

module.exports = webpackConfig;