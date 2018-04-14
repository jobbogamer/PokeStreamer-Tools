import EventEmitter from 'events';
import Config from 'config.json';
import ws from './websocket';

class UnlinkedPartnerPokemon extends EventEmitter {
    constructor() {
        super();
        
        this._unlinked = {};
        this._linked = {}; // keep track of links so we can tell when a pokemon has been unlinked

        if (Config.soulLink.linking.method === 'discord') {
            ws.on('message', this._handleMessage.bind(this));
        }

        // assume that we'll have a max of 100 pokemon in a SoulLink run, which conceivably means 100 unlinked rows
        this.setMaxListeners(100);
    }

    get pokemon() {
        if (Config.soulLink.linking.method !== 'discord') {
            console.warn(`Attempted to access UnlinkedPartnerPokemon when SoulLink method is not set 'discord'`);
        }

        return this._unlinked;
    }

    // only called when moving a row from unlinked to linked to avoid a race condition
    get linkedPokemon() {
        if (Config.soulLink.linking.method !== 'discord') {
            console.warn(`Attempted to access UnlinkedPartnerPokemon when SoulLink method is not set 'discord'`);
        }

        return this._linked;
    }

    _handleMessage(e) {
        let msg = JSON.parse(e.data),
            {
                pid,
                linkedPokemon,  // used in 'add-pokemon'
                pokemon,        // used in 'add-unlink-partner-pokemon'
                link            // used in 'update-link' -- is a pid
            } = msg;

        switch (msg.messageType) {
            case 'add-pokemon':
                if (linkedPokemon) {
                    this._linked[pid] = linkedPokemon;
                }

                break;

            case 'add-unlinked-partner-pokemon': // can be called when adding a new one or when updating the species
                if (!(pokemon.pid in this._unlinked)) {
                    this.emit('add', pokemon);
                } else { 
                    if (pokemon.isVoid || pokemon.dead) {
                        this.emit('remove', pokemon.pid);
                    } else {
                        let prev = this._unlinked[pokemon.pid];
                        if (prev.isVoid || prev.dead) {
                            this.emit('add', pokemon);
                        } else if (prev.species !== pokemon.species) {
                            this.emit('update', pokemon);
                        }
                    }
                }

                this._unlinked[pokemon.pid] = pokemon;
                break;

            case 'update-link':
                if (link) {
                    let linkPid = link.pid;
                    if (linkPid in this._unlinked) {
                        this._linked[pid] = this._unlinked[linkPid];
                        delete this._unlinked[linkPid];
                        this.emit('remove', linkPid);
                    }
                } else {
                    if (!(pid in this._linked)) {
                        console.error('Attempted to remove link from unknown pokemon');
                    } else {
                        link = this._linked[pid];
                        this._unlinked[link.pid] = link;
                        delete this._linked[pid];
                        this.emit('add', link);
                    }
                }

                break;

            case 'new-game':
                this._unlinked = {};
                this._linked = {};
                break;
        }
    }
}

const upp = new UnlinkedPartnerPokemon();
export default upp;