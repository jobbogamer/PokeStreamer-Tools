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
        // soulLinkManager: './client/soulLink.js'
    },
    
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'public'),
        publicPath: '/',
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
                exclude: [ /node_modules/, /^.*(hot-update).*$/ ],
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
            chunks: ['index'],
            inject: 'body',
            cache: true
        }),
        // new HtmlWebpackPlugin({
        //     template: '!!ejs-loader!./client/soulLink.ejs',
        //     filename: 'links.html',
        //     chunks: ['soulLinkManager'],
        //     inject: 'body',
        //     cache: true
        // }),
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
            '/api': {
                target: `http://${config.server.apiHost}:${config.server.devServerPort}/`,
                secure: false
            }
        },
    }
};

let nuzlocke = config.nuzlocke,
    soulLink = config.soulLink;
if (nuzlocke.deathSound && nuzlocke.deathSound.enabled) {
    const getSoundPath = function(soundFileName) {
        let p = path.resolve(__dirname, 'resources', soundFileName);
        if (fs.existsSync(p)) {
            return p;
        }

        console.warn(`Could not find specified sound file at '${p}'. Skipping.`);
        return null;
    };

    const copySounds = function(deathSounds) {
        if (deathSounds.constructor === String) {
            deathSounds = [ deathSounds ];
        }

        for (let soundPath of deathSounds) {
            soundPath = getSoundPath(soundPath);
            if (soundPath) {
                webpackConfig.plugins.push(
                    new CopyWebpackPlugin([{ 
                        from: soundPath,
                        to: `${path.parse(soundPath).base}`
                    }])
                );
            }
        }
    };

    copySounds(nuzlocke.deathSound.filePath);

    if (soulLink.deathSound && soulLink.deathSound.enabled && soulLink.deathSound.filePath) {
        copySounds(soulLink.deathSound.filePath);
    }
}

export default webpackConfig;