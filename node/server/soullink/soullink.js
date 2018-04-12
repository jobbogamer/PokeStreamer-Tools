import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';

import { TimeoutError } from '../../common/error';
import Config from '../config';
import { Paths } from '../constants';
import Pokedex from '../../common/pokedex';
import PM from '../pokemon/pokemon-manager';
import Pokemon from '../pokemon/pokemon';
import DC from './discord-client';
import Nuzlocke from '../nuzlocke/nuzlocke';
import * as Message from './message';

const {
    GameDataPath,
    SoulLinkFile,
} = Paths;

const autoLinkingMethods = [
    'discord',
    // 'proxy'
];

const emptyData = {
    _links: new Map(),
    _unlinkedPartnerPokemon: new Set(),
};

let receivedInitialDataDump = false;

class SoulLink extends EventEmitter {
    constructor() {
        super();

        Object.assign(this, emptyData);

        this._handleDataDump = this._handleDataDump.bind(this);
        this._partnerNewGame = this._partnerNewGame.bind(this);

        this._parseData();
        this.emit('update', new Map(this._links));

        Config.on('update', this._handleConfigChange.bind(this));
    }

    get enabled() {
        if (Config.soulLink.enabled && !Config.nuzlocke.enabled) {
            console.warn(`In config, SoulLink is enabled but Nuzlocke isn't.  You're about to have a bad time.`);
        }

        return Config.nuzlocke.enabled && Config.soulLink.enabled;
    }

    get linkingMethod() {
        return this.enabled ? Config.soulLink.linking.method : 'disabled';
    }

    get autoLinking() {
        // eventually might include multiple auto-linking methods (e.g. websocket proxy service)
        return this.enabled && autoLinkingMethods.findIndex(str => str === this.linkingMethod) !== -1;
    }

    get manualLinking() {
        return this.enabled && this.linkingMethod === 'manual';
    }

    get discordLinking() {
        return this.enabled && this.linkingMethod === 'discord';
    }

    // TODO
    // get proxyLinking() {
    //     return this.enabled && this.linkingMethod === 'proxy';
    // }

    get Links() {
        return new Map(this._links);
    }

    init() {
        if (this.discordLinking) {
            DC.on('new-game', this._partnerNewGame);
            DC.on('update-party', m => null); // TODO
            DC.on('update-pokemon', m => this.addSLPokemon(m.pokemonObj));
            DC.on('update-link', m => this.setLink(m.pid, m.linkPid, true));
            DC.on('data-dump', this._handleDataDump);
            DC.on('request-data-dump', m => DC.send(new Message.DataDump(PM.knownPokemon, PM.slots, Array.from(this._links.entries()))));
            DC.on('request-pokemon', m => this.sendPokemon(m.pid));

            let sendInitialRequest = async () => {
                if (receivedInitialDataDump) {
                    return;
                }

                try {
                    receivedInitialDataDump = true;
                    DC.send(new Message.RequestDataDump());
                    await DC.waitForMessage('data-dump');
                } catch (err) {
                    receivedInitialDataDump = false;
                    if (err && err instanceof TimeoutError) {
                        console.debug(`Did not receive data-dump within ${err.ttl / 1000} seconds`);
                    } else {
                        console.error(err);
                    }
                }
            };

            DC.matchOnce('connection-status-change', (s, pcs) => pcs === 'online', sendInitialRequest);
            DC.once('request-data-dump', sendInitialRequest);

            DC.open();            
        }
    }

    reset() {
        let data = Object.assign({ method: this.linkingMethod }, emptyData);
        fs.writeFileSync(SoulLinkFile, JSON.stringify(data, null, 2));
        this._links = new Map();
        this._unlinkedPartnerPokemon = new Set();
        if (this.linkingMethod === 'discord') {
            DC.send(new Message.NewGame());
        }
    }

    addPokemon(pokemon) {
        this._links.set(pokemon.pid, null);
        this._writeFile();

        if (this.linkingMethod === 'discord') {
            DC.send(new Message.UpdatePokemon(pokemon));
        }
    }

    addSLPokemon(pokemon) {
        let prev = PM.knownSLPokemon[pokemon.pid];
        PM.registerPartnerPokemon(pokemon);

        // check for already-linked pokemon
        for (let [pid, linkPid] of this._links) {
            if (linkPid === pokemon.pid) {
                this.emit('update', new Map([[pid, pokemon]]));

                if (prev && prev.dead !== pokemon.dead) {
                    if (pokemon.dead) {
                        Nuzlocke.addDeadPokemon(pid);
                    } else {
                        Nuzlocke.revivePokemon(pid);
                    }
                }

                return;
            }
        }

        if (prev && prev.isVoid !== pokemon.isVoid) {
            if (pokemon.isVoid) {
                Nuzlocke.addVoidPokemon(pokemon.pid);
            } else {
                Nuzlocke.revivePokemon(pokemon.pid);
            }
        }

        if (prev && !prev.linkPid && pokemon.linkPid) {
            // new pokemon link
            this._links.set(pokemon.linkPid, pokemon.pid);
            this.emit('update', new Map([[pokemon.linkPid, pokemon.pid]]));
            return;
        }

        // new pokemon or being updated
        this._unlinkedPartnerPokemon.add(pokemon.pid);
        this.emit('add-unlinked-partner-pokemon', pokemon);
    }

    // Argument 'link' is pid if linking method is Discord, else species
    async setLink(pid, link, fromDiscord) {
        if (pid && (!this._links.has(pid) || !(pid in PM.knownPokemon))) {
            console.warn(`Attempted to add link to a pokemon we don't know about...`);
            this.emit('error', { 
                pid, 
                errorMessage: `The pokémon you tried to link is not in the server's memory.  You probably restarted the server.  Try refreshing the page (press F5) or restarting the Lua script.`
            });
            
            return;
        }

        if (!pid && link) {
            // receiving an unlink from discord
            for (let [k, v] of this._links) {
                if (v === link) {
                    this._unlinkedPartnerPokemon.add(link);
                    this._links.set(k, null);
                    link = null;
                    pid = k;
                    break;
                }
            }
        } else {
            if (!link && link !== 0) {
                if (this._links.get(pid) !== null) {
                    // should always be the case
                    this._unlinkedPartnerPokemon.add(this._links.get(pid));
                }

                this._links.set(pid, null);
            } else {
                this._links.set(pid, link);
                this._unlinkedPartnerPokemon.delete(link);
            }
        }

        if (!PM.setPokemonLink(pid, link)) {
            try {
                PM.registerPartnerPokemon(await this._requestPokemon(link));
            } catch (err) {
                this.emit('error', {
                    pid,
                    errorMessage: `The server is currently unaware of the pokémon you tried to link to, and your partner's server did not respond with information about that pokémon.`
                });
                return;
            }
        }
        
        this._writeFile();
        
        let linkPokemon = this._links.get(pid);
        if (this.autoLinking && link !== null) {
            linkPokemon = PM.knownSLPokemon[link];
        }

        this.emit('update', new Map([[pid, linkPokemon]]));

        if (this.discordLinking && !fromDiscord) {
            DC.send(new Message.UpdateLink(pid, link));
        }
    }

    async sendPokemon(pid) {
        return DC.send(new Message.UpdatePokemon(PM.knownPokemon[pid]));
    }

    async _requestPokemon(pid) {
        DC.send(new Message.RequestPokemon(pid));
        let msg = await DC.waitForMessage('update-pokemon', msg => msg.pokemon.pid === pid, 2000);
        return Pokemon.fromDiscordJSON(msg.pokemon);
    }

    _parseData() {
        if (!fs.existsSync(GameDataPath)) {
            console.info(`Creating gameData directory`);
            fs.mkdirSync(GameDataPath);
        }

        if (!fs.existsSync(SoulLinkFile)) {
            this.reset();
            return;
        }

        let next;
        try {
            let contents = fs.readFileSync(SoulLinkFile);
            next = JSON.parse(contents);
            if (next.method !== this.linkingMethod) {
                let backupFileName = this._makeBackupFile();
                console.warn(`Current soulLink.json gameData file uses the ${contents.method} linking method, while config is using ${this.linkingMethod}.  These are incompatible.  Backed up the game data file to ${backupFileName} and created an empty data file.`);
                this.reset();
                return;
            }
        } catch (err) {
            console.warn('Invalid soullink.json gameData file found.');
            let backupFileName = this._makeBackupFile();
            this.reset();
            console.warn(`Made a copy of the erroneous file at ${backupFileName}, and created an empty soullink file.`);
            return;
        }

        // TODO validate data
        this._links = Map.from(Object.entries(next._links).map(([k, v]) => [parseInt(k), parseInt(v)]));
        this._unlinkedPartnerPokemon = new Set(next._unlinkedPartnerPokemon);
    }

    _writeFile() {
        let fileData = {
            method: this.linkingMethod,
            _links: this._links,
            _unlinkedPartnerPokemon: this._unlinkedPartnerPokemon
        };

        fs.writeFileSync(SoulLinkFile, JSON.stringify(fileData, null, 2));
    }

    // TODO: make this much cleaner... so many if statements
    _handleConfigChange(p, n) {
        if (p.nuzlocke.enabled !== n.nuzlocke.enabled) {
            if (!n.nuzlocke.enabled && n.soulLink.enabled) {
                console.error(`Nuzlocke is now disabled and SoulLink is enabled.  You're about to have a bad time.`);
            }
        }

        if (p.soulLink.enabled !== n.soulLink.enabled) {
            console.info(`SoulLink is now ${n.soulLink.enabled ? 'enabled' : 'disabled'} in config.`);
        }

        if (n.soulLink.enabled && p.soulLink.linking.method !== n.soulLink.linking.method) {
            console.info(`SoulLink linking method changed to ${n.soulLink.linking.method}.`);

            if (!p.soulLink.enabled) {
                console.warn(`Switching bewteen linking methods requires the game to be reset.`);
                let backupFileName = this._makeBackupFile();
                this.reset();
                console.log(`Created a backup of the SoulLink data at ${backupFileName} and created an empty SoulLink data file.`);
            }
        }

        if ((p.soulLink.enabled && !n.soulLink.enabled) || 
            (p.soulLink.linking.method !== 'discord' && n.soulLink.linking.method === 'discord')) {
            receivedInitialDataDump = false;
            DC.destroy();
        } else if ((p.soulLink.enabled && !n.soulLink.enabled) || 
            (p.soulLink.linking.method !== 'discord' && n.soulLink.linking.method === 'discord')) {
            this.init();
        }
    }

    _handleDataDump(msg) {
        let {
            pokemon, 
            links,
            theirPartyPids,
        } = msg;

        let deltaLinks = new Map();
        for (let p of pokemon) {
            PM.registerPartnerPokemon(p);
            this._unlinkedPartnerPokemon.add(p.pid);

            // remove the current link for this pokemon
            for (let [pid, linkPid] of this._links) {
                if (linkPid && linkPid.pid === p.pid) {
                    deltaLinks.set(pid, null);
                    this._links.set(pid, null);
                    if (pid in PM.knownPokemon) {
                        PM.setPokemonLink(pid, null);
                    }
                    break;
                }
            }

            this.emit('add-unlinked-partner-pokemon', p);
        }

        for (let [linkPid, pid] of links) {
            this._links.set(pid, linkPid);
            this._unlinkedPartnerPokemon.delete(linkPid);
            if (pid in PM.knownPokemon) {
                deltaLinks.set(pid, PM.knownSLPokemon[this._links.get(pid)]);
                PM.setPokemonLink(pid, linkPid);
            }
        }

        this.emit('update', deltaLinks);
        this._writeFile();
    }

    _makeBackupFile() {
        let backupFileName = path.join(GameDataPath, `soullink.${new Date().getTime()}.json`);
        fs.copyFileSync(SoulLinkFile, backupFileName);
        return backupFileName;
    }

    _partnerNewGame() {
        PM.partnerReset();
        Nuzlocke.partnerReset(Array.from(this._links.values()).filter(l => l !== null));
        this._unlinkedPartnerPokemon = new Set();

        for (let [k, v] of this._links) {
            this._links.set(k, null);
        }

        this.emit('partner-new-game', this._links);
        this._writeFile();
    }
}

const sl = new SoulLink();
export default sl;