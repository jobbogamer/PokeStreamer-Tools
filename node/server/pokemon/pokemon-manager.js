import EventEmitter from 'events';
import Pokemon from '../pokemon/pokemon';

let pokemonById = {};
let soulLinkedById = {};

class PokemonManager extends EventEmitter {
    clearAllPokemon() {
        if (Object.keys(pokemonById).length || Object.keys(soulLinkedById).length) {
            console.warn('Clearing all pokemon from memory...');
        }

        pokemonById = {};
        soulLinkedById = {};
    }

    upsertPokemon(pokemon) {
        if (!pokemonById[pokemon.pid]) {
            this.pokemonById[pokemon.pid] = pokemon;
            this.emit("newPokemon", pokemon);
        } else {
            Object.assign(pokemonById[pokemon.pid], pokemon);
        }
    }

    upsertSoulLink(pokemon) {
        if (!soulLinkedById[pokemon.pid]) {
            this.soulLinkedById[pokemon.pid] = pokemon;
        } else {
            Object.assign(soulLinkedById[pokemon.pid], pokemon);
        }
    }

    getLinkedPokemon(pokemon) {
        let pid = pokemon;
        if (pokemon instanceof Pokemon) {
            pid = pokemon.pid;
        }

        let playerPokemon = pokemonById[pid], 
            soulLinkedPokemon = soulLinkedById[playerPokemon ? playerPokemon.linkedID : pid];

        if (!playerPokemon && !soulLinkedPokemon) {
            // really should never get here
            throw new Error(`No pokemon exists with the id ${pokemon.pid}.`);
        }

        playerPokemon = playerPokemon || pokemonById[soulLinkedPokemon.linkedID];

        return {
            playerPokemon,
            soulLinkedPokemon
        };
    }

    createLink(playerPokemon, soulLinkedPokemon) {
        if (playerPokemon instanceof Number) {
            playerPokemon = this.getPokemonById(playerPokemon, pokemonById);
        }

        if (soulLinkedPokemon instanceof Number) {
            soulLinkedPokemon = this.getPokemonById(soulLinkedPokemon, soulLinkedById);
        }

        if (!playerPokemon || !soulLinkedPokemon) {
            throw new Error(`Pokemon cannot be null.  Found: playerPokemon = ${JSON.stringify(playerPokemon)}, soulLinkedPokemon = ${JSON.stringify(soulLinkedPokemon)}`);
        }

        if (playerPokemon.linkedID === soulLinkedPokemon.pid &&
            playerPokemon.pid === soulLinkedPokemon.linkedID) {
            // link already exists
            console.debug('Attempted to create soul link that already exists.');
            return;
        }

        if (playerPokemon.linkedID > 0) {
            throw new Error(`Player pokemon already has a soullink`);
        }

        if (soulLinkedPokemon.linkedID > 0) {
            throw new Error(`SoulLinked pokemon already has a soullink`);
        }

        playerPokemon.linkedID = soulLinkedPokemon.pid;
        playerPokemon.pid = soulLinkedPokemon.linkedID;
    }

    getPokemonById(pid, fromGroup) {
        if (fromGroup) {
            return fromGroup[pid] || null;
        }

        if (pokemonById[pid]) {
            return pokemonById[pid];
        } else if (soulLinkedPokemon[pid]) {
            return soulLinkedPokemon[pid];
        } else {
            return null;
        }
    }

    getState() {
        return {
            playerPokemon: Object.assign({}, pokemonById),
            soulLinkedPokemon: Object.assign({}, soulLinkedById)
        };
    }

    getPokemonByCriteria(playerPokemon, soulLinkedPokemon) {
        let group, criteria;
        if (playerPokemon) {
            group = pokemonById;
            criteria = playerPokemon;
        } else if (soulLinkedPokemon) {
            group = soulLinkedById;
            criteria = soulLinkedPokemon;
        } else {
            return null;
        }

        for (let [id, pkmn] of Object.entries(group)) {
            if (fitsCriteria(pkmn, criteria)) {
                return pkmn;
            }
        }

        return null;
    }
}

function fitsCriteria(obj, criteria) {
    for (let [key, val] of Object.entries(criteria)) {
        if (obj[key] !== val) {
            return false;
        }
    }

    return true;
}

const pokemonManager = new PokemonManager();
export default pokemonManager;