class DeathSounds {
    constructor(soundFiles, volume) {
        let vol = hasValue(volume) ? parseFloat(volume) : 1;
        if (Number.isNaN(vol) || vol > 1 || vol < 0) {
            throw new Error(`Invalid death.sound.volume setting.  Expected a value between 0.0 and 1.0.  Found: ${volume}`);
        }

        if (soundFiles && (!Array.isArray(soundFiles) || soundFiles.length)) {
            this.loadDeathSounds(soundFiles, vol);
        }
    }

    loadDeathSounds(paths, volume) {
        if (!Array.isArray(paths)) {
            paths = [ paths ];
        }
    
        this._deathSounds = paths.map(p => {
            let sound = new Audio(p.replace(/^.*[\\\/]/, ''));
            sound.volume = volume;
            return sound;
        });
    }

    playDeathSound() {
        let enabled = this.enabled,
            sounds = this._deathSounds;
        if (!enabled || !sounds || !sounds.length) {
            return;
        }

        let idx = parseInt(Math.random() * sounds.length);
        sounds[idx].play();
    }
}

export default DeathSounds;