import fs from 'fs';
import { Paths } from '../constants';

const { 
    NuzlockeFile,
    GameDataPath,
} = Paths;

const DefaultNuzlockeObject = {
    knownDeaths: new Set(),
    knownVoids: new Set(),
};

const NuzlockeFileManager = {
    reset: function () {
        fs.writeFileSync(NuzlockeFile, JSON.stringify(DefaultNuzlockeObject));
    },

    saveFile: function (nuzlockeObject) {
        try {
            fs.writeFileSync(NuzlockeFile, JSON.stringify(nuzlockeObject));
            return true;
        } catch (e) {
            console.error(e.message);
            console.log(e.stack);
            return false;
        }
    },
    
    loadFile: function () {
        if (!fs.existsSync(GameDataPath)) {
            try {
                fs.mkdirSync(GameDataPath);
            } catch (e) {
                console.error(`Did not find gameData directory at ${GameDataPath}.  Attempted to create it and failed with error:`);
                console.error(e.message);
                throw e;
            }
        }

        if (!fs.existsSync(NuzlockeFile)) {
            try {
                fs.writeFileSync(NuzlockeFile, JSON.stringify(DefaultNuzlockeObject));
            } catch (e) {
                console.error(`Did not find Nuzlocke data file at ${NuzlockeFile}.  Attempted to create it and failed with error:`);
                console.error(e.message);
                throw e;
            } finally {
                return Object.assign({}, DefaultNuzlockeObject);                
            }
        }

        let contents;
        try {
            contents = fs.readFileSync(NuzlockeFile);
            let nuzlockeObject = JSON.parse(contents);
            nuzlockeObject.knownDeaths = new Set(nuzlockeObject.knownDeaths);
            nuzlockeObject.knownVoids = new Set(nuzlockeObject.knownVoids);
            return nuzlockeObject;
        } catch (e) {
            if (contents) {
                console.error(`Invalid Nuzlocke data file at ${NuzlockeFile}.  File exists but could not parse it.`);
                console.error(e.message);
                console.debug(`File contents:\n${contents}`);
            } else {
                console.error(`Could not access Nuzlocke data file at ${NuzlockeFile}.  File exists but could not access it.`);
                console.error(e.message);
            }

            console.warn('Using default (empty) Nuzlocke data');
            return Object.assign({}, DefaultNuzlockeObject);
        }
    },
};

export default NuzlockeFileManager;