import { nuzlocke } from '../../config.json';

let deathSounds;

if (nuzlocke.enabled && nuzlocke.deathSound && nuzlocke.deathSound.enabled) {
    let paths = nuzlocke.deathSound.filePath;
    if (!Array.isArray(paths)) {
        paths = [ paths ];
    }

    deathSounds = paths.map(p => new Audio(p.replace(/^.*[\\\/]/, '')));
}

class Nuzlocke {
    constructor() {
        this.enabled = nuzlocke.enabled;
        this.deathMessages = [
            nuzlocke.deathMessage1,
            nuzlocke.deathMessage2,
            nuzlocke.deathMessage3
        ];
    }

    playDeathSound() {
        if (this.enabled && nuzlocke.deathSound && nuzlocke.deathSound.enabled) {
            let idx = parseInt(Math.random() * deathSounds.length);
            deathSounds[idx].play();
        }
    }
}

const n = new Nuzlocke();
export default n;