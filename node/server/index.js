import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import jade from 'jade';
import sse from './sse';
import useragent from 'useragent';

import './extensions';
import { getLocaleString } from './helpers';
import args from './args';
import { NodeRoot } from './constants';
import Config from './config';
import Pokemon from './pokemon/pokemon';
import PokemonImages from './pokemon/pokemon-images';
import Slot from './slot';
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

let connections = new Set(),
    slots,
    boxes;

function initSlots() {
    slots = [];
    for (let i = 0; i < 6; i++) {
        slots.push(Slot.empty(i));
    }

    boxes = [];
    for (let i = 0; i < 18; i++) {
        boxes.push([]);
        for (let j = 0; j < 30; j++) {
            boxes[i].push(Slot.emptyBox(i, j));
        }
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
    // console.info(`Received update on from Lua script:\n${JSON.stringify(req.body, null, 2)}`);
    let hadError = false, needToSendUpdate = false;
    assertGeneration(req.header('Pokemon-Generation'));

    for (let data of req.body) {
        let { slot, box, changeId, pokemon } = data,
            { species, alternateForm, shiny, female } = pokemon,
            isBox = !!box,
            isReal = species > 0,
            slotData;
        slot--;
        box && box--;

        needToSendUpdate = needToSendUpdate || !isBox;

        if (!isReal) {
            if (isBox) {
                boxes[box][slot] = Slot.emptyBox(box, slot, changeId);
            } else {
                slotData = slots[slot] = Slot.empty(slot, changeId);
            }
        } else if (PokemonImages.get(species)) {
            let pkmn = new Pokemon(
                pokemon.otid,
                pokemon.otsid,
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
            if (isBox) {
                boxes[slot][box] = new Slot(slot, changeId, pkmn, box);
            } else {
                slotData = slots[slot] = new Slot(slot, changeId, pkmn);
            }
        }

        hadError = hadError || !isBox && !slotData;
    }

    if (!hadError) {
        res.sendStatus(200);
        next();

        if (!needToSendUpdate) {
            console.log('Received box info.');
        }

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

if (SoulLink.Enabled) {
    SoulLink.init();
}