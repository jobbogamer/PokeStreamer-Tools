import useragent from 'useragent';
import EventEmitter from 'events';

import { getLocaleString } from './helpers';
import { CleanConnectionIntervalMS } from './constants';
import Config from './config';
import Pokemon from './pokemon/pokemon';
import Slot from './slot/slot';
import SlotManager from './slot/slot-manager';
import SoulLink from './soul-link';

let connections = new Set(),
    dirtySlots = false;

class API extends EventEmitter {
    constructor() {
        super();
    }
    
    init(app) {
        app.get(/^\/api\/slot\/([1-6]|all)$/i, getSlot);
        app.get(/^\/api\/reset$/i, reset);
        app.post(/^\/api\/update$/i, update);
        
        setInterval(cleanDeadConnections, 2000);
    }
}

function cleanDeadConnections() {
    let deadConnections = 0;
    for (let conn of connections) {
        if (conn.res.connection.destroyed) {
            deadConnections++;
            connections.delete(conn);
        }
    }
    
    if (deadConnections) {
        console.debug(`Removed ${deadConnections} dead connections.`);
    }
}

function getSlot(req, res, next) {
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
        console.info(`Acquired connection for all slots at ${conn.time}.  User-agent: ${conn.userAgent}.`);
        
        res.sseSend(SlotManager.currentSlots);
    } else {
        slot = parseInt(req.params[0]) - 1;
        console.info(`Acquired connection for slot ${slot} at ${conn.time}.  User-agent: ${conn.userAgent}.`);
        
        res.sseSend(SlotManager.currentSlots[slot]);
    }
    
    conn.slot = slot;
    connections.add(conn);
    
    req.on('close', (function () {
        console.debug(`Connection initialized at ${conn.time} closed.`);
        connections.delete(this);
        console.debug(`Remaining open connections: ${connections.size}`);
    }).bind(conn));
    
    console.debug(`Open connections: ${connections.size}`);
    next();
}

function reset(req, res, next) {
    console.log('Sending reset to all slot connections');
    let sentTo = 0;
    for (let conn of connections) {
        conn.res.sseSend('reset');
        sentTo++;
    }
    
    console.log(`Sent reset to ${sentTo} connections`);
    
    SlotManager.resetPlayer();
    res.sendStatus(200);
}

function update(req, res, next) {
    console.info(`Received update on from Lua script:\n${JSON.stringify(req.body, null, 2)}`);
    let hadError = false;
    assertGeneration(req.header('Pokemon-Generation'));
    
    try
    {
        for (let data of req.body) {
            let { slot, box, changeId, pokemon } = data,
            isBox = !!box;
            
            slot--;
            box && box--;
            
            let pkmn = pokemon ? new Pokemon(pokemon) : null;
            if (isBox) {
                SlotManager.updateBankSlot(box, slot, changeId, pkmn);
            } else {
                SlotManager.updatePartySlot(slot, changeId, pkmn);
            }
        }
    } catch (ex) {
        console.error(ex);
        hadError = true;
    }
    
    if (!hadError) {
        res.sendStatus(200);
        next();
    } else {
        res.sendStatus(400);
        next();
    }
}

function onSlotUpdate(e) {
    dirtySlots = true;
}

setInterval(sendToClient, 1000);
function sendToClient() {
    if (!dirtySlots) {
        return;
    }

    let slots = SlotManager.currentSlots;

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
    dirtySlots = false;
}

function assertGeneration(luaGen) {
    if (parseInt(luaGen) !== Config.Current.generation) {
        console.error(`Generation mismatch: Lua is running gen ${luaGen}.  Node is running gen ${Config.Current.generation}.`);
    }
}

SlotManager.on('update', onSlotUpdate);
const api = new API();
export default api;