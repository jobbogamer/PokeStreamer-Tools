const pokemonImages = require('./pokemon-images');

class Slot {
    constructor(slot, changeId, species, nickname, level, img, dead) {
        this.slot = slot + 1;
        this.changeId = changeId;
        this.species = species;
        this.nickname = nickname;
        this.level = level;
        this.img = img;
        this.dead = dead;
    }
}

Slot.empty = function(slot, changeId) {
    changeId = changeId === undefined ? -1 : changeId;
    return new Slot(slot, changeId, '', '', 0, pokemonImages['-1'].base, false);
};

module.exports = Slot;