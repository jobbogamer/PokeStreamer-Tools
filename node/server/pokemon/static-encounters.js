import Config from '../config';

function getEncounters() {
    switch (Config.Current.generation) {
        case 4:
            let game = Config.Current.gameVersion.toLowerCase();
            switch (game) {
                case "hg":
                case "ss":
                    return require('./hg-ss-static-encounters.json')[game];

                default:
                    throw new Error("Currently only HeartGold and SoulSilver versions are supported.");
            }

        default:
            throw new Error("Currently only gen 4 versions (HG/SS) are supported.");
    }
}

class StaticEncounters {
    constructor() {
        this._encounters = getEncounters();
        Config.on('update', e => {
            let p = e.prev,
                n = e.next;
            if (p.generation !== n.generation || p.gameVersion !== n.gameVersion) {
                console.debug('Generation or game version changed.  Updating static encounter table.');
                this._encounters = getEncounters();
            }
        });
    }

    get encounters() {
        return this._encounters;
    }

    getStaticEncounterId(pokemon) {
        let criteria = {
            Location: pokemon.locationMet,
            Gift: pokemon.gift,
            Level: pokemon.levelMet,
            EncounterType: pokemon.encounterType,
            EggLocation: pokemon.eggLocationMet || 0,
            Form: pokemon.alternateFormId,
        };
    
        if (!Config.Current.isRandomized) {
            criteria.species = pokemon.species;
        }
    
        for (let enc of this._encounters) {
            let found = true;
            for (let [c, v] of Object.entries(criteria)) {
                if (enc[c] !== v) {
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
}

const se = new StaticEncounters();
export default se;