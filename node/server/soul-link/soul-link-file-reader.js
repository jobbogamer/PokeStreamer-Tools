import fs from 'fs';
import path from 'path';
import EventEmitter from 'events';

import { Paths } from '../constants';
import Pokedex from '../../common/pokedex';

const {
    NodeRoot,
    PublicPath,
    SoulLinkFile,
} = Paths;

class SoulLinkFileReader extends EventEmitter {
    constructor() {
        super();

        this._links = {};

        this.parseData = this.parseData.bind(this);
        this.parseData();
        this._filewatcher = new fs.watch(SoulLinkFile);
        this._filewatcher.on('change', this.parseData);
    }

    parseData() {
        if (!fs.existsSync(PublicPath)) {
            // happens if running autobuild before running build
            console.error(`Directory 'public' path does not exist in '${NodeRoot}'.  Are you sure you have run node/build.cmd yet?`);
            throw new Error('Project has not been built.');
        }

        if (!fs.existsSync(SoulLinkFile)) {
            fs.writeFileSync(SoulLinkFile, '{}');
            return;
        }

        let contents = '',
            next;
        try {
            contents = fs.readFileSync(SoulLinkFile);
            next = JSON.parse(contents);
        } catch (e) {
            // file is invalid JSON... happens immediately after saving the file
            return;
        }

        let changed = false;
        for (let [pid, nextLink] of Object.entries(next)) {
            if (nextLink.linkedSpecies === '') {
                next[pid].linkedSpecies = null;
                continue;
            }

            let n = Pokedex.Lower.indexOf(nextLink.linkedSpecies.toLowerCase());
            if (n === -1) {
                console.error(`Invalid species name: ${nextLink.linkedSpecies}.  Ignoring change to 'soullinkdata.json'.  Fix the species and save again.`);
                return;
            }

            if (n === 0) {
                next[pid].linkedSpecies = null;
            } else {
                next[pid].linkedSpecies = n;
            }
        }

        for (let [pid, nextLink] of Object.entries(next)) {
            let old = this._links[pid];
            if (!old || old.linkedSpecies !== nextLink.linkedSpecies) {
                changed = true;
                break;
            }
        }

        this._links = next;
        if (changed) {
            this.emit('update', next);
        }
    }

    addPokemon(pokemon) {
        this._links[pokemon.pid] = {
            yourPokemon: pokemon.nickname || pokemon.speciesName,
            linkedSpecies: ''
        };

        let fileLinks = Object.assign({}, this._links);
        for (let [pid, link] of Object.entries(fileLinks)) {
            if (link.linkedSpecies === null) {
                fileLinks[pid].linkedSpecies = '';
            } else if (link.linkedSpecies.constructor === Number) {
                fileLinks[pid].linkedSpecies = Pokedex[link.linkedSpecies];
            }
        }

        fs.writeFileSync(SoulLinkFile, JSON.stringify(fileLinks, null, 2));

        if (!this._filewatcher) {
            this._filewatcher = new fs.watch(SoulLinkFile);
            this._filewatcher.on('change', this.parseData);
        }
    }

    get Links() {
        return Object.assign({}, this._links);
    }
}

const fr = new SoulLinkFileReader();
export default fr;