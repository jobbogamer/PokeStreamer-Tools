import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import jade from 'jade';
import sse from './sse';

import args from './args';
import API from './api';
import { NodeRoot } from './constants';
import Config from './config';
import SoulLink from './soul-link';

let port;
if (process.argv.includes('-d') || process.argv.includes('--debug')) {
    port = 'devServerPort';
    require('./webpack-spawner').default(50000);
} else {
    port = 'port';
}

let app = express();
app.engine('jade', jade.__express);
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/../public'));
app.use(sse);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

API.init(app);

let server = app.listen(Config.Current.server[port], Config.Current.server.host, function() {
    console.info(`Listening on ${Config.Current.server.host}:${Config.Current.server[port]}`);
});

Config.on('update', e => {
    if (e.prev.server[port] !== e.next.server[port] ||
        e.prev.server.host !== e.next.server.host ||
        e.prev.server.apiHost !== e.next.server.apiHost) {
        server.close(() => {
            console.log(`Closed server listening on ${Config.Current.server.host}:${Config.Current.server[port]}`);
        });

        server = app.listen(e.next.server[port], function() {
            console.log(`Listening on ${Config.Current.server.host}:${Config.Current.server[port]}`);
        });
    }
});

console.debug(`Running generation ${Config.Current.generation}`);