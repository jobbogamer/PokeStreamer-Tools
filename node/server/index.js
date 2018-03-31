import express from 'express';
import expressWS from 'express-ws';
import path from 'path';
import bodyParser from 'body-parser';
import jade from 'jade';
import sse from './sse';

import '../common/extensions';
import args from './args';
import API from './api';
import { NodeRoot } from './constants';
import Config from './config';
import SoulLink from './soul-link';

let port;
if (process.argv.includes('-d') || process.argv.includes('--debug')) {
    port = 'devServerPort';
    require('./webpack-spawner').default(50000);
} else if (process.argv.includes('-dp')) {
    port = 'devServerPort';
} else {
    port = 'port';
}

let app = express();
expressWS(app);
app.engine('jade', jade.__express);
app.set('view engine', 'jade');
app.use('/api', sse, bodyParser.json(), API.Router);
app.use('/icons', express.static(__dirname + '/../pokemon-icons'));
app.use(express.static(__dirname + '/../public'));

let server = app.listen(Config.server[port], Config.server.host, function() {
    console.info(`Listening on ${Config.server.host}:${Config.server[port]}`);
});

Config.on('update', (p, n) => {
    if (p.server[port] !== n.server[port] ||
        p.server.host !== n.server.host ||
        p.server.apiHost !== n.server.apiHost) {
        server.close(() => {
            console.log(`Closed server listening on ${Config.server.host}:${Config.server[port]}`);
        });

        server = app.listen(n.server[port], function() {
            console.log(`Listening on ${Config.server.host}:${Config.server[port]}`);
        });
    }
});