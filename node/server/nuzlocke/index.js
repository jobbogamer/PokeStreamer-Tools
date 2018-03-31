import EventEmitter from 'events';
import NuzlockeFileManager from './nuzlocke-file-manager';

let nuzlockeObject = NuzlockeFileManager.loadFile();

class Nuzlocke extends EventEmitter {
    get knownDeadPokemon() {
        return new Set(nuzlockeObject.knownDeaths);
    }

    get knownVoidPokemon() {
        return new Set(nuzlockeObject.knownVoids);
    }

    // used for when starting a new game from the SoulLink Manager
    reset() {
        NuzlockeFileManager.reset();
        nuzlockeObject = NuzlockeFileManager.loadFile();
    }

    addDeadPokemon(pid) {
        if (!nuzlockeObject.knownDeaths.has(pid)) {
            nuzlockeObject.knownDeaths.add(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);

            this.emit('addedDeadPokemon', pid);
        }
    }

    addVoidPokemon(pid) {
        if (!nuzlockeObject.knownVoids.has(pid)) {
            nuzlockeObject.knownVoids.add(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);

            this.emit('addedVoidPokemon', pid);
        }
    }

    // used when manually reviving a pokemon -- not when the game reports that it is not dead
    revivePokemon(pid) { 
        if (nuzlockeObject.knownDeaths.has(pid) || nuzlockeObject.knownVoids.has(pid)) {
            nuzlockeObject.knownDeaths.delete(pid);
            nuzlockeObject.knownVoids.delete(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);

            this.emit('revivedPokemon', pid);
        }
    }
}

const nuzlocke = new Nuzlocke();
export default nuzlocke;