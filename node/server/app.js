import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import jade from 'jade';
import sse from './sse';
import useragent from 'useragent';
import { spawn } from 'child_process';

import { getLocaleString } from './helpers';
import './extensions';
import Config from './config';
import PokemonImages from './pokemon-images';
import Slot from './slot';

let port, webpack;
if (process.env.NODE_ENV === 'development' || process.argv.includes('-d') || process.argv.includes('--debug')) {
    port = 'devServerPort';

    console.log('Spinning up webpack-dev-server...');
    webpack = spawn('node_modules\\.bin\\webpack-dev-server', [],
        { 
            shell: true,
            env: process.env,
            cwd: path.resolve(__dirname, '..'),
            detached: false,
            windowsHide: false,
            stdio: 'pipe',
        });
    webpack.stdout.on('data', data => console.log(data.toString()));
    webpack.stderr.on('data', data => console.log(data.toString()));
    webpack.on('close', code => {
        console.log(`Webpack exited with error code ${code}.  Closing server.`);
        process.exit(code);
    });
    
    console.log(`Webpack running on process ${webpack.pid}`);
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

let connections = new Set(),
    slots;

function initSlots() {
    slots = [];
    for (let i = 0; i < 6; i++) {
        slots.push(Slot.empty(i));
    }
}

initSlots();

app.get(/^\/api\/slot\/([1-6]|all)$/i, function (req, res, next) {
    res.sseSetup();

    let locale = getLocaleString(req),
        slot, 
        conn = {
            userAgent: useragent.parse(req.headers['user-agent']).toAgent(),
            time: new Date().toLocaleTimeString(locale),
            res: res,
        };
    if (req.params[0] === 'all') {
        slot = 'all';
        console.log(`Acquired connection for all slots at ${conn.time}.  User-agent: ${conn.userAgent}.`);

        res.sseSend(slots);
    } else {
        slot = parseInt(req.params[0]) - 1;
        console.log(`Acquired connection for slot ${slot} at ${conn.time}.  User-agent: ${conn.userAgent}.`);
        
        res.sseSend(slots[slot]);
    }

    conn[slot] = slot;
    connections.add(conn);

    req.on('close', (function () {
        console.log(`Connection initialized at ${conn.time} closed.`);
        connections.delete(this);
    }).bind(conn));

    console.log(`Number of open connections: ${connections.size}`);
    next();
});

app.get(/^\/api\/reset$/i, function (req, res, next) {
    console.log('Sending reset to all slot connections');
    let sentTo = 0;
    for (let conn of connections) {
        conn.res.sseSend('reset');
        sentTo++;
    }

    console.log(`Sent reset to ${sentTo} connections`);

    initSlots();

    console.log('Sending empty slots to all connections');
    sentTo = 0;
    for (let conn of connections) {
        if (conn.slot === 'all') {
            conn.res.sseSend(slots);
        } else {
            // kind of silly to send the indexed slot when they are all identical, but meh... this is resilient to 
            // possible future changes
            conn.res.sseSend(slot[conn.slot]);
        }

        sentTo++;
    }

    console.log(`Sent empty slots to ${sentTo} connections`);    
    res.sendStatus(200);
});

app.post(/^\/api\/update\/([1-6])$/i, function (req, res, next) {
    let slot = parseInt(req.params[0]) - 1,
        data = req.body,
        species = data.species,
        isReal = species !== '-1',
        shiny = !!parseInt(data.shiny),
        female = !!parseInt(data.female),
        sData;
    console.log(`Received update on slot ${slot + 1} from Lua script: ${JSON.stringify(req.body)}`);

    if (!isReal) {
        sData = slots[slot] = Slot.empty(slot, data.changeId);
    } else if (PokemonImages[species]) {
        sData = slots[slot] = new Slot(
            slot,
            JSON.parse(data.changeId),
            species,
            data.nickname,
            JSON.parse(data.level), 
            PokemonImages[species].getImage(female, shiny),
            JSON.parse(data.dead));
    }

    if (sData) {
        res.sendStatus(200);
        next();

        let sentTo = 0,
            deadConnections = 0;
        for (let conn of connections) {
            if (conn.slot === slot || conn.slot === 'all') {
                sentTo++;
                conn.res.sseSend(slots[slot]);
            }
        }

        console.log(`Sent update to ${sentTo} open connections.`);
    } else {
        res.sendStatus(400);
        next();
    }
});

setInterval(() => {
    let deadConnections = 0;
    for (let conn of connections) {
        if (conn.res.connection.destroyed) {
            deadConnections++;
            connections.delete(conn);
        }
    }

    if (deadConnections) {
        console.log(`Removed ${deadConnections} dead connections.`);
    }
}, 5000);

let server = app.listen(Config.Current.server[port], function() {
    console.log(`Listening on port ${Config.Current.server[port]}`);
});

Config.on('update', e => {
    if (e.prev.server[port] !== e.next.server[port]) {
        server.close(() => {
            console.log(`Closed server listening on port ${e.prev.server[port]}`);
        });

        server = app.listen(e.next.server[port], function() {
            console.log(`Listening on port ${e.next.server[port]}`);
        });
    }
});