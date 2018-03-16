import VA from '../validate-argument';
import Pokedex from './pokedex';
import PokemonImages from './pokemon-images';
import Config from '../config';

function getMaxPokemonId(generation) {
    return generation <= 3 ? 386 : 649; // values pulled from wikipedia
}

let maxPokemonId = getMaxPokemonId(Config.Current.generation);

Config.on('update', e => {
    let gen = e.next.generation;
    if (e.prev.generation !== gen) {
        console.log(`Updating generation from ${e.prev.generation} to ${gen}`);
        maxPokemonId = getMaxPokemonId(gen);
    }
});

class Pokemon {
    constructor(otid, otsid, encryptedNicknameBytes, locationMet, species, alternateForm, nickname, level, dead, female, shiny, levelMet) {
        this._linkId = -1;

        this.uniqueId = `${encryptedNicknameBytes}-${locationMet}-${levelMet}`;

        this.otid = VA.int(otid, 'otid');
        this.otsid = VA.int(otsid, 'otsid');
        this.locationMet = VA.int(locationMet, 'locationMet');
        this.species = species === -1 ? -1 : VA.boundedInt(species, 'species', 1, maxPokemonId);
        this.alternateForm = alternateForm || '';
        this.nickname = nickname;

        // temporary fix to handle pokemon with invalid levels (> 100)... it's an issue in the script that I haven't
        // quite figured out yet
        this.level = level === -2 ? '' : VA.boundedInt(level, 'level', 0, 100);
        this.dead = VA.bool(dead, 'dead');
        this.female = VA.boolOrUndefinedFalse(female, 'female');
        this.shiny = VA.boolOrUndefinedFalse(shiny, 'shiny');
        this.levelMet = VA.int(levelMet, 'levelMet');

        if (shiny) {
            this.shinyNum = -1;
        }
    }

    get linkId() {
        if (this._linkId === -1) {
            throw new Error('Invalid linkId.  Call setter first.');
        }
    }

    set linkId(val) {
        if (!Number.isInteger(val) || val < 0) {
            throw new Error('Invalid linkId.  Must be an integer > -1');
        }

        this._linkId = val;
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
        return PokemonImages.get(this.species || -1).getImage(this.female, this.shiny, this.alternateForm);
    }

    get discordJSON() {
        return {
            linkId: this._linkId,
            level: this.level,
            species: this.species,
            dea: this.dead
        };
    }

    get clientJSON() {
        return {
            speciesName: this.speciesName,
            nickname: this.nickname,
            level: this.level,
            dead: this.dead,
            female: this.female,
            shiny: this.shiny,
            levelMet: this.levelMet,
            img: this.img,
        };
    }
}

Pokemon.empty = function() {
    return new Pokemon(-1, -1, null, -1, -1, null, null, 0, false, false, false, -1);
};

// TODO : Pokemon.fromJSON()?

export default Pokemon;