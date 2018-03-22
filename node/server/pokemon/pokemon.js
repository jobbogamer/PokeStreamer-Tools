import VA from '../validate-argument';
import Pokedex from './pokedex';
import PokemonImages from './pokemon-images';
import Config from '../config';
import StaticEncounters from './static-encounters';

function getMaxPokemonId(generation) {
    return generation <= 3 ? 386 : 649; // values pulled from wikipedia
}

let maxPokemonId = getMaxPokemonId(Config.Current.generation);

const DiscordNewPokemonFields = [
    "pid",
    "level",
    "species",
    "dead",
    "locationMet",
    "shinyId",
    "isFemale",
    "isStatic",
    "nickname",
];

const DiscordUpdateFields = [
    "pid",
    "level",
    "species",
    "dead",
];

const ClientFields = [
    "pid",
    "speciesName",
    "nickname",
    "level",
    "dead",
    "isFemale",
    "isShiny",
    "levelMet",
    "img",
    "isStatic",
    "isValid",
    "linkedImg",
];

function extractFields(obj, fields) {
    let o = {};
    for (let f of fields) {
        o[f] = obj[f];
    }

    return o;
}

Config.on('update', e => {
    let gen = e.next.generation;
    if (e.prev.generation !== gen) {
        console.info(`Updating generation from ${e.prev.generation} to ${gen}`);
        maxPokemonId = getMaxPokemonId(gen);
    }
});

class Pokemon {
    constructor(data) {
        if (data === undefined || data === null) {
            Object.assign(this, emptyPokemonData);
            this.isEmpty = true;
            return;
        }

        Object.assign(this, data);
        if (this.dead === undefined) {
            this.dead = !this.living;
        }
    }

    get speciesName() {
        return this.species ? Pokedex[this.species] : '';
    }

    set shinyNum(val) {
        if (!shiny) {
            throw new Error('Pokemon is not shiny.');
        }

        this.shinyNum = val;
    }

    get img() {
        return PokemonImages.get(this.species || -1).getImage(this.isFemale, this.isShiny, this.alternateForm);
    }

    get linkedImg() {
        if (this.linkedSpecies) {
            return PokemonImages.get(this.linkedSpecies).getImage();
        }

        return null;
    }

    // used when the other server has a record of this pokemon
    get discordUpdateJSON() {
        if (!SoulLink.Enabled) {
            console.debug('Why are you calling Pokemon.discordJSON when SoulLink is disabled?  You should debug this.');
        }

        return extractFields(this, DiscordUpdateFields);
    }

    // used when notifying the other server of a new pokemon
    get discordNewPokemonJSON() {
        if (!SoulLink.Enabled) {
            console.debug('Why are you calling Pokemon.discordJSON when SoulLink is disabled?  You should debug this.');
        }

        return extractFields(this, DiscordNewPokemonFields);
    }

    get clientJSON() {
        if (this.isEmpty) {
            return null;
        }

        return extractFields(this, ClientFields);
    }

    _validateValues() {
        if (this.empty) {
            return;
        }

        VA.int(this.pid, 'pid');
        VA.int(this.otid, 'otid');
        VA.int(this.otsid, 'otsid');
        VA.int(this.locationMet, 'locationMet');
        VA.boundedInt(this.species, 'species', 1, maxPokemonId);
        VA.boundedInt(this.level, 'level', 0, 100);
        VA.bool(this.dead, 'dead');
        VA.boolOrUndefinedFalse(this.female, 'female');
        VA.boolOrUndefinedFalse(this.shiny, 'shiny');
        VA.int(this.levelMet, 'levelMet');
        VA.bool(this.isStatic, 'static');
    }
}

const emptyPokemonData = {
    pid: -1,
    otid: -1,
    otsid: -1,
    species: null,
    level: -1,
    nickname: "",
    dead: false,
    shiny: false,
    female: false,
    levelMet: -1,
    locationMet: -1,
    alternateForm: "",
    isStatic: false,
};

const EmptyPokemon = new Pokemon();
Pokemon.empty = EmptyPokemon;

// TODO : Pokemon.fromJSON()?

export default Pokemon;