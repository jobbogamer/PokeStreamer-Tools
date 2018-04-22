import Config from '../config';
import Pokemon from '../pokemon/pokemon';
import Slot from '../slot/slot';
import SoulLink from '../soullink/soullink';
import Nuzlocke from '../nuzlocke/nuzlocke';
import { isStaticEncounterSupported } from './static-encounters';

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
        if (!knownPokemon[pid] || knownPokemon[pid].isEmpty) {
            pokemon.previouslyKnown = false;
            knownPokemon[pid] = pokemon;
            
            if (SoulLink.enabled) {
                if (SoulLink.Links.get(pid)) {
                    pokemon.linkPid = SoulLink.Links.get(pid);
                } else {
                    await SoulLink.addPokemon(pokemon);
                }
            }
            
            if (Nuzlocke.enabled && Nuzlocke.knownStaticPokemon.has(pid)) {
                pokemon.staticId = Nuzlocke.knownStaticPokemon.get(pid);
            }
            
            if (SoulLink.autoLinking) {
                if (pokemon.linkPid && !pokemon.isEmpty) {
                    // they know about this pokemon, but only by PID... send them the data
                    SoulLink.sendPokemon(pid);
                } else if (isStaticEncounterSupported(pokemon.generation, pokemon.gameVersion)) {
                    let soulLinkMatch = this._findSoulLinkMatch(pokemon, knownSLPokemon);
                    if (soulLinkMatch) {
                        this.setPokemonLink(pid, soulLinkMatch.pid);
                        SoulLink.setLink(pid, soulLinkMatch.pid);
                    }
                }
            }
        } else {
            pokemon.previouslyKnown = knownPokemon[pid];
            pokemon.linkPid = SoulLink.Links.get(pid);
            
            if ((pokemon.staticId === -2 || pokemon.staticId === 9999) && pokemon.previouslyKnown.staticId !== pokemon.staticId) {
                Nuzlocke.setStaticPokemon(pid, pokemon.staticId);
            }
            
            // prevent memory bloat
            delete pokemon.previouslyKnown.previouslyKnown;
        }
        
        knownPokemon[pid] = pokemon;
        
        if (Nuzlocke.enabled) {
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
        } else {
            pokemon.sendKill = pokemon.dead && !pokemon.previouslyKnown.dead;
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
            // happens when our partner knows about one of our pokemon and we don't
            return;
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
        return Object.entries(knownPokemon)
        .reduce((p, [pid, pkmn]) => {
            if (pid && pkmn && !pkmn.isEmpty) {
                p[pid] = pkmn.clone();
            }
            
            return p;
        }, {});
    }
    
    get knownSLPokemon() {
        return Object.entries(knownSLPokemon)
        .reduce((p, [pid, pkmn]) => {
            if (pid && pkmn && !pkmn.isEmpty) {
                p[pid] = pkmn.clone();
            } else {
                console.error(`Somehow had an empty pokemon in knownSLpokemon.`);
            }
            
            return p;
        }, {});
    }
    
    get slots() {
        // TODO clone so that callers can't change things
        return slots; // simpleDeepClone(slots).map(s => s === null ? null : new Slot(s.slot, new Pokemon(s.pokemon)));
    }
    
    _findSoulLinkMatch(newPokemon, setToSearch) {
        if (newPokemon.isShiny && newPokemon.staticId < 0) {
            return null;
        }
        
        if (newPokemon.isVoid) {
            return null;
        }
        
        let predicate;
        if (newPokemon.staticId > 0) {
            if (newPokemon.staticId === 9999) {
                // don't link pokemon that are manually marked static
                return null;
            }
            
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