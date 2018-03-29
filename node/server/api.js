import express from 'express';
import useragent from 'useragent';
import EventEmitter from 'events';

import { getLocaleString } from './helpers';
import { API as APIConstants } from './constants';
import Config from './config';
import Pokemon from './pokemon/pokemon';
import Slot from './slot/slot';
import SoulLinkFileReader from './soul-link/soul-link-file-reader';
import Nuzlocke from './nuzlocke';
import SoulLink from './soul-link';
import NuzlockeFileManager from './nuzlocke/nuzlocke-file-manager';

const {
    KeepAliveIntervalMS,
    CleanConnectionIntervalMS
} = APIConstants;

let slotConnections = new Set(),
    slConnections = new Set(),
    dirtySlots = false,
    deadConnectionInterval,
    router,
    gameVersion;

let knownPokemon = {},
    slots = [null, null, null, null, null, null];

class API extends EventEmitter {
    constructor() {
        super();

        this.Router = this.Router.bind(this);
    }
    
    init(app) {
        router = new express.Router();
        router.get(/^\/slot\/([1-6]|all)$/i, getSlot);
        router.get('/reset', reset);
        router.post('/update', update);

        // soul link manager
        if (SoulLink.Enabled && SoulLink.LinkingMethod === 'manual') {
            router.ws('/soulLink', getSoulLink);
        }
        
        clearInterval(cleanDeadConnections);
        setInterval(cleanDeadConnections, CleanConnectionIntervalMS);
    }

    Router(req, res, next) {
        if (!router) {
            this.init();
        }

        router(req, res, next);
    }
}

function cleanDeadConnections() {
    let deadConnections = 0;
    for (let conn of slotConnections) {
        if (conn.res.connection.destroyed) {
            deadConnections++;
            slotConnections.delete(conn);
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
        console.info(`Acquired connection for all slots.  User-agent: ${conn.userAgent}.`);
        
        res.sseSend(slots);
    } else {
        slot = parseInt(req.params[0]) - 1;
        console.info(`Acquired connection for slot ${slot}.  User-agent: ${conn.userAgent}.`);
        
        res.sseSend(slots[slot]);
    }
    
    conn.slot = slot;
    slotConnections.add(conn);
    
    req.on('close', (function () {
        console.debug(`Connection initialized closed.`);
        slotConnections.delete(this);
        console.debug(`Remaining open connections: ${slotConnections.size}`);
    }).bind(conn));
    
    console.debug(`Open connections: ${slotConnections.size}`);
    next();
}

function reset(req, res, next) {
    console.log('Sending reset to all slot connections');
    let sentTo = 0;
    for (let conn of slotConnections) {
        conn.res.sseSend('reset');
        sentTo++;
    }
    
    console.log(`Sent reset to ${sentTo} connections`);
    
    res.sendStatus(200);
}

function update(req, res, next) {
    console.info(`Received update on from Lua script`);
    console.log(JSON.stringify(req.body, null, 2));
    
    let hadError = false;
    let slotsToSend = [];
    
    try
    {
        for (let data of req.body) {
            let { slot, box, changeId, pokemon } = data,
                isBox = !!box;
            slot--;
            box && box--;

            if (!pokemon) { 
                continue; 
            }

            pokemon.generation = parseInt(req.header('Pokemon-Generation'));
            pokemon.gameVersion = req.header('Pokemon-Game');
            
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

                pkmn.previouslyKnown = knownPokemon[pid];                

                if (!pkmn.dead) {
                    if (Nuzlocke.knownDeadPokemon.has(pid)) {
                        // shouldn't happen, but the script can be finicky and we don't want the Nuzlocke sounds playing
                        // multiple times for the same pokemon
                        pkmn.dead = true;
                    }
                } else {
                    // used for SoulLink manager
                    pkmn.sendKill = !Nuzlocke.knownDeadPokemon.has(pid);
                    Nuzlocke.addDeadPokemon(pid);
                }

                pkmn.linkedSpecies = SoulLinkFileReader.Links[pid].linkedSpecies;
                knownPokemon[pid] = pkmn;
                slots[slot] = new Slot(slot, changeId, pkmn);
                slotsToSend.push(slots[slot]);
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

    if (slotsToSend.length) {
        for (let conn of slotConnections) {
            if (conn.slot === 'all') {
                conn.res.sseSend(slotsToSend);
            } else {
                conn.res.sseSend(slots[conn.slot]);
            }
        }
    }

    for (let slot of slotsToSend) {
        if (!slot || !slot.pokemon) {
            continue;
        }

        if (!slot.pokemon.previouslyKnown) {
            for (let conn of slConnections) {
                conn.send(JSON.stringify({
                    messageType: 'add-pokemon',
                    pokemon: slot.pokemon.clientJSON,
                }));
            }
        } else if (slot.pokemon.sendKill) {
            for (let conn of slConnections) {
                conn.send(JSON.stringify({
                    messageType: 'kill-pokemon',
                    pid: slot.pokemon.pid,
                }));
            }
        }
    }
}

SoulLinkFileReader.on('update', links => {
    let slotsToSend = [];
    for (let slot of slots) {
        if (!slot || !slot.pokemon || slot.pokemon.pid === -1 || !links[slot.pokemon.pid]) { continue; }
        let oldLinkedSpecies = slot.pokemon.linkedSpecies;
        slot.pokemon.linkedSpecies = links[slot.pokemon.pid].linkedSpecies;
        if (oldLinkedSpecies !== slot.pokemon.linkedSpecies) {
            slotsToSend.push(slot);
        }
    }

    for (let conn of slConnections) {
        Object.entries(links).forEach(([pid, l]) => {
            conn.send(JSON.stringify({
                messageType: 'update-link',
                pid,
                linkedSpecies: l.linkedSpecies
            }));
        });
    }

    if (slotsToSend.length) {
        for (let conn of slotConnections) {
            if (conn.slot === 'all') {
                conn.res.sseSend(slotsToSend);
            } else {
                conn.res.send(slots[conn.slot]);
            }
        }
    }
});

Nuzlocke.on('revivedPokemon', pid => {
    knownPokemon[pid].dead = false;

    for (let conn of slConnections) {
        conn.send(JSON.stringify({
            messageType: 'revive',
            pid
        }));
    }
    
    for (let slot of slots) {
        if (!slot || !slot.pokemon || slot.pokemon.pid !== pid) {
            continue;
        }

        for (let conn of slotConnections) {
            if (conn.slot === 'all') {
                conn.res.sseSend(slot);
            } else {
                // todo
                // conn.res.sseSend(slots[conn.slot]);
            }
        }
    }
});

function getSoulLink(ws, req) {
    console.debug('Setting up SoulLink WebSocket connection');
    ws.on('open', function () {
        console.log('Connection opened');
    });

    ws.on('message', function (e) {
        try {
            let msg = JSON.parse(e);
            console.log(`Received ${msg.messageType} message from client`);
            switch (msg.messageType) {
                case 'update-link':
                    SoulLinkFileReader.setLink(msg.pid, msg.linkedSpecies);
                    break;
                case 'unlink':
                    SoulLinkFileReader.setLink(msg.pid, null);
                    break;
                case 'revive':
                    Nuzlocke.revivePokemon(msg.pid);
                    break;
            }
        } catch (err) {
            console.error(`Invalid message from SoulLink manager:\n${e}`);
            console.log(err.stack);
        }
    });

    ws.on('close', (function() {
        console.log('WebSocket connection closed');
        slConnections.delete(this);
    }).bind(ws));

    slConnections.add(ws);

    Object.entries(knownPokemon).forEach(([pid, pokemon]) => ws.send(JSON.stringify({
        messageType: 'add-pokemon',
        pokemon: pokemon.clientJSON,
    })));
}

const api = new API();
export default api;