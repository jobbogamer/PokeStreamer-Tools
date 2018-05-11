import { death } from 'config.json';
import DeathSounds from './death-sounds';

class Nuzlocke extends DeathSounds {
    constructor() {
        super(death.sound.filePath, death.sound.volume);

        this.enabled = death.sound.enabled;
        
        this.deathMessages = [
            death.deathMessage1,
            death.deathMessage2,
            death.deathMessage3
        ];
    }
}

const n = new Nuzlocke();
export default n;