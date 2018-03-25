import { nuzlocke } from '../../config.json';
import DeathSounds from './death-sounds';

class Nuzlocke extends DeathSounds {
    constructor() {
        super(nuzlocke.deathSound.filePath);

        this.enabled = nuzlocke.enabled;
        this._deathSoundsEnabled = this.enabled && nuzlocke.deathSound.enabled;
        
        this.deathMessages = [
            nuzlocke.deathMessage1,
            nuzlocke.deathMessage2,
            nuzlocke.deathMessage3
        ];
    }
}

const n = new Nuzlocke();
export default n;