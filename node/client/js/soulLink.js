import config from '../../config.json';
import Nuzlocke from './nuzlocke';
const soulLink = config.nuzlocke.soulLink;

let soulLinkDeathSound;

if (Nuzlocke.enabled && soulLink.enabled && soulLink.deathSound.eanbled && 
    soulLink.deathSound.filePath) {
    soulLinkDeathSound = new Audio(soulLink.deathSound.filePath.replace(/^.*[\\\/]/, ''));
}

class SoulLink {
    constructor() {
        this.enabled = Nuzlocke.enabled && soulLink.enabled;
    }

    playDeathSound() {
        if (this.enabled && this.deathSound && this.deathSound.enabled) {
            if (soulLinkDeathSound) {
                soulLinkDeathSound.play();
            } else {
                Nuzlocke.playDeathSound();
            }
        }
    }
}

const sl = new SoulLink();
export default sl;