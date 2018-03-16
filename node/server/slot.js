import VA from './validate-argument';
import Pokemon from './pokemon/pokemon';

class Slot {
    constructor(slot, changeId, pokemon) {
        this.slot = VA.boundedInt(slot, 'slot', 0, 5) + 1;
        this.changeId = VA.int(changeId, 'changeId');
        this.pokemon = VA.hasValue(pokemon, 'pokemon');
    }

    toJSON() {
        return {
            slot: this.slot,
            changeId: this.changeId,
            pokemon: this.pokemon.clientJSON,
        };
    }
}

Slot.empty = function(slot, changeId) {
    slot = VA.boundedInt(slot, 'slot', 0, 5, 
        `Argument 'slot' must be between 0 and 5 (0-indexed value between 1 and 6).  Found '${slot}'.`);

    let cid = changeId === undefined ? -1 : changeId;
    changeId = VA.int(cid, 'changeId', `Argument 'changeId' must be a valid integer or undefined.  Found ${changeId}.`);

    return new Slot(slot, changeId, Pokemon.empty());
};

export default Slot;