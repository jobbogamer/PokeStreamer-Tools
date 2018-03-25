import config, { soulLink } from 'config.json';
import DeathSounds from './death-sounds';
import Nuzlocke from './nuzlocke';

class SoulLink extends DeathSounds {
    constructor() {
        super((Nuzlocke.deathSound && Nuzlocke.deathSound.filePath) || config.nuzlocke.deathSound.filePath);
        this.enabled = Nuzlocke.enabled && soulLink.enabled;
        this._deathSoundsEnabled = this.enabled && soulLink.deathSound.enabled;
    }
}

const sl = new SoulLink();
export default sl;