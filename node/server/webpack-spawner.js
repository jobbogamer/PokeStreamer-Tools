import path from 'path';
import { spawn } from 'child_process';
// import findFreePort from 'find-free-port';
import { NodeRoot } from './constants';

function spawnWebpack(debugPort) {
    console.log('Spinning up webpack-dev-server...');
    let webpack = spawn('node', 
        [
            debugPort ? `--inspect=${debugPort}` : '',
            path.resolve(__dirname, '../node_modules/webpack-dev-server/bin/webpack-dev-server.js'),
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