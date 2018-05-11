import EventEmitter from 'events';
import Config from '../config';
import NuzlockeFileManager from './nuzlocke-file-manager';
import PM from '../pokemon/pokemon-manager';

let nuzlockeObject = NuzlockeFileManager.loadFile();

class Nuzlocke extends EventEmitter {
    get knownDeadPokemon() {
        return new Set(nuzlockeObject.knownDeaths);
    }

    get knownVoidPokemon() {
        return new Set(nuzlockeObject.knownVoids);
    }

    get knownStaticPokemon() {
        return new Map(nuzlockeObject.knownStatic);
    }

    get enabled() {
        return Config.death.nuzlocke;
    }

    // used for when starting a new game from the SoulLink Manager
    reset() {
        NuzlockeFileManager.reset();
        nuzlockeObject = NuzlockeFileManager.loadFile();
    }

    partnerReset(partnerPids) {
        for (let p in partnerPids) {
            nuzlockeObject.knownDeaths.delete(p);
            nuzlockeObject.knownVoids.delete(p);
        }

        NuzlockeFileManager.saveFile(nuzlockeObject);
    }

    addDeadPokemon(pid) {
        pid = parseInt(pid);
        if (!nuzlockeObject.knownDeaths.has(pid)) {
            nuzlockeObject.knownDeaths.add(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);

            // don't want to send this update for SL pokemon
            if (PM.knownPokemon[pid]) {
                this.emit('addedDeadPokemon', pid);
            }
        }
    }

    addVoidPokemon(pid) {
        pid = parseInt(pid);
        if (!nuzlockeObject.knownVoids.has(pid)) {
            nuzlockeObject.knownVoids.add(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);

            // don't want to send this update for SL pokemon
            if (PM.knownPokemon[pid]) {
                this.emit('addedVoidPokemon', pid);
            }
        }
    }

    // used when manually reviving a pokemon -- not when the game reports that it is not dead
    revivePokemon(pid) { 
        pid = parseInt(pid);
        if (nuzlockeObject.knownDeaths.has(pid) || nuzlockeObject.knownVoids.has(pid)) {
            nuzlockeObject.knownDeaths.delete(pid);
            nuzlockeObject.knownVoids.delete(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);

            // don't want to send this update for SL pokemon
            if (PM.knownPokemon[pid]) {
                this.emit('revivedPokemon', pid);
            }
        }
    }

    setStaticPokemon(pid, staticId) {
        pid = parseInt(pid);
        if (staticId === -2 || staticId === 9999) {
            nuzlockeObject.knownStatic.set(pid, staticId);
        } else {
            nuzlockeObject.knownStatic.delete(pid);
        }

        NuzlockeFileManager.saveFile(nuzlockeObject);
    }
}

const nuzlocke = new Nuzlocke();
export default nuzlocke;