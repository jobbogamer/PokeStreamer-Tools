import express from 'express';
import bodyParser from 'body-parser';
import jade from 'jade';
import sse from './sse';

import './extensions';
import config from './parsed-config';
import PokemonTable from './pokemon-table-gen1-3';
import PokemonImages from './pokemon-images';
import Slot from './slot';

let app = express();
app.engine('jade', jade.__express);
app.set('view engine', 'jade');
app.use(express.static(__dirname + '/../public'));
app.use(sse);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let connections = new Set(),
    slots = [];

for (let i = 0; i < 6; i++) {
    slots.push(Slot.empty(i));
}

app.get(/^\/slot\/([1-6]|all)$/i, function (req, res, next) {
    res.sseSetup();

    let slot;
    if (req.params[0] === 'all') {
        slot = 'all';
        console.log(`Acquired connection for all slots`);

        res.sseSend(slots);
    } else {
        slot = parseInt(req.params[0]) - 1;
        console.log(`Acquired connection for slot ${slot}`);
        
        res.sseSend(slots[slot]);
    }

    let conn = { slot: slot, res: res };
    connections.add(conn);

    console.log(`Number of open connections: ${connections.size}`);
    next();
});

app.get(/^\/reset$/i, function (req, res, next) {
    console.log('Sending reset to all slot connections');
    for (let conn of connections) {
        conn.res.sseSend('reset');
    }

    res.sendStatus(200);
});

app.post(/^\/update\/([1-6])$/i, function (req, res, next) {
    console.log(`Received update from Lua script: ${JSON.stringify(req.body)}`);
    let slot = parseInt(req.params[0]) - 1,
        data = req.body,
        species = data.species.toString(),
        isReal = species !== '-1',
        prefix = data.shiny !== 'false' ? 'shiny' : 'base',
        sData;

    if (!isReal) {
        sData = slots[slot] = Slot.empty(slot, data.changeId);
    } else if (PokemonImages[prefix][species]) {
        sData = slots[slot] = new Slot(
            slot,
            JSON.parse(data.changeId),
            PokemonTable[parseInt(species)], 
            data.nickname,
            JSON.parse(data.level), 
            PokemonImages[prefix][species], 
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

app.listen(config.server.port, function() {
    console.log(`Listening on port ${config.server.port}`);
});