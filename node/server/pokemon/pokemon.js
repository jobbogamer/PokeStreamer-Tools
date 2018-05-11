import _ from 'lodash';
import path from 'path';

import VA from '../validate-argument';
import Pokedex from '../../common/pokedex';
import PokemonLocations from './pokemon-locations';
import PokemonImages from './pokemon-images';
import PM from './pokemon-manager';
import SoulLink from '../soullink/soullink';
import Config from '../config';
import { Paths } from '../constants';
import { getStaticEncounterId, isStaticEncounterSupported } from './static-encounters';
import getLevel from './experience';
import { getFlagsValue, parseFlags } from './pokemon-flags';
import calcStat from './pokemon-stats';

function getMaxPokemonId(generation) {
    return generation <= 3 ? 386 : 649; // values pulled from wikipedia
}

class Pokemon {
    constructor(data) {
        if (!hasValue(data)) {
            Object.assign(this, emptyPokemonData);
            this.isEmpty = true;
            return;
        }
        
        Object.assign(this, data);

        if (this.nickname) {
            this.nickname = this.nickname.replace(/\\u\{(\d+)\}/g, (_, n) => {
                let c = parseInt(n, 16);
                if (c > 0xFFFF) {
                    c = 0;
                }

                return String.fromCharCode(c);
            });

            let firstInvalidCharacter = this.nickname.search(/\\u(\{0000\}|\{ffff\})/i);
            if (firstInvalidCharacter !== -1) {
                this.nickname = this.nickname.substring(0, firstInvalidCharacter);
            }
        }
        
        if (this.dead === undefined) {
            this.dead = !this.living;
        }
        
        if (this.isEgg) {
            this.level = '';
        } else {
            this.level = getLevel(this);
        }

        let {
            currentHp,
            maxHp,
            evs,
            ivs
        } = this;

        if (evs && ivs) {
            // We have to do this calculation here rather than in Lua because we have to calculate the level here in
            // case normalized XP gain is enabled.
            // Since EVs don't have an effect until after the pokemon levels, EVs gained since the last level might 
            // cause HP to increase a little and maxHp won't match the calculated maxHp, so we'll allow it a range.
            // Failing due to this range is possible, but an extreme corner case, and when it does fail, the only thing
            // that will break is correctly reporting isCritical: it will default to false.
            let minEV = Object.assign({}, this, { evs: { hp: 0 } });

            if (maxHp > calcStat(this, 'maxHp') || maxHp < calcStat(minEV, 'maxHp')) {
                maxHp = null;
            }

            if (!evs instanceof Object) {
                console.error(`Received and EVs value that wasn't an object`);
            } else {
                this.isFullyTrained = Object.values(evs).reduce((p, n) => p + n, 0) === 510;
            }
        }
        
        if (currentHp && maxHp) {
            this.isCritical = currentHp / maxHp < 1 / 5;            
        }
        
        // TODO enable other generations
        if (this.staticId === undefined && isStaticEncounterSupported(this.generation, this.gameVersion)) {
            this.staticId = getStaticEncounterId(this);
        }
    }
    
    get locationMetName() {
        if (this.isEmpty || this.locationMet === -1) {
            return null;
        }
        
        if (this.isEgg && this.eggLocationMet && this.eggLocationMet[this.generation.toString()][this.locationMet]) {
            return this.eggLocationMet[this.generation.toString()][this.locationMet];
        }

        return this.locationMet ? PokemonLocations[this.generation.toString()][this.locationMet] : '';
    }
    
    get speciesName() {
        return this.species ? !this.isEgg ? Pokedex[this.species] : 'Egg' : '';
    }
    
    get img() {
        try {
            return PokemonImages.get(hasValue(this.species) ? this.species : -1).getImage(this.isFemale, this.isShiny, this.alternateForm, this.isEgg);
        } catch (err) {
            if (/Cannot read property \'[^']+\' of undefined/.test(err.message)) {
                console.error(`Did not find image for ${this.speciesName} in ${path.resolve(Paths.NodeRoot, Config.pokemonImagesPath)}.  Make sure there is an image named ${this.species}.png (or another valid image extension) in the pokemon images root.`);
                return null;
            } else {
                throw err;
            }
        }
    }
    
    get link() {
        if (this.linkPid !== undefined && this.linkPid !== null) {
            let linked;
            if (SoulLink.linkingMethod === 'manual') {
                linked = new Pokemon();
                Object.assign(linked, {
                    species: this.linkPid,
                    dead: this.dead,
                    isShiny: this.isShiny,
                    isEgg: this.linkPid === 0,
                    isEmpty: false,
                    isCritical: false,
                    isFullyTrained: false,
                });
            } else if (PM.knownSLPokemon[this.linkPid]) {
                linked = PM.knownSLPokemon[this.linkPid].clone();
            } else {
                // send an empty pokemon to indicate that there is a link, but we don't know what it is yet
                linked = new Pokemon();
                linked.pid = this.linkPid;
            }
            
            if (!linked) {
                return null;
            }
            
            delete linked.linkPid; // make sure we don't produce an infinite loop
            return linked;
        }

        return null;
    }

    get emptyLinkImage() {
        if (!this.link) {
            return PokemonImages.get(-1).getImage();
        }
    }
    
    // used when notifying the other server of a new pokemon
    get discordJSON() {
        if (this.isEmpty) {
            return null;
        }

        let flags = getFlagsValue(this);
        return {
            g: this.generation,
            v: this.gameVersion,
            p: this.pid,
            n: this.nickname && this.nickname.length ? this.nickname : undefined,
            l: this.level,
            s: this.species,
            a: this.alternateForm && this.alternateForm.length ? this.alternateForm : undefined,
            f: flags ? flags : undefined,
            m: this.locationMet,
            x: this.staticId && this.staticId !== -1 ? this.staticId : undefined,
        };
    }

    set static(isStatic) {
        if (isStatic) {
            this.staticId = 9999;
        } else {
            this.staticId = -2;
        }
    }
    
    toJSON() {
        return _.pick(this, [
                'pid',
                'species',
                'speciesName',
                'nickname',
                'level',
                'dead',
                'isFemale',
                'isShiny',
                'isEgg',
                'levelMet',
                'img',
                'staticId',
                'isValid',
                'locationMetName',
                'generation',
                'link',
                'isVoid',
                'emptyLinkImage',
                'isCritical',
                'isEmpty',
                'isFullyTrained',
            ]);
    }

    clone() {
        // Object.getOwnPropertyNames() returns all properties but no getters, which is perfect as our getter properties
        // don't have associated setters.
        return new Pokemon(_.pick(this, Object.getOwnPropertyNames(this)));
    }
    
    _validateValues() {
        if (this.empty) {
            return;
        }
        
        VA.int(this.pid, 'pid');
        VA.int(this.otid, 'otid');
        VA.int(this.otsid, 'otsid');
        VA.int(this.locationMet, 'locationMet');
        VA.boundedInt(this.species, 'species', 1, getMaxPokemonId(this.generation || 5));
        VA.boundedInt(this.level, 'level', 0, 100);
        VA.bool(this.dead, 'dead');
        VA.boolOrUndefinedFalse(this.female, 'female');
        VA.boolOrUndefinedFalse(this.isShiny, 'isShiny');
        VA.int(this.levelMet, 'levelMet');
        VA.int(this.staticId, 'staticId');
    }

    static fromDiscordJSON(obj) {
        return new Pokemon(Object.assign(parseFlags(obj.f), {
            generation: obj.g,
            gameVersion: obj.v,
            pid: obj.p,
            level: obj.l,
            species: obj.s,
            nickname: obj.n || '',
            alternateForm: obj.a || '',
            locationMet: obj.m,
            staticId: obj.x,
        }));
    }
}

const emptyPokemonData = {
    pid: -1,
    otid: -1,
    otsid: -1,
    species: null,
    level: '',
    nickname: '',
    dead: false,
    shiny: false,
    female: false,
    levelMet: -1,
    locationMet: -1,
    alternateForm: '',
    staticId: -1,
    evs: null,
    ivs: null
};

const EmptyPokemon = new Pokemon();
Pokemon.empty = EmptyPokemon;

export default Pokemon;