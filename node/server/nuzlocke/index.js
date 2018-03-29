import EventEmitter from 'events';
import NuzlockeFileManager from './nuzlocke-file-manager';

let nuzlockeObject = NuzlockeFileManager.loadFile();

class Nuzlocke extends EventEmitter {
    get knownDeadPokemon() {
        return new Set(nuzlockeObject.knownDeaths);
    }

    addDeadPokemon(pid) {
        if (!nuzlockeObject.knownDeaths.has(pid)) {
            nuzlockeObject.knownDeaths.add(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);

            this.emit('addedDeadPokemon', pid);
        }
    }

    // used when manually reviving a pokemon -- not when the game reports that it is not dead
    revivePokemon(pid) { 
        if (nuzlockeObject.knownDeaths.has(pid)) {
            nuzlockeObject.knownDeaths.delete(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);

            this.emit('revivedPokemon', pid);
        }
    }
}

const nuzlocke = new Nuzlocke();
export default nuzlocke;