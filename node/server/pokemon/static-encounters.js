import Config from '../config';

let data = {};

function getEncounters(generation, game) {
    switch (generation) {
        case 4:
            switch (game) {
                case "hg":
                case "ss":
                    if (!data[game]) {
                        data[game] = require('./hg-ss-static-encounters.json')[game];
                    }

                    return data[game];
                
                default:
                    throw new Error("Currently only HeartGold and SoulSilver versions are supported.");
            }
        
        default:
            throw new Error("Currently only gen 4 versions (HG/SS) are supported.");
    }
}

function getStaticEncounterId(pokemon) {
    let criteria = {
        Location: pokemon.locationMet,
        Gift: pokemon.gift,
        Level: pokemon.levelMet,
        EncounterType: pokemon.encounterType,
        EggLocation: pokemon.eggLocationMet || 0,
        Form: pokemon.alternateFormId,
        Gender: pokemon.isFemale ? 1 : 0,
    };
    
    if (!Config.usingRandomizer) {
        criteria.species = pokemon.species;
    }
    
    for (let enc of getEncounters(pokemon.generation, pokemon.gameVersion)) {
        let found = true;
        for (let [c, v] of Object.entries(criteria)) {
            if (!hasValue(enc[c])) {
                // skip criteria for which the static encounter doesn't care 
                // (e.g. if I don't know what the encounter type is for Togepi's Myster Egg and I set it to null)
                continue;
            }
            
            if (c === 'Gender') {
                if (enc[c] !== -1 && enc[c] !== v) {
                    found = false;
                    break;
                }
            } else if (enc[c] !== v) {
                found = false;
                break;
            }
        }
        
        if (found) {
            return enc.EncounterId;
        }
    }
    
    return -1;
}

const supported = {
    [4]: new Set(['hg', 'ss'])
};

function isStaticEncounterSupported(gen, gameVersion) {
    return gen in supported && supported[gen].has(gameVersion);
}

export {
    getStaticEncounterId,
    isStaticEncounterSupported
};