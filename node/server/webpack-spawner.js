import path from 'path';
import { spawn } from 'child_process';
// import findFreePort from 'find-free-port';
import { NodeRoot } from './constants';
import cleanupProcess from './cleanup-process';

function spawnWebpack(debugPort) {
    console.log('Spinning up webpack-dev-server...');
    let webpack = spawn('node', 
    // let webpack = spawn('webpack-dev-server', 
        [
            debugPort ? `--inspect=${debugPort}` : '',
            path.resolve(__dirname, '../node_modules/webpack-dev-server/bin/webpack-dev-server.js'),
            // debugPort ? "--port" : "", 
            // debugPort ? debugPort : "", 
        ],
        { 
            shell: true,
            env: process.env,
            cwd: NodeRoot,
            detached: false,
            windowsHide: false,
            stdio: 'pipe',
        });
    webpack.stdout.on('data', data => console.log(data.toString()));
    webpack.stderr.on('data', data => console.log(data.toString()));
    webpack.on('close', code => {
        console.error(`Webpack exited with error code ${code}.  Closing server.`);
        process.exit(code);
    });

    cleanupProcess(() => {
        if (!webpack.killed) {
            console.info("Killing webpack.");
            webpack.kill();
        }
    });
    
    console.info(`Webpack running on process ${webpack.pid}`);
    return webpack;
}

export default function () {
    if (process.argv.includes('-w') || process.argv.includes('--debug-webpack')) {
        // const findFreePort = require('find-free-port');
        // findFreePort().then(port => spawnWebpack(port));
        return Promise.resolve().then(() => spawnWebpack(50000));
    } else {
        return spawnWebpack();
    }
}