import PokemonImages from './pokemon/pokemon-images';
import VA from './validate-argument';
import Config from './config';
import Pokedex from './pokemon/pokedex';

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

class Slot {
    constructor(slot, changeId, species, nickname, level, dead, female, shiny, alternateForm, levelMet, locationMet) {
        this.slot = VA.boundedInt(slot, 'slot', 0, 5) + 1;
        this.changeId = VA.int(changeId, 'changeId');
        this._speciesId = VA.hasValue(species, 'species');
        if (species.toString().trim() === '' || species.toString() === '-1') {
            this.species = '';
        } else {
            this.species = Pokedex[VA.boundedInt(species, 'species', 1, maxPokemonId)];
        }

        this.nickname = nickname;
        // temporary fix to handle pokemon with invalid levels (> 100)... it's an issue in the script that I haven't
        // quite figured out yet
        this.level = level === -2 ? '' : VA.boundedInt(level, 'level', 0, 100);
        this.dead = VA.bool(dead, 'dead');
        this.female = VA.boolOrUndefinedFalse(female, 'female');
        this.shiny = VA.boolOrUndefinedFalse(shiny, 'shiny');
        this.alternateForm = alternateForm;

        // primarily used for Nuzlocke
        this.levelMet = levelMet;
        this.locationMet = locationMet;
    }

    get img() {
        return PokemonImages.get(this._speciesId || -1).getImage(this.female, this.shiny, this.alternateForm);
    }

    toJSON() {
        let tmp = Object.assign({}, this);
        delete tmp._speciesId;
        tmp.img = this.img;
        return tmp;
    }
}

Slot.empty = function(slot, changeId) {
    slot = VA.boundedInt(slot, 'slot', 0, 5, 
        `Argument 'slot' must be between 0 and 5 (0-indexed value between 1 and 6).  Found '${slot}'.`);

    let cid = changeId === undefined ? -1 : changeId;
    changeId = VA.int(cid, 'changeId', `Argument 'changeId' must be a valid integer or undefined.  Found ${changeId}.`);

    return new Slot(slot, changeId, '', '', 0, false, undefined, undefined, undefined, -1, -1);
};

export default Slot;