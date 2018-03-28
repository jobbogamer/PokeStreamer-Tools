import useragent from 'useragent';
import EventEmitter from 'events';

import { getLocaleString } from './helpers';
import { API as APIConstants } from './constants';
import Config from './config';
import Pokemon from './pokemon/pokemon';
import Slot from './slot/slot';
import SoulLinkFileReader from './soul-link/soul-link-file-reader';
import Nuzlocke from './nuzlocke';
// import SlotManager from './slot/slot-manager';
// import SoulLink from './soul-link';

const {
    KeepAliveIntervalMS,
    CleanConnectionIntervalMS
} = APIConstants;

let connections = new Set(),
    dirtySlots = false;

let knownPokemon = {},
    slots = [null, null, null, null, null, null];

class API extends EventEmitter {
    constructor() {
        super();
    }
    
    init(app) {
        app.get(/^\/api\/slot\/([1-6]|all)$/i, getSlot);
        app.get(/^\/api\/reset$/i, reset);
        app.post(/^\/api\/update$/i, update);
        
        setInterval(cleanDeadConnections, CleanConnectionIntervalMS);
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

function sseKeepAlive() {
    if (!this.res.connection.destroyed) {
        this.res.sseSend('// noop');
    } else {
        clearInterval(this.keepAlive);
    }
}

function getSlot(req, res, next) {
    if (!res.sseSetup()) {
        // happens when the host is the wrong origin
        return;
    }
    
    let locale = getLocaleString(req),
        slot, 
        conn = {
            userAgent: useragent.parse(req.headers['user-agent']).toAgent(),
            time: new Date().toLocaleTimeString(locale),
            res: res,
        };

    conn.keepAlive = setInterval(sseKeepAlive.bind(conn), KeepAliveIntervalMS);

    if (req.params[0] === 'all') {
        slot = 'all';
        console.info(`Acquired connection for all slots at ${conn.time}.  User-agent: ${conn.userAgent}.`);
        
        res.sseSend(slots);
    } else {
        slot = parseInt(req.params[0]) - 1;
        console.info(`Acquired connection for slot ${slot} at ${conn.time}.  User-agent: ${conn.userAgent}.`);
        
        res.sseSend(slots[slot]);
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
    
    // SlotManager.resetPlayer();
    res.sendStatus(200);
}

function update(req, res, next) {
    console.info(`Received update on from Lua script`);
    console.trace(JSON.stringify(req.body, null, 2));
    
    let hadError = false;
    assertGeneration(req.header('Pokemon-Generation'));

    let slotsToSend = [];
    
    try
    {
        for (let data of req.body) {
            let { slot, box, changeId, pokemon } = data,
                isBox = !!box;
            slot--;
            box && box--;
            
            let pkmn = pokemon ? new Pokemon(pokemon) : null,
                pid = pkmn && pkmn.pid;
            if (!pkmn) {
                if (!isBox) {
                    slots[slot] = Slot.empty(slot, changeId);
                    slotsToSend.push(slots[slot]);
                } else {
                    continue;
                }
            } else {
                if (!knownPokemon[pid]) {
                    if (SoulLinkFileReader.Links[pid]) {
                        pkmn.linkedSpecies = SoulLinkFileReader.Links[pid].linkedSpecies;
                    } else {
                        SoulLinkFileReader.addPokemon(pkmn);
                    }
                }

                if (!pkmn.dead) {
                    if (Nuzlocke.getKnownDeadPokemon().has(pid)) {
                        // shouldn't happen, but the script can be finicky and we don't want the Nuzlocke sounds playing
                        // multiple times for the same pokemon
                        pkmn.dead = true;
                    }
                } else {
                    Nuzlocke.addDeadPokemon(pid);
                }

                pkmn.linkedSpecies = SoulLinkFileReader.Links[pid].linkedSpecies;
                knownPokemon[pid] = pkmn;
                slots[slot] = new Slot(slot, changeId, pkmn);
                slotsToSend.push(slots[slot]);
            }
            // if (isBox) {
            //     SlotManager.updateBankSlot(box, slot, changeId, pkmn);
            // } else {
            //     SlotManager.updatePartySlot(slot, changeId, pkmn);
            // }
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

    if (slotsToSend.length) {
        for (let conn of connections) {
            if (conn.slot === 'all') {
                conn.res.sseSend(slotsToSend);
            } else {
                conn.res.sseSend(slots[conn.slot]);
            }
        }
    }
}

SoulLinkFileReader.on('update', links => {
    let slotsToSend = [];
    for (let slot of slots) {
        if (!slot || !slot.pokemon || slot.pokemon.pid === -1) { continue; }
        let oldLinkedSpecies = slot.pokemon.linkedSpecies;
        slot.pokemon.linkedSpecies = links[slot.pokemon.pid].linkedSpecies;
        if (oldLinkedSpecies !== slot.pokemon.linkedSpecies) {
            slotsToSend.push(slot);
        }
    }

    if (slotsToSend.length) {
        for (let conn of connections) {
            if (conn.slot === 'all') {
                conn.res.sseSend(slotsToSend);
            } else {
                conn.res.send(slots[conn.slot]);
            }
        }
    }
});

// function onSlotUpdate(e) {
//     dirtySlots = true;
// }

// setInterval(sendToClient, 1000);
// function sendToClient() {
//     if (!dirtySlots) {
//         return;
//     }

//     let slots = SlotManager.currentSlots;

//     let sentTo = 0;
//     for (let conn of connections) {
//         if (conn.res.connection.destroyed) {
//             continue;
//         }
    
//         sentTo++;
//         if (conn.slot === 'all') {
//             conn.res.sseSend(slots);
//         } else if (slots[conn.slot]) {
//             conn.res.sseSend(slots[conn.slot]);
//         }
//     }
    
//     console.log(`Sent update to ${sentTo} open connections.`);
//     dirtySlots = false;
// }

function assertGeneration(luaGen) {
    if (parseInt(luaGen) !== Config.Current.generation) {
        console.error(`Generation mismatch: Lua is running gen ${luaGen}.  Node is running gen ${Config.Current.generation}.`);
    }
}

// SlotManager.on('update', onSlotUpdate);
const api = new API();
export default api;