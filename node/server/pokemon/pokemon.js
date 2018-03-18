import VA from '../validate-argument';
import Pokedex from './pokedex';
import PokemonImages from './pokemon-images';
import SoulLink from '../soul-link';
import Config from '../config';

function getMaxPokemonId(generation) {
    return generation <= 3 ? 386 : 649; // values pulled from wikipedia
}

let maxPokemonId = getMaxPokemonId(Config.Current.generation);

Config.on('update', e => {
    let gen = e.next.generation;
    if (e.prev.generation !== gen) {
        console.info(`Updating generation from ${e.prev.generation} to ${gen}`);
        maxPokemonId = getMaxPokemonId(gen);
    }
});

class Pokemon {
    constructor(otid, otsid, locationMet, species, alternateForm, nickname, level, dead, female,
            shiny, levelMet, shinyId) {
        this.otid = VA.int(otid, 'otid');
        this.otsid = VA.int(otsid, 'otsid');
        this.locationMet = VA.int(locationMet, 'locationMet');
        this.species = species === -1 ? -1 : VA.boundedInt(species, 'species', 1, maxPokemonId);
        this.alternateForm = alternateForm || '';
        this.nickname = SoulLink.Enabled && level !== 0 ? 
            VA.stringHasValue(nickname, 'nickname', `When SoulLink is enabled, all Pokemon must have a nickname.  Found '${nickname}'`) 
            : nickname;

        // temporary fix to handle pokemon with invalid levels (> 100)... it's an issue in the script that I haven't
        // quite figured out yet
        this.level = level === -2 ? '' : VA.boundedInt(level, 'level', 0, 100);
        this.dead = VA.bool(dead, 'dead');
        this.female = VA.boolOrUndefinedFalse(female, 'female');
        this.shiny = VA.boolOrUndefinedFalse(shiny, 'shiny');
        this.levelMet = VA.int(levelMet, 'levelMet');

        if (SoulLink.Enabled) {
            this.linkId = nickname; // I've decided to use nicknames as the canonical ID
            this.uniqueId = `${otid}${otsid}-${locationMet}-${levelMet}`;
            if (shiny) {
                this.shinyId === shinyId !== undefined ? shinyId : SoulLink.getNextShinyId();
                this.uniqueId += `-s`;
            }
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
        return PokemonImages.get(this.species || -1).getImage(this.female, this.shiny, this.alternateForm);
    }

    get discordJSON() {
        if (!SoulLink.Enabled) {
            console.debug('Why are you calling Pokemon.discordJSON when SoulLink is disabled?  You should debug this.');
        }

        return {
            linkId: this.linkId,
            level: this.level,
            species: this.species,
            dead: this.dead,
            shinyId: this.shinyId, // likely undefined, and that is fine
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
    return new Pokemon(-1, -1, -1, -1, null, null, 0, false, false, false, -1);
};

// TODO : Pokemon.fromJSON()?

export default Pokemon;