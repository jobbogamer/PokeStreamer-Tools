import path from 'path';
import { spawn } from 'child_process';
import { Paths } from './constants';
import cleanupProcess from './cleanup-process';

const { NodeRoot } = Paths;

function spawnWebpack(debugPort) {
    console.log('Spinning up webpack-dev-server...');
    let webpack = spawn('node', 
        [
            `--inspect=50000`,
            `"${path.join(__dirname, '../node_modules/webpack-dev-server/bin/webpack-dev-server.js')}"`,
            '--mode', 'development',
            '--hot',
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

export default spawnWebpack;