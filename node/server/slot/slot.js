import VA from '../validate-argument';
import Pokemon from '../pokemon/pokemon';
import PM from '../pokemon/pokemon-manager';

class Slot {
    constructor(slot, pid, box) {
        this.isBox = Number.isInteger(box);
        if (this.isBox) {
            this.box = VA.boundedInt(box, 'box', 0, 17) + 1;
            this.slot = VA.boundedInt(slot, 'slot', 0, 29) + 1;
        } else {
            this.slot = VA.boundedInt(slot, 'slot', 0, 5) + 1;
        }

        // this.changeId = VA.int(changeId, 'changeId');
        this.pid = VA.int(pid, 'pid');
    }

    get pokemon() {
        if (this.pid === Pokemon.empty.pid) {
            return Pokemon.empty;
        }

        return PM.knownPokemon[this.pid];
    }

    toJSON() {
        return {
            // box: this.box,
            slot: this.slot,
            // changeId: this.changeId,
            pokemon: this.pokemon,
        };
    }

    static empty(slot) {
        slot = VA.boundedInt(slot, 'slot', 0, 5, 
            `Argument 'slot' must be between 0 and 5 (0-indexed value between 1 and 6).  Found '${slot}'.`);

        // let cid = changeId === undefined ? -1 : changeId;
        // changeId = VA.int(cid, 'changeId', `Argument 'changeId' must be a valid integer or undefined.  Found ${changeId}.`);

        return new Slot(slot, Pokemon.empty.pid);
    }

    // static emptyBox(box, slot) {
    //     box = VA.boundedInt(box, 'box', 0, 17);
    //     slot = VA.boundedInt(slot, 'slot', 0, 29);

    //     // let cid = changeId === undefined ? -1 : changeId;
    //     // changeId = VA.int(cid, 'changeId', `Argument 'changeId' must be a valid integer or undefined.  Found ${changeId}.`);

    //     return new Slot(slot, Pokemon.empty, box);
    // };
}

export default Slot;