import pokemonImages from './pokemon-images';
import VA from './validate-argument';
import Config from './config';
import Pokedex from './pokedex';

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
    constructor(slot, changeId, species, nickname, level, img, dead, female, shiny, levelMet, locationMet) {
        this.slot = VA.boundedInt(slot, 'slot', 0, 5) + 1; 
        this.changeId = VA.int(changeId, 'changeId');
        species = VA.hasValue(species);
        if (species.toString().trim() === '' || species.toString() === '-1') {
            this.species = '';
        } else {
            this.species = Pokedex[VA.boundedInt(species, 'species', 1, maxPokemonId)];
        }

        this.nickname = nickname;
        this.level = VA.boundedInt(level, 'level', 0, 100);
        this.img = img;
        this.dead = VA.bool(dead);
        this.female = VA.boolOrUndefinedFalse(female);
        this.shiny = VA.boolOrUndefinedFalse(shiny);

        // primarily used for Nuzlocke
        this.levelMet = levelMet;
        this.locationMet = locationMet;
    }
}

Slot.empty = function(slot, changeId) {
    slot = VA.boundedInt(slot, 'slot', 0, 5, 
        `Argument 'slot' must be between 0 and 5 (0-indexed value between 1 and 6).  Found '${slot}'.`);

    let cid = changeId === undefined ? -1 : changeId;
    changeId = VA.int(cid, 'changeId', `Argument 'changeId' must be a valid integer or undefined.  Found ${changeId}.`);

    return new Slot(slot, changeId, '', '', 0, pokemonImages[-1].base, false);
};

export default Slot;