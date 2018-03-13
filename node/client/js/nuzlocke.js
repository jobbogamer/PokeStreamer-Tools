import { nuzlocke } from 'config';

let deathSound;

if (nuzlocke.enabled && nuzlocke.deathSound && nuzlocke.deathSound.enabled) {
    deathSound = new Audio(nuzlocke.deathSound.filePath.replace(/^.*[\\\/]/, ''));
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
            deathSound.play();
        }
    }
}

const n = new Nuzlocke();
export default n;