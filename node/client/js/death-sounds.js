class DeathSounds {
    constructor(soundFiles) {
        if (soundFiles && (!Array.isArray(soundFiles) || soundFiles.length)) {
            this.loadDeathSounds(soundFiles);
        }
    }

    loadDeathSounds(paths) {
        if (!Array.isArray(paths)) {
            paths = [ paths ];
        }
    
        this._deathSounds = paths.map(p => new Audio(p.replace(/^.*[\\\/]/, '')));
    }

    playDeathSound() {
        let enabled = this.enabled && this._deathSoundsEnabled;
        if (!this._deathSounds || !this._deathSounds.length || !enabled) {
            return;
        }

        let idx = parseInt(Math.random() * sounds.length);
        sounds[idx].play();
    }
}

export default DeathSounds;