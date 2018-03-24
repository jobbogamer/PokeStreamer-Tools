import NuzlockeFileManager from './nuzlocke-file-manager';

let nuzlockeObject = NuzlockeFileManager.loadFile();

export default {
    getKnownDeadPokemon: function() {
        return new Set(nuzlockeObject.knownDeaths);
    },

    addDeadPokemon: function(pid) {
        if (!nuzlockeObject.knownDeaths.has(pid)) {
            nuzlockeObject.knownDeaths.add(pid);
            NuzlockeFileManager.saveFile(nuzlockeObject);
        }
    }
};