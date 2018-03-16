import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import jade from 'jade';
import sse from './sse';
import useragent from 'useragent';
import { spawn } from 'child_process';

import './extensions';
import { getLocaleString } from './helpers';
import args from './args';
import Config from './config';
import Pokemon from './pokemon/pokemon';
import PokemonImages from './pokemon/pokemon-images';
import Slot from './slot';
import SoulLink from './soul-link';

let port, webpack;
if (args.isDebug) {
    port = 'devServerPort';

    console.info('Spinning up webpack-dev-server...');
    // for reasons surpassing understanding, hot swapping styles with my current code only works when mode is production
    webpack = spawn(path.normalize('node_modules/.bin/webpack-dev-server'), [ '--mode', 'production' ],
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
        console.error(`Webpack exited with error code ${code}.  Closing server.`);
        process.exit(code);
    });
    
    console.info(`Webpack running on process ${webpack.pid}`);
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

function assertGeneration(luaGen) {
    if (parseInt(luaGen) !== Config.Current.generation) {
        console.error(`Generation mismatch: Lua is running gen ${luaGen}.  Node is running gen ${Config.Current.generation}.`);
    }
}

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

    conn.slot = slot;
    connections.add(conn);

    req.on('close', (function () {
        console.log(`Connection initialized at ${conn.time} closed.`);
        connections.delete(this);
        console.log(`Remaining open connections: ${connections.size}`);
    }).bind(conn));

    console.log(`Open connections: ${connections.size}`);
    next();
});

app.get(/^\/api\/reset$/i, function (req, res, next) {
    assertGeneration(req.header('Pokemon-Generation'));

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
            conn.res.sseSend(slots[conn.slot]);
        }

        sentTo++;
    }

    console.log(`Sent empty slots to ${sentTo} connections`);    
    res.sendStatus(200);
});

app.post(/^\/api\/update$/i, function (req, res, next) {
    console.info(`Received update on from Lua script:\n${JSON.stringify(req.body, null, 2)}`);
    let hadError = false;
    assertGeneration(req.header('Pokemon-Generation'));

    for (let data of req.body) {
        let { slot, box, changeId, pokemon } = data,
            { species, alternateForm, shiny, female } = pokemon,
            isReal = species > 0,
            slotData;
        slot--;
        box && box--;

        if (!isReal) {
            slotData = slots[slot] = Slot.empty(slot, changeId);
        } else if (PokemonImages.get(species)) {
            let pkmn = new Pokemon(
                pokemon.otid,
                pokemon.otsid,
                '',
                pokemon.locationMet,
                species, 
                alternateForm,
                pokemon.nickname,
                pokemon.level,
                !pokemon.living,
                female,
                shiny,
                pokemon.levelMet
            );
            slotData = slots[slot] = new Slot(
                slot,
                changeId,
                pkmn);
        }

        hadError = hadError || !slotData;
    }

    if (!hadError) {
        res.sendStatus(200);
        next();

        let sentTo = 0;
        for (let conn of connections) {
            if (conn.res.connection.destroyed) {
                continue;
            }

            sentTo++;
            if (conn.slot === 'all') {
                conn.res.sseSend(slots);
            } else if (slots[conn.slot]) {
                conn.res.sseSend(slots[conn.slot]);
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
}, 2000);

let server = app.listen(Config.Current.server[port], Config.Current.server.host, function() {
    console.info(`Listening on ${Config.Current.server.host}:${Config.Current.server[port]}`);
});

Config.on('update', e => {
    if (e.prev.server[port] !== e.next.server[port] ||
        e.prev.server.host !== e.next.server.host ||
        e.prev.server.controlPanelHost !== e.next.server.controlPanelHost) {
        server.close(() => {
            console.log(`Closed server listening on ${Config.Current.server.host}:${Config.Current.server[port]}`);
        });

        server = app.listen(e.next.server[port], function() {
            console.log(`Listening on ${Config.Current.server.host}:${Config.Current.server[port]}`);
        });
    }
});

if (SoulLink.Enabled) {
    SoulLink.init();
}