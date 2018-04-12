import Config from '../config';
import Pokemon from '../pokemon/pokemon';
import Slot from '../slot/slot';
import SoulLink from '../soullink/soullink';
import Nuzlocke from '../nuzlocke/nuzlocke';

const emptySlots = new Array(6).fill(null).map((_, i) => Slot.empty(i));

let knownPokemon = {},
    knownSLPokemon = {},
    slots = new Array(...emptySlots);

class PokemonManager {
    reset() {
        console.warn('Clearing all pokemon from memory...');

        knownPokemon = {};
        knownSLPokemon = {};
        slots = new Array(...emptySlots);
    }

    partnerReset() {
        console.warn('Clearing all partner pokemon from memory...');
        knownSLPokemon = {};
        for (let p of Object.values(knownPokemon)) {
            p.linkPid = null;
        }
    }

    async registerPokemon(pokemon) {
        let pid = pokemon.pid;
        if (!knownPokemon[pid]) {
            pokemon.previouslyKnown = false;
            knownPokemon[pid] = pokemon;

            if (!SoulLink.Links.get(pid)) {
                await SoulLink.addPokemon(pokemon);
            }

            if (SoulLink.autoLinking) {
                let soulLinkMatch = this._findSoulLinkMatch(pokemon, knownSLPokemon);
                if (soulLinkMatch) {
                    this.setPokemonLink(pid, soulLinkMatch.pid);
                    SoulLink.setLink(pid, soulLinkMatch.pid);
                }
            }
        } else {
            pokemon.previouslyKnown = knownPokemon[pid];
            pokemon.linkPid = SoulLink.Links.get(pid);
            
            // prevent memory bloat
            delete pokemon.previouslyKnown.previouslyKnown;
        }

        knownPokemon[pid] = pokemon;
        pokemon.isVoid = Nuzlocke.knownVoidPokemon.has(pid);

        if (Nuzlocke.knownDeadPokemon.has(pid)) {
            // shouldn't happen, but the script can be finicky and we don't want the Nuzlocke sounds playing
            // multiple times for the same pokemon
            pokemon.dead = true;
        }

        if (SoulLink.autoLinking && pokemon.previouslyKnown) {
            // do this before calling Nuzlocke.addDeadPokemon() because when it emits an added dead pokemon, somewhere
            // it manages to set pokemon.prevouslyKnown.dead = true
            if (JSON.stringify(pokemon.previouslyKnown.discordJSON) !== JSON.stringify(pokemon.discordJSON)) {
                SoulLink.sendPokemon(pid);
            }
        }

        if (pokemon.dead) {
            pokemon.sendKill = !Nuzlocke.knownDeadPokemon.has(pid) && !Nuzlocke.knownVoidPokemon.has(pid);
            Nuzlocke.addDeadPokemon(pid);
        }

        return pokemon;
    }

    registerPartnerPokemon(pokemon) {
        let prev = knownSLPokemon[pokemon.pid];
        knownSLPokemon[pokemon.pid] = pokemon;
        
        // don't try to auto-link pokemon who are already in the system as not linked
        if (!prev && SoulLink.autoLinking) {
            let soulLinkMatch = this._findSoulLinkMatch(pokemon, knownPokemon);
            if (soulLinkMatch) {
                this.setPokemonLink(soulLinkMatch.pid, pokemon.pid);
            }
        }
    }

    setPokemonLink(pid, slPid) {
        if (slPid === undefined) {
            throw new Error('slPid cannot be undefined');
        }

        if (!knownPokemon[pid]) {
            throw new Error('Unknown pid sent to setPokemonLink()');
        } else if (SoulLink.autoLinking && slPid !== null && !knownSLPokemon[slPid]) {
            console.warn('Unknown soullink pid sent to setPokemonLink()');
            // return false so we can request the pokemon
            return false;
        }
        
        knownPokemon[pid].linkPid = slPid;
        if (slPid !== null && !SoulLink.manualLinking) {
            knownSLPokemon[slPid].linkPid = pid;
        }
        
        return true;
    }

    setSlot(slotNum, slot) {
        slots[slotNum] = slot;
        return slot;
    }

    setSlotEmpty(slotNum) {
        slots[slotNum] = Slot.empty(slotNum);
        return slots[slotNum];
    }

    getSlot(slotNum) {
        // TODO clone so that callers can't change things
        return slots[slotNum];
        // return simpleDeepClone(slots[slotNum]);
    }

    get knownPokemon() {
        // TODO clone so that callers can't change things
        return knownPokemon;

        // let clone = simpleDeepClone(knownPokemon);
        // for (let [pid, pkmn] of Object.entries(clone)) {
        //     clone[pid] = new Pokemon(pkmn);
        // }

        // return clone;
    }

    get knownSLPokemon() {
        // TODO clone so that callers can't change things
        return knownSLPokemon;

        // let clone = simpleDeepClone(knownSLPokemon);
        // for (let [pid, pkmn] of Object.entries(clone)) {
        //     clone[pid] = new Pokemon(pkmn);
        // }

        // return clone;
    }

    get slots() {
        // TODO clone so that callers can't change things
        return slots; // simpleDeepClone(slots).map(s => s === null ? null : new Slot(s.slot, new Pokemon(s.pokemon)));
    }

    _findSoulLinkMatch(newPokemon, setToSearch) {
        if (newPokemon.isShiny && !newPokemon.staticId) {
            return null;
        }

        if (newPokemon.isVoid) {
            return null;
        }

        let predicate;
        if (newPokemon.staticId) {
            predicate = p => p.staticId === newPokemon.staticId;
        } else {
            predicate = p => !p.staticId && p.locationMet === newPokemon.locationMet;
        }
        
        let matches = Object.values(setToSearch).filter(p => !p.linkPid && !p.isShiny && !p.isVoid && predicate(p));
        if (matches.length === 1) {
            return matches[0];
        }

        return null;
    }
}

// function simpleDeepClone(obj) {
//     return JSON.parse(JSON.stringify(obj));
// }

const pokemonManager = new PokemonManager();
export default pokemonManager;