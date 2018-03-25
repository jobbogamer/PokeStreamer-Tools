import webpack from 'webpack';
import fs from 'fs';
import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
// import TidyHtmlWebpackPlugin from 'tidy-html-webpack-plugin';
import compileConfig from './common/configCompiler';

function genConfig(env, options) {
    const config = compileConfig(),
        isDevServer = path.basename(require.main.filename) === 'webpack-dev-server.js',
        isHot = isDevServer && options.hot;

    const NODE_ENV = (options.mode || process.env.NODE_ENV || 'production').trim(),
    isProd = NODE_ENV === 'production',
    isDev = !isProd,
    host = `${config.server.host}:${config.server.port}`;
    
    function addDevServer(entry) {
        let entries = [ entry ];
        
        if (isHot) {
            entry.push('webpack/hot/only-dev-server');
        }

        if (isDevServer) {
            entries.push(`webpack-dev-server/client?http://${host}`);            
        }
        
        return entries;
    }
    
    let webpackConfig = {
        entry: {
            index: addDevServer('./client/slot-display/index'),
            soullink: addDevServer('./client/soullink-manager/index'),
            vendors: [ "lodash" ],
            pokemonIcons: './client/soullink-manager/pokemon-icons',
        },
        
        output: {
            // filename: opt => opt.chunk.name === 'index' ? 'index.js' : '[name]/[name].js',
            filename: '[name]/index.js',
            path: path.resolve(__dirname, 'public'),
            publicPath: '/',
        },
        
        optimization: {
            minimize: isProd && !isHot, // for some reason, hot replacement of SASS isn't working in development mode
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        name: 'vendors',
                        minChunks: Infinity,
                    },
                    // pokemonIcons: {
                    //     name: 'pokemonIcons',
                    // }
                }
            },
        },
        
        resolve: {
            alias: {
                'config.json': path.resolve(__dirname, 'config.json'),
            }
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
                },
                // {
                //     test: /\.png$/,
                //     use: [
                //         'url-loader'
                //     ]
                // }
            ],
        },
        
        plugins: [],
        
        externals: [
            { jquery: '$' },
        ],
        
        devServer: {
            hot: isHot,
            overlay: true,
            index: 'index.htm',
            contentBase: path.join(__dirname, 'public'),
            host: config.server.host,
            port: config.server.port,
            allowedHosts: [
                `api.${config.server.host}`,
            ],
            proxy: {
                '/api': {
                    target: `http://api.${config.server.host}:${config.server.devServerPort}/`,
                    secure: false,
                    ws: true
                },
                // '/icons': {
                //     target: `http://${config.server.host}:${config.server.devServerPort}/`,
                //     secure: false,
                // }
            },
        }
    };
    
    function addPlugins(plugins) {
        for (let plugin of plugins) {
            webpackConfig.plugins.push(plugin);
        }
    }

    addPlugins([
        new webpack.DefinePlugin({
            NUM_SLOTS: 6,
            ENVIRONMENT: NODE_ENV,
            IS_HOT: isHot,
            ALL_IN_ONE: config.layout.allInOne,
            API_BASE_URL: `'api.${host}/api'`,
            LINKING_METHOD: `'${config.soulLink.linking.method}'`,
        }),
        new webpack.ProvidePlugin({
            _: 'lodash',
        }),
        new ExtractTextPlugin({ 
            filename: '[name]/style.css',
        }),
        new HtmlWebpackPlugin({
            template: '!!ejs-loader!./client/slot-display/index.ejs',
            filename: 'index.html',
            chunks: ['index'],
            inject: 'body',
            cache: true
        }),
        new HtmlWebpackPlugin({
            template: '!!ejs-loader!./client/soulLink-manager/index.ejs',
            filename: 'soullink/index.html',
            chunks: ['soullink'],
            inject: 'body',
            cache: true
        }),
        // new TidyHtmlWebpackPlugin({
        //     tabSize: 4,
        // }),
    ]);
        
    if (isDev || isHot) {
        addPlugins([
            new webpack.SourceMapDevToolPlugin({
                test: /\.js$|\.css$/,
                filename: '[file].map',
                publicPath: '/',
            }),
        ]);
    }
}

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
    
    return webpackConfig;
}

export default genConfig;